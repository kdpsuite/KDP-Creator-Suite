import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kdp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('kdp_token');
      // Redirect to login if necessary, but for now we'll just clear the token
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password, totp_code) => api.post('/login', { username, password, totp_code }),
  register: (username, email, password) => api.post('/register', { username, email, password }),
  getMe: () => api.get('/me'),
  logout: () => api.post('/logout'),
  requestPasswordReset: (email) => api.post('/request-password-reset', { email }),
  resetPassword: (token, newPassword) => api.post('/reset-password', { token, new_password: newPassword }),
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
  validateCompliance: (formData) => api.post('/validate-kdp-compliance', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;
