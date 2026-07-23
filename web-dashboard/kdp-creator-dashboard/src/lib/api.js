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
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    // #region agent log
    if (config.url?.includes('/pdf/')) {
      fetch('http://127.0.0.1:7695/ingest/c2fd6983-8006-4e73-8b39-ed64ec64ab25', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ca3f5d' },
        body: JSON.stringify({
          sessionId: 'ca3f5d',
          location: 'api.js:requestInterceptor',
          message: 'pdf API request',
          data: { url: config.url, hasToken: Boolean(session?.access_token), method: config.method },
          timestamp: Date.now(),
          hypothesisId: 'H2',
        }),
      }).catch(() => {});
    }
    // #endregion
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

      // #region agent log
      fetch('http://127.0.0.1:7695/ingest/c2fd6983-8006-4e73-8b39-ed64ec64ab25', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ca3f5d' },
        body: JSON.stringify({
          sessionId: 'ca3f5d',
          location: 'api.js:responseInterceptor',
          message: '401 unauthorized',
          data: { url: requestUrl, isProfileSync },
          timestamp: Date.now(),
          hypothesisId: 'H2',
        }),
      }).catch(() => {});
      // #endregion

      if (!isProfileSync) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore sign-out failures during 401 handling
        }
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
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
        // #region agent log
        if (config.url?.includes('/pdf/')) {
          fetch('http://127.0.0.1:7695/ingest/c2fd6983-8006-4e73-8b39-ed64ec64ab25', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ca3f5d' },
            body: JSON.stringify({
              sessionId: 'ca3f5d',
              location: 'api.js:responseInterceptor',
              message: 'pdf API error',
              data: {
                url: config.url,
                status: error.response.status,
                error: error.response.data?.error?.message ?? error.response.data?.message ?? error.message,
                code: error.code,
              },
              timestamp: Date.now(),
              hypothesisId: 'H3',
            }),
          }).catch(() => {});
        }
        // #endregion
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
  upgrade: (tier) => api.post('/upgrade', { tier }),
};

export const analyticsApi = {
  getUserMetrics: () => api.get('/user-metrics'),
  trackEvent: (eventType, eventData = {}) =>
    api.post('/analytics/events', { event_type: eventType, event_data: eventData }),
};

export const totpApi = {
  setup: () => api.post('/2fa/setup'),
  verify: (code) => api.post('/2fa/verify', { code }),
  disable: (code) => api.post('/2fa/disable', { code }),
};

export const batchApi = {
  getJobs: () => api.get('/batch/jobs'),
  submit: (jobType, totalFiles) => api.post('/batch/submit', { job_type: jobType, total_files: totalFiles }),
};

export const templateApi = {
  getLibrary: (niche) => api.get('/templates', { params: niche ? { niche } : {} }),
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
