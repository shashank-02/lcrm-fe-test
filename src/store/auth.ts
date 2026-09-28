import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { Me } from '@/types';

interface AuthState {
  accessToken: string | null; refreshToken: string | null; user: Me | null;
  setSession: (s: { accessToken: string; refreshToken: string; user: Me }) => void;
  setUser: (u: Me) => void;
  refresh: () => Promise<string | null>;
  logout: () => void;
  can: (...keys: string[]) => boolean;
}

const base = (import.meta.env.VITE_API_URL || '') + '/api/v1';

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null, refreshToken: null, user: null,
      setSession: (s) => set({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }),
      setUser: (user) => set({ user }),
      refresh: async () => {
        const rt = get().refreshToken;
        if (!rt) return null;
        try {
          const res = await axios.post(`${base}/auth/refresh`, { refreshToken: rt });
          set({ accessToken: res.data.data.accessToken, refreshToken: res.data.data.refreshToken });
          return res.data.data.accessToken as string;
        } catch { return null; }
      },
      logout: () => {
        const rt = get().refreshToken;
        if (rt) axios.post(`${base}/auth/logout`, { refreshToken: rt }).catch(() => undefined);
        set({ accessToken: null, refreshToken: null, user: null });
      },
      can: (...keys) => { const u = get().user; return !!u && (u.role === 'admin' || keys.some((k) => u.permissions.includes(k))); },
    }),
    { name: 'lead-crm-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }) },
  ),
);

/** Hook form of `can` that re-renders when the user changes. */
export const useCan = () => { const user = useAuth((s) => s.user); return (...keys: string[]) => !!user && (user.role === 'admin' || keys.some((k) => user.permissions.includes(k))); };
