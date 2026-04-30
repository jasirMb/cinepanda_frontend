import api from "@/lib/axios-client";

export interface Profile {
  name: string;
  email: string;
}

export interface ProfileResponse {
  success: boolean;
  data: Profile;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
}

export async function fetchProfile(): Promise<Profile> {
  const { data } = await api.get<ProfileResponse>("/auth/profile");
  return data.data;
}

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<Profile> {
  const { data } = await api.patch<ProfileResponse>("/auth/profile", payload);
  return data.data;
}
