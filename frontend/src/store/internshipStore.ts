import { create } from 'zustand';
import { Internship, Application } from '@/types';
import { internshipService, applicationService } from '@/services/api';

interface InternshipState {
  internships: Internship[];
  applications: Application[];
  isLoading: boolean;

  fetchInternships: (params?: Record<string, string>) => Promise<void>;
  getInternship: (id: string) => Internship | undefined;
  fetchInternshipById: (id: string) => Promise<Internship | null>;
  addInternship: (data: Record<string, unknown>) => Promise<Internship | null>;
  applyToInternship: (application: Application) => void;
  updateApplicationStatus: (id: string, status: 'accepted' | 'rejected' | 'reviewing') => Promise<void>;
  fetchStudentApplications: () => Promise<void>;
  fetchMyApplications: () => Promise<void>; // alias for fetchStudentApplications
  fetchCompanyApplications: () => Promise<void>;
  fetchInternshipApplications: (internshipId: string) => Promise<Application[]>;
  getStudentApplications: (studentId: string) => Application[];
  getCompanyApplications: (companyId: string) => Application[];
  getInternshipApplications: (internshipId: string) => Application[];
}

export const useInternshipStore = create<InternshipState>((set, get) => ({
  internships: [],
  applications: [],
  isLoading: false,

  fetchInternships: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await internshipService.getAll(params);
      set({ internships: data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  getInternship: (id) => get().internships.find(i => i.id === id),

  fetchInternshipById: async (id) => {
    try {
      const { data } = await internshipService.getById(id);
      return data;
    } catch {
      return null;
    }
  },

  addInternship: async (data) => {
    try {
      const res = await internshipService.create(data);
      set(state => ({ internships: [res.data, ...state.internships] }));
      return res.data;
    } catch {
      return null;
    }
  },

  applyToInternship: (application) => set(state => ({
    applications: [application, ...state.applications],
  })),

  updateApplicationStatus: async (id, status) => {
    try {
      await applicationService.updateStatus(id, status);
      set(state => ({
        applications: state.applications.map(a => (a.id === id || a._id === id) ? { ...a, status } : a),
      }));
    } catch { /* handled by caller */ }
  },

  fetchStudentApplications: async () => {
    try {
      const { data } = await applicationService.getMyApplications();
      set({ applications: data });
    } catch { /* empty */ }
  },

  fetchMyApplications: async () => {
    try {
      const { data } = await applicationService.getMyApplications();
      set({ applications: data });
    } catch { /* empty */ }
  },

  fetchCompanyApplications: async () => {
    try {
      const { data } = await applicationService.getCompanyApplications();
      set({ applications: data });
    } catch { /* empty */ }
  },

  fetchInternshipApplications: async (internshipId) => {
    try {
      const { data } = await applicationService.getForInternship(internshipId);
      return data;
    } catch {
      return [];
    }
  },

  getStudentApplications: (studentId) => get().applications.filter(a => a.studentId === studentId),

  getCompanyApplications: (companyId) => {
    const companyInternships = get().internships.filter(i => i.companyId === companyId).map(i => i.id);
    return get().applications.filter(a => companyInternships.includes(a.internshipId));
  },

  getInternshipApplications: (internshipId) => get().applications.filter(a => a.internshipId === internshipId),
}));
