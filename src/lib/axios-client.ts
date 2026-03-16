import axios from "axios";
import { useAuthStore } from "@/store/auth-store";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error(
    "Missing API base URL. Set NEXT_PUBLIC_API_BASE_URL in .env.local."
  );
}

const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`
      };
    }
  }
  return config;
});

export default api;

