import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const readAuthToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("fv_token") ||
  localStorage.getItem("token");

export type AuditIntelligenceRequest = {
  sensitive_attributes: string[];
  target_column?: string;
  outcome_column?: string;
  actual_column?: string;
  positive_label?: string | number;
  correlation_threshold?: number;
  report_title?: string;
};

const authHeaders = () => {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const auth = {
  // Fix: Added types (email: string, password: string)
  login: async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/auth/login`, { email, password });
    return res.data;
  },
  // Fix: Added types here too
  register: async (email: string, password: string, fullName: string) => {
    const res = await axios.post(`${API_URL}/auth/register`, { 
      email, 
      password, 
      full_name: fullName 
    });
    return res.data;
  },
  verifyEmail: async (email: string, code: string) => {
    const res = await axios.post(`${API_URL}/auth/verify`, { email, code });
    return res.data;
  }
};

export const getToken = () => readAuthToken();
export const setToken = (token: string) => {
  localStorage.setItem("fv_token", token);
};
export const removeToken = () => {
  localStorage.removeItem("fv_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("token");
};
export const getUser = () => JSON.parse(localStorage.getItem("fv_user") || "null");

export const auditIntelligenceApi = {
  runAnalysis: async (datasetId: string, payload: AuditIntelligenceRequest) => {
    const res = await axios.post(`${API_URL}/audit-intelligence/${datasetId}/analyze`, payload, {
      headers: authHeaders(),
    });
    return res.data;
  },
  getLatest: async (datasetId: string) => {
    const res = await axios.get(`${API_URL}/audit-intelligence/${datasetId}/latest`, {
      headers: authHeaders(),
    });
    return res.data;
  },
  getTimeline: async () => {
    const res = await axios.get(`${API_URL}/audit-intelligence/history/timeline`, {
      headers: authHeaders(),
    });
    return res.data;
  },
};

export const reportsApi = {
  generateComplianceReport: async (payload: { dataset_id: string; analysis_id: string }) => {
    const res = await axios.post(`${API_URL}/reports/generate`, payload, {
      headers: authHeaders(),
      responseType: "blob",
    });
    return {
      blob: res.data as Blob,
      filenameHeader: res.headers["content-disposition"] as string | undefined,
      reportId: res.headers["x-report-id"] as string | undefined,
    };
  },
  getReportHistory: async () => {
    const res = await axios.get(`${API_URL}/reports/history`, {
      headers: authHeaders(),
    });
    return res.data as {
      reports: Array<{
        report_id: string;
        dataset_id: string;
        dataset_name: string;
        generated_at: string;
        risk_level: string;
        fairness_score: number;
        compliance_score: number;
      }>;
    };
  },
  downloadReportById: async (reportId: string) => {
    const res = await axios.get(`${API_URL}/reports/${reportId}/download`, {
      headers: authHeaders(),
      responseType: "blob",
    });
    return {
      blob: res.data as Blob,
      filenameHeader: res.headers["content-disposition"] as string | undefined,
    };
  },
};

export type AdminUser = {
  id: string;
  email: string;
  full_name?: string;
  dataset_count: number;
};

export const adminApi = {
  getUsers: async () => {
    const res = await axios.get(`${API_URL}/admin/users`, {
      headers: authHeaders(),
    });
    return res.data as { users: AdminUser[] };
  },
  deleteUser: async (userId: string) => {
    const res = await axios.delete(`${API_URL}/admin/users/${userId}`, {
      headers: authHeaders(),
    });
    return res.data as {
      message: string;
      deleted_user_email: string;
      deleted_datasets: number;
      deleted_reports: number;
    };
  },
};