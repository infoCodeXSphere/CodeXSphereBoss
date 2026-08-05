import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { setAccessToken } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

/**
 * On app load, silently attempt to trade the httpOnly refresh cookie
 * (if present from a previous session) for a fresh access token —
 * this is what lets a page reload keep you logged in without storing
 * the access token itself in localStorage (which would be readable
 * by any injected script, unlike an httpOnly cookie).
 */
export function useBootstrapSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const setHydrating = useAuthStore((s) => s.setHydrating);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
        if (!res.ok) throw new Error("no session");
        const { accessToken } = await res.json();
        setAccessToken(accessToken);

        const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!meRes.ok) throw new Error("failed to load user");
        const user = await meRes.json();
        if (!cancelled) setSession(user, accessToken);
      } catch {
        if (!cancelled) useAuthStore.getState().clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSession, setHydrating]);
}
