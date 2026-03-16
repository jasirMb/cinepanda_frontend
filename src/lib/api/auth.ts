import api from "@/lib/axios-client";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
}

export async function loginAdmin(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

