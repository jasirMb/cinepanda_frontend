"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (token: string) => void;
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
      isAuthenticated: false,
      hasHydrated: false,
      login: (token: string) =>
        set({
          token,
          isAuthenticated: true
        }),
      logout: () =>
        set({
          token: null,
          isAuthenticated: false
        })
      };
    },
    {
      name: "cinepanda-auth",
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state, error) => {
        setAuthState?.({ hasHydrated: true });
      }
    }
  )
);

