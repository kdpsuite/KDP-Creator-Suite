import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the Supabase token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      // Fallback to localStorage for compatibility during transition
      const token = localStorage.getItem('kdp_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================================
// Retry Logic for Failed Requests
// ============================================================================
// Retry on server errors (5xx) with exponential backoff
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config) {
      return Promise.reject(error);
    }

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    const shouldRetry =
      !error.response || (error.response && error.response.status >= 500);

    if (!shouldRetry) {
      if (error.response && error.response.status === 401) {
        console.warn('[AUTH] Unauthorized request, session may be expired');
      } else if (error.response && error.response.status >= 400) {
        console.warn(`[CLIENT_ERROR] HTTP ${error.response.status}:`, error.response.data?.error || error.message);
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
        full_name: username // Fallback
      }
    }
  }),
  getMe: () => api.get("/me"),
  logout: () => supabase.auth.signOut(),
  requestPasswordReset: (email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  }),
  resetPassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
  syncProfile: () => api.post("/user/profile-sync"),
};

export const subscriptionApi = {
  getStatus: () => api.get('/status'),
  getTiers: () => api.get('/tiers'),
  upgrade: (tier) => api.post('/upgrade', { tier }),
};

export const analyticsApi = {
  getUserMetrics: () => api.get('/user-metrics'),
};

export const totpApi = {
  setup: () => api.post('/2fa/setup'),
  verify: (code) => api.post('/2fa/verify', { code }),
  disable: (code) => api.post('/2fa/disable', { code }),
};

export const batchApi = {
  getJobs: () => api.get('/batch/jobs'),
  getJob: (id) => api.get(`/batch/jobs/${id}`),
  submit: (jobType, totalFiles) => api.post('/batch/submit', { job_type: jobType, total_files: totalFiles }),
  cancel: (id) => api.post(`/batch/jobs/${id}/cancel`),
};

export const templateApi = {
  getAll: () => {
    const templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]')
    return Promise.resolve({ data: { templates } })
  },
  save: (template) => {
    const templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]')
    template.id = Date.now()
    template.created_at = new Date().toISOString()
    templates.push(template)
    localStorage.setItem('kdp_templates', JSON.stringify(templates))
    return Promise.resolve({ data: { template } })
  },
  delete: (id) => {
    let templates = JSON.parse(localStorage.getItem('kdp_templates') || '[]')
    templates = templates.filter(t => t.id !== id)
    localStorage.setItem('kdp_templates', JSON.stringify(templates))
    return Promise.resolve({ data: { success: true } })
  },
}

export const pdfApi = {
  convertImage: (formData) => api.post('/convert-image-to-coloring', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  convertToKdp: (formData) => api.post('/convert-to-kdp-format', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  validateCompliance: (formData) => api.post("/validate-kdp-compliance", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  convertColoringBatch: (data) => api.post("/pdf/batch-coloring", data, { headers: { "Content-Type": "multipart/form-data" } }),
};

export default api;
