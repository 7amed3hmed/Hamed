import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authStore: any = null;
export const injectAuthStore = (store: any) => {
  authStore = store;
};

// Request interceptor for auth token
api.interceptors.request.use(config => {
  const token = (authStore && authStore.getState().token) || sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  response => {
    if (response.data && typeof response.data.success !== 'undefined') {
      if (!response.data.success) {
        return Promise.reject(new Error(response.data.message || 'API Error'));
      }
      response.data = response.data.data;
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      if (authStore && typeof authStore.getState().logout === 'function') {
        authStore.getState().logout();
      } else {
        window.location.href = '/login';
      }
    }
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    if (error.response?.data?.isVerified !== undefined) {
      error.isVerified = error.response.data.isVerified;
    }
    return Promise.reject(error);
  }
);

export default api;

// === Auth Service ===
export const authService = {
  login: (email: string, password: string, role: string) =>
    api.post('/auth/login', { email, password, role }),
  signup: (data: Record<string, string>) =>
    api.post('/auth/signup', data),
  sendOtp: (email: string) =>
    api.post('/auth/resend-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    api.post('/auth/verify-email', { email, otp }),
  getProfile: () =>
    api.get('/auth/profile'),
  updateProfile: (data: FormData | Record<string, unknown>) => {
    const isFormData = data instanceof FormData;
    return api.put('/auth/profile', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' }
    });
  },
};

// === Opportunity Service (was Internship) ===
export const opportunityService = {
  getAll: (params?: Record<string, string>) =>
    api.get('/internships', { params }),
  // Returns this company's own opportunities at ALL statuses (pending/approved/rejected)
  getMyOpportunities: () =>
    api.get('/internships/mine'),
  getById: (id: string) =>
    api.get(`/internships/${id}`),
  create: (data: Record<string, unknown>) =>
    api.post('/internships', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/internships/${id}`, data),
  delete: (id: string) =>
    api.delete(`/internships/${id}`),
};


// Alias for backward compat
export const internshipService = opportunityService;

// === Application Service ===
export const applicationService = {
  // Standard apply (no exam required)
  apply: (internshipId: string, data: Record<string, unknown>) =>
    api.post(`/internships/${internshipId}/apply`, data),
  // Submit exam answers AND apply in one shot — uses the /exam/submit route
  submitExamAndApply: (internshipId: string, data: { answers: Record<string, number>; coverLetter?: string }) =>
    api.post(`/internships/${internshipId}/exam/submit`, { answers: data.answers }),
  getMyApplications: () =>
    api.get('/applications/me'),
  getCompanyApplications: () =>
    api.get('/applications/company'),
  getForInternship: (internshipId: string) =>
    api.get(`/applications/internship/${internshipId}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/applications/${id}/status`, { status }),
};

// Alias for backward compat
export { applicationService as applicationService2 };

// === Assessment Service (was Exam) ===
export const assessmentService = {
  getExam: (internshipId: string) =>
    api.get(`/internships/${internshipId}/exam`),
  submitExam: (internshipId: string, answers: Record<string, number>) =>
    api.post(`/internships/${internshipId}/exam/submit`, { answers }),
};

// Alias
export const examService = assessmentService;

// === AI Service ===
export const aiService = {
  extractSkills: (file: File) => {
    const formData = new FormData();
    formData.append('cv', file);
    return api.post('/ai/extract-skills', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
};

// === Onboarding Service ===
export const onboardingService = {
  getStatus: () =>
    api.get('/onboarding/status'),
  saveBasicInfo: (data: Record<string, unknown>) =>
    api.post('/onboarding/basic-info', data),
  saveSoftSkills: (responses: Array<{ questionId: string; question: string; category: string; score: number }>) =>
    api.post('/onboarding/soft-skills', { responses }),
  savePersonality: (responses: Array<{ questionId: string; question: string; category: string; score: number }>) =>
    api.post('/onboarding/personality', { responses }),
  complete: () =>
    api.post('/onboarding/complete'),
  toggleSave: (opportunityId: string) =>
    api.post(`/onboarding/save/${opportunityId}`),
  getSaved: () =>
    api.get('/onboarding/saved'),
};

// === Admin Service ===
export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getStudents: () => api.get('/admin/students'),
  getCompanies: () => api.get('/admin/companies'),
  getPendingCompanies: () => api.get('/admin/companies/pending'),
  // Individual approval actions
  approveCompany: (id: string) => api.patch(`/admin/companies/${id}/approve`),
  rejectCompany: (id: string) => api.patch(`/admin/companies/${id}/reject`),
  // Combined action helper
  moderateCompany: (id: string, action: 'approve' | 'reject') =>
    action === 'approve'
      ? api.patch(`/admin/companies/${id}/approve`)
      : api.patch(`/admin/companies/${id}/reject`),
  suspendUser: (id: string) => api.patch(`/admin/users/${id}/suspend`),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Opportunity moderation
  getPendingOpportunities: () => api.get('/admin/opportunities/pending'),
  approveOpportunity: (id: string) => api.patch(`/admin/opportunities/${id}/approve`),
  rejectOpportunity: (id: string) => api.patch(`/admin/opportunities/${id}/reject`),
  moderateOpportunity: (id: string, action: 'approve' | 'reject') =>
    action === 'approve'
      ? api.patch(`/admin/opportunities/${id}/approve`)
      : api.patch(`/admin/opportunities/${id}/reject`),
};

// === Notification Service ===
export const notificationService = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

// === Support Service ===
export const supportService = {
  submit: (data: { name: string; email: string; subject: string; message: string; accountType: string }) =>
    api.post('/support', data),
};

// === Volunteer / Leaderboard Service ===
export const volunteerService = {
  getLeaderboard: () => api.get('/volunteers/top-rank'),
  getProfile: (id: string) => api.get(`/volunteers/${id}`),
};

// === Recommendation Service ===
export const recommendationService = {
  getMyRecommendations: () => api.get('/recommendations/me'),
};

