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

// On 401/403 (expired or invalid token), clear auth state and bounce to login so the
// app doesn't get stuck "authenticated" while every request fails.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (
      typeof window !== "undefined" &&
      (status === 401 || status === 403) &&
      useAuthStore.getState().isAuthenticated
    ) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;

