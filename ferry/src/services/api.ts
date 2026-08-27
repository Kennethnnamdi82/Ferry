import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const configuredBaseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const trimmedBaseURL = configuredBaseURL.replace(/\/+$/, "");
const baseURL = trimmedBaseURL.endsWith("/api")
  ? trimmedBaseURL
  : `${trimmedBaseURL}/api`;

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const ACCESS_KEY = "vault_access_token";
const REFRESH_KEY = "vault_refresh_token";
const USER_KEY = "vault_user";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  setTokens(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser<T = unknown>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.access;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, {
      refreshToken: refresh,
    });
    tokenStore.setTokens(data.accessToken, data.refreshToken || refresh);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

async function normalizeBlobError(error: AxiosError): Promise<void> {
  const response = error.response;
  const data = response?.data;
  if (
    typeof Blob === "undefined" ||
    !(data instanceof Blob) ||
    data.size === 0
  ) {
    return;
  }

  const text = await data.text().catch(() => "");
  if (!text) return;

  try {
    response.data = JSON.parse(text);
  } catch {
    response.data = { message: text };
  }
}

api.interceptors.response.use(
  (r) => {
    // Optional envelope support: if the backend ever returns
    // { success:false, message, error }, surface it as a rejection
    // so callers don't have to special-case it.
    const body = r.data;
    if (body && typeof body === "object" && body.success === false) {
      const err: AxiosError = new AxiosError(
        body.message || body.error || "Request failed",
        "ERR_API_ENVELOPE",
        r.config,
        r.request,
        r,
      );
      return Promise.reject(err);
    }
    // If the backend wraps payloads in { success:true, data }, unwrap once
    // so existing callers keep working unchanged.
    if (
      body &&
      typeof body === "object" &&
      body.success === true &&
      "data" in body
    ) {
      r.data = body.data;
    }
    return r;
  },
  async (error: AxiosError) => {
    await normalizeBlobError(error);
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _netRetry?: boolean })
      | undefined;
    if (!original) return Promise.reject(error);
    // Retry once on network errors / 5xx (idempotent methods only).
    const status = error.response?.status;
    const method = (original.method || "get").toLowerCase();
    const idempotent = ["get", "head", "options"].includes(method);
    const isNetwork = !error.response;
    const isServer = status !== undefined && status >= 500 && status < 600;
    if (!original._netRetry && idempotent && (isNetwork || isServer)) {
      original._netRetry = true;
      await new Promise((r) => setTimeout(r, 400));
      return api(original);
    }
    if (status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return api(original);
      }
      // Refresh failed → hard logout and bounce to /login.
      tokenStore.clear();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

// ===== Types =====
export const DOCUMENT_CATEGORIES = [
  "Identity",
  "Education",
  "Property",
  "Medical",
  "Financial",
  "Other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  emailVerified: boolean;
  storageUsed: number;
  createdAt: string;
}

export interface UserRef {
  _id: string;
  name: string;
  email: string;
}

export interface Vault {
  _id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  allowViewerDownload: boolean;
  owner: UserRef;
  role: "editor" | "viewer";
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultMember {
  _id: string;
  user: UserRef;
  role: "viewer";
  createdAt: string;
}

export interface DocumentItem {
  _id: string;
  name: string;
  description: string;
  category: DocumentCategory;
  tags: string[];
  mimeType: string;
  size: number;
  url: string;
  flagged: boolean;
  deletedAt: string | null;
  vault: string;
  owner?: UserRef;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ShareLink {
  _id: string;
  token: string;
  document: string;
  allowDownload: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  views: number;
  maxDownloads: number | null;
  downloads: number;
  hasPassword: boolean;
  revokedAt: string | null;
  createdAt: string;
}

export interface AdminDocument {
  _id: string;
  name: string;
  mimeType: string;
  size: number;
  flagged: boolean;
  owner: UserRef | null;
  createdAt: string;
}

export interface AdminVault {
  _id: string;
  name: string;
  owner: UserRef | null;
  documentCount: number;
  deletedAt?: string | null;
  createdAt: string;
}

export interface AdminShare {
  _id: string;
  document: Pick<DocumentItem, "_id" | "name"> | null;
  createdBy: UserRef | null;
  allowDownload: boolean;
  views: number;
  maxViews: number | null;
  revokedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminLog {
  _id: string;
  action: string;
  target?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  user: UserRef | null;
  createdAt: string;
}

// ===== Auth =====
export const authApi = {
  register: (payload: { name: string; email: string; password: string }) =>
    api.post<{ user: User; message: string }>("/auth/register", payload),

  login: (payload: { email: string; password: string }) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      payload,
    ),

  me: () => api.get<{ user: User }>("/auth/me"),

  logout: () => api.post("/auth/logout"),

