"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchProfile,
  updateProfile,
  type Profile,
  type UpdateProfilePayload,
} from "@/lib/api/profile";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";

export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
};

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Profile>({
    queryKey: profileKeys.me(),
    queryFn: fetchProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useSettingsStore((s) => s.setProfile);
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.me(), data);
      setProfile({ name: data.name, email: data.email });
    },
  });
}

/**
 * Hydrates the settings store from the server-side profile on mount.
 * Keeps the persisted zustand `profile` in sync with whatever the backend
 * reports so consumers that read from the store (e.g. the dashboard
 * greeting) see the authoritative value without each component having to
 * fetch on its own.
 */
export function useProfileHydrator() {
  const query = useProfile();
  const setProfile = useSettingsStore((s) => s.setProfile);
  useEffect(() => {
    if (query.data) {
      setProfile({ name: query.data.name, email: query.data.email });
    }
  }, [query.data, setProfile]);
}
