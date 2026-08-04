import axios from "axios";
import { useAuthStore } from "@/store/auth-store";
import { API_BASE_URL } from "@/lib/api-base";

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return config;
});

// Auth endpoints must never trigger refresh/logout side effects (a 401 from
// /auth/login just means wrong credentials).
function isAuthEndpoint(url?: string): boolean {
  return !!url && (url.includes("/auth/login") || url.includes("/auth/refresh"));
}

function forceLogout() {
  useAuthStore.getState().logout();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

// Single-flight refresh: if many requests 401 at once, they all await ONE
// /auth/refresh call instead of stampeding the endpoint.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) return null;
      try {
        // Use a bare axios call (not `api`) so this request can't recurse
        // through these interceptors.
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        useAuthStore.getState().setTokens(data.token, data.refreshToken);
        return data.token as string;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof window === "undefined") return Promise.reject(error);

    const status = error?.response?.status;
    const original = error.config;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !isAuthEndpoint(original.url) &&
      useAuthStore.getState().isAuthenticated
    ) {
      // Access token likely expired — try to refresh once, then replay the request.
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed (no/expired refresh token) → session is truly over.
      forceLogout();
      return Promise.reject(error);
    }

    // A 403 (invalid token) or an un-refreshable 401 means hard logout.
    if (
      (status === 401 || status === 403) &&
      !isAuthEndpoint(original?.url) &&
      useAuthStore.getState().isAuthenticated
    ) {
      forceLogout();
    }

    return Promise.reject(error);
  }
);

export default api;

