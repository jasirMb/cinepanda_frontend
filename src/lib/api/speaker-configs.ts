import api from "@/lib/axios-client";

export interface SpeakerConfig {
  _id: string;
  name: string;
  imageUrl?: string;
  imageKey?: string;
  createdAt: string;
  updatedAt: string;
}

/** A speaker config snapshot stored on a quotation. */
export interface SpeakerConfigSnapshot {
  name: string;
  imageUrl?: string;
  imageKey?: string;
}

export async function fetchSpeakerConfigs(): Promise<SpeakerConfig[]> {
  const { data } = await api.get<{ success: boolean; data: SpeakerConfig[] }>(
    "/speaker-configs"
  );
  return data.data ?? [];
}

export async function createSpeakerConfig(payload: {
  name: string;
  imageUrl?: string;
  imageKey?: string;
}): Promise<SpeakerConfig> {
  const { data } = await api.post<{ success: boolean; data: SpeakerConfig }>(
    "/speaker-configs",
    payload
  );
  return data.data;
}

export async function deleteSpeakerConfig(id: string): Promise<void> {
  await api.delete(`/speaker-configs/${id}`);
}
