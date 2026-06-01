"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (token: string, refreshToken: string) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

type SetAuthState = (partial: Partial<AuthState>) => void;
let setAuthState: SetAuthState | undefined;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      setAuthState = set;
      return {
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (token: string, refreshToken: string) =>
        set({
          token,
          refreshToken,
          isAuthenticated: true
        }),
      setTokens: (token: string, refreshToken: string) =>
        set({
          token,
          refreshToken,
          isAuthenticated: true
        }),
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          isAuthenticated: false
        })
      };
    },
    {
      name: "cinepanda-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state, error) => {
        setAuthState?.({ hasHydrated: true });
      }
    }
  )
);

