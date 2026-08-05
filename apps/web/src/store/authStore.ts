import { create } from "zustand";
import type { Role } from "@cbos/shared";
import { setAccessToken } from "../lib/api";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  isHydrating: boolean; // true while attempting silent refresh on app load
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  setHydrating: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isHydrating: true,
  setSession: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, isHydrating: false });
  },
  clearSession: () => {
    setAccessToken(null);
    set({ user: null, isHydrating: false });
  },
  setHydrating: (value) => set({ isHydrating: value }),
}));