  verifyEmail: (token: string) =>
    api.get<{ message: string }>("/auth/verify-email", {
      params: { token },
    }),
};
// ===== Vaults =====
export const vaultsApi = {
  list: () => api.get<{ vaults: Vault[] }>("/vaults"),
  get: (id: string) => api.get<{ vault: Vault }>(`/vaults/${id}`),
  create: (payload: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    allowViewerDownload?: boolean;
  }) => api.post<{ vault: Vault }>("/vaults", payload),
  update: (
    id: string,
    payload: Partial<{
      name: string;
      description: string;
      allowViewerDownload: boolean;
      icon: string;
      color: string;
    }>,
  ) => api.put<{ vault: Vault }>(`/vaults/${id}`, payload),
  remove: (id: string) => api.delete(`/vaults/${id}`),
  members: (id: string) =>
    api.get<{ owner: UserRef & { role: "editor" }; members: VaultMember[] }>(
      `/vaults/${id}/members`,
    ),
  invite: (id: string, email: string) =>
    api.post<{ member: VaultMember }>(`/vaults/${id}/members`, { email }),
  removeMember: (id: string, memberId: string) =>
    api.delete(`/vaults/${id}/members/${memberId}`),
};

// ===== Documents =====
export interface DocumentListParams {
  vault?: string;
  category?: DocumentCategory;
  q?: string;
  sort?: "newest" | "oldest" | "largest" | "name";
  page?: number;
  limit?: number;
  trash?: boolean;
  type?: "image" | "pdf" | "doc" | "sheet" | "video" | "audio" | "text";
  minSize?: number;
  maxSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const documentsApi = {
  list: (params: DocumentListParams = {}) =>
    api.get<{ documents: DocumentItem[]; pagination: Pagination }>(
      "/documents",
      { params },
    ),
  get: (id: string) =>
    api.get<{ document: DocumentItem; role: "editor" | "viewer" }>(
      `/documents/${id}`,
    ),
  create: (formData: FormData, onUploadProgress?: (e: ProgressEvent) => void) =>
    api.post<{ document: DocumentItem }>("/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onUploadProgress as never,
      timeout: 180000,
    }),
  update: (
    id: string,
    payload: Partial<
      Pick<DocumentItem, "name" | "description" | "tags" | "category">
    >,
  ) => api.put<{ document: DocumentItem }>(`/documents/${id}`, payload),
  remove: (id: string) => api.delete(`/documents/${id}`),
  restore: (id: string) =>
    api.post<{ document: DocumentItem }>(`/documents/${id}/restore`),
  purge: (id: string) => api.delete(`/documents/${id}/purge`),
  download: (id: string) =>
    api.get<{ url: string; expiresAt: number }>(`/documents/${id}/download`),
  preview: (id: string) =>
    api.get<{ url: string; expiresAt: number; mimeType: string }>(
      `/documents/${id}/preview`,
    ),
};

// ===== Shares =====
export const sharesApi = {
  create: (payload: {
    documentId: string;
    allowDownload?: boolean;
    expiresInHours?: number | null;
    maxViews?: number | null;
    maxDownloads?: number | null;
    password?: string | null;
  }) => api.post<{ share: ShareLink }>("/shares", payload),
  listForDocument: (documentId: string) =>
    api.get<{ shares: ShareLink[] }>(`/shares/document/${documentId}`),
  revoke: (id: string) => api.delete(`/shares/${id}`),
  // Public — no auth required, but the interceptor will still try to attach a token; that's harmless.
  publicGet: (token: string) =>
    axios.get<{
      document: {
        _id: string;
        name: string;
        mimeType: string;
        size: number;
        createdAt: string;
      };
      allowDownload: boolean;
      expiresAt: string | null;
      requiresPassword: boolean;
    }>(`${baseURL}/shares/${token}`),
  publicFile: (
    token: string,
    opts: { download?: boolean; password?: string } = {},
  ) =>
    axios.post<{ url: string; expiresAt: number }>(
      `${baseURL}/shares/${token}/file${opts.download ? "?download=1" : ""}`,
      { password: opts.password ?? undefined },
    ),
  publicContent: (
    token: string,
    opts: { download?: boolean; password?: string } = {},
  ) =>
    axios.post(
      `${baseURL}/shares/${token}/content${opts.download ? "?download=1" : ""}`,
      { password: opts.password ?? undefined },
      { responseType: "blob", timeout: 120000 },
    ),
};

// ===== Export (ZIP / PDF) =====
export const exportApi = {
  zip: (documentIds: string[]) =>
    api.post(
      `/export/zip`,
      { documentIds },
      { responseType: "blob", timeout: 120000 },
    ),
  pdf: (documentIds: string[], name?: string) =>
    api.post(
      `/export/pdf`,
      { documentIds, name },
      { responseType: "blob", timeout: 120000 },
    ),
};

// ===== Admin =====
export interface AdminStats {
  totalUsers: number;
  totalDocuments: number;
  deletedDocuments: number;
  totalVaults: number;
  activeShares: number;
  totalStorage: number;
  recentActivity: Array<{
    _id: string;
    action: string;
    user: { name: string; email: string } | null;
    target?: string;
    createdAt: string;
  }>;
}

export const adminApi = {
  stats: () => api.get<AdminStats>("/admin/stats"),
  users: () => api.get<{ users: User[] }>("/admin/users"),
  updateUser: (id: string, payload: { status?: string; role?: string }) =>
    api.patch(`/admin/users/${id}`, payload),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  documents: () => api.get<{ documents: AdminDocument[] }>("/admin/documents"),
  deleteDocument: (id: string) => api.delete(`/admin/documents/${id}`),
  vaults: () => api.get<{ vaults: AdminVault[] }>("/admin/vaults"),
  shares: () => api.get<{ shares: AdminShare[] }>("/admin/shares"),
  logs: () => api.get<{ logs: AdminLog[] }>("/admin/logs"),
};

// ===== Personal Activity =====
export interface ActivityItem {
  _id: string;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}
export const activityApi = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<{ logs: ActivityItem[]; pagination: Pagination }>("/activity", {
      params,
    }),
};

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { message?: string } | undefined)?.message ||
      err.message ||
      "Request failed"
    );
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}
