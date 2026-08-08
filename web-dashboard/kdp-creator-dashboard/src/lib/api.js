import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

function normalizeApiBaseUrl(rawUrl) {
  const value = (rawUrl || '/api').trim();
  if (!value) return '/api';

  if (value.startsWith('/')) {
    return value.replace(/\/+$/, '') || '/api';
  }

  const withoutTrailingSlash = value.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure these env vars before loading the dashboard.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'kdp-creator-suite',
    },
  },
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

function clearContentType(headers) {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type');
    headers.delete('content-type');
    return;
  }
  delete headers['Content-Type'];
  delete headers['content-type'];
}

function setJsonContentType(headers) {
  if (!headers) return;
  if (typeof headers.set === 'function') {
    headers.set('Content-Type', 'application/json');
    return;
  }
  headers['Content-Type'] = 'application/json';
}

/** User-facing message for Axios/network failures on uploads */
export function getUploadErrorMessage(error, fallback = 'Request failed') {
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
    return 'Upload timed out. Try fewer or smaller files.';
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'Upload blocked or too large for the proxy. Try 2–3 smaller images (under ~4 MB total).';
  }
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function isSessionCriticalUrl(requestUrl) {
  return (
    requestUrl.includes('/status') ||
    requestUrl.includes('/sync-session') ||
    requestUrl.includes('/validate-session') ||
    requestUrl.includes('/me')
  );
}

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      // Let the browser set multipart/form-data with boundary (Axios docs)
      clearContentType(config.headers);
    } else if (
      config.data &&
      typeof config.data === 'object' &&
      !(config.data instanceof ArrayBuffer) &&
      !(typeof Blob !== 'undefined' && config.data instanceof Blob)
    ) {
      setJsonContentType(config.headers);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config) {
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      const requestUrl = config.url || '';
      const isProfileSync = requestUrl.includes('/user/profile-sync');

      console.warn('[AUTH] Unauthorized request, session may be expired', requestUrl);

      if (!isProfileSync && isSessionCriticalUrl(requestUrl)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore sign-out failures during 401 handling
          }
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.assign('/login');
          }
        }
      }

      return Promise.reject(error);
    }

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    const method = (config.method || 'get').toLowerCase();
    const isIdempotent = method === 'get' || method === 'head' || method === 'options';
    const shouldRetry =
      isIdempotent &&
      (!error.response || (error.response && error.response.status >= 500));

    if (!shouldRetry) {
      if (error.response && error.response.status >= 400) {
        console.warn(
          `[CLIENT_ERROR] HTTP ${error.response.status}:`,
          error.response.data?.error || error.message
        );
      }
      return Promise.reject(error);
    }

    const delay = INITIAL_RETRY_DELAY * Math.pow(2, config.retryCount);
    console.warn(
      `[RETRY] Attempt ${config.retryCount + 1}/${MAX_RETRIES} for ${config.method?.toUpperCase()} ${config.url} after ${delay}ms`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    config.retryCount += 1;
    return api(config);
  }
);

export const authApi = {
  login: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  register: (email, password, username) => supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username,
        full_name: username,
      },
    },
  }),
  getMe: () => api.get('/me'),
  logout: () => supabase.auth.signOut(),
  requestPasswordReset: (email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  }),
  resetPassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
  syncProfile: () => api.post('/user/profile-sync'),
};

export const sessionApi = {
  syncSession: (supabaseToken) => api.post('/sync-session', { supabase_token: supabaseToken }),
  validateSession: () => api.get('/validate-session'),
};

export const subscriptionApi = {
  getStatus: () => api.get('/status'),
  getTiers: () => api.get('/tiers'),
  /** @deprecated Free self-upgrade is disabled server-side. Use createCheckout. */
  upgrade: () =>
    Promise.reject(new Error('Direct upgrades are disabled. Use Stripe Checkout.')),
  createCheckout: (tier) => api.post('/checkout', { tier }),
  openBillingPortal: () => api.post('/billing-portal'),
};

export const accountApi = {
  deleteAccount: () => api.delete('/account'),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

export const analyticsApi = {
  getUserMetrics: () => api.get('/user-metrics'),
  trackEvent: (eventType, eventData = {}) =>
    api.post('/analytics/events', { event_type: eventType, event_data: eventData }),
};

export const templateApi = {
  getLibrary: (niche) => api.get('/templates', { params: niche ? { niche } : {} }),
  getOne: (id) => api.get(`/templates/${id}`),
  generate: (id, options) => api.post(`/templates/${id}/generate`, { options }, { timeout: 300000 }),
  getAll: () => {
    const templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]');
    return Promise.resolve({ data: { templates } });
  },
  save: (template) => {
    const templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]');
    template.id = Date.now();
    template.created_at = new Date().toISOString();
    templates.push(template);
    localStorage.setItem('kdp_templates', JSON.stringify(templates));
    return Promise.resolve({ data: { template } });
  },
  delete: (id) => {
    let templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]');
    templates = templates.filter((t) => t.id !== id);
    localStorage.setItem('kdp_templates', JSON.stringify(templates));
    return Promise.resolve({ data: { success: true } });
  },
};

export const pdfApi = {
  convertColoring: (formData) => api.post('/pdf/convert-coloring', formData),
  convertImage: (formData) => api.post('/pdf/convert-coloring', formData),
  convertToKdp: (formData) => api.post('/pdf/format-kdp', formData),
  validateCompliance: (formData) => api.post('/pdf/validate-kdp', formData),
  convertColoringBatch: (data) => api.post('/pdf/batch-coloring', data, { timeout: 300000 }),
};

export default api;
