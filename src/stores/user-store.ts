import { create } from 'zustand';
import type { Profile } from '@/types';

interface UserState {
  profile: Profile | null;
  isLoading: boolean;

  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        set({ profile: data.profile });
      }
    } catch {
      // Profile fetch failed — non-blocking
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => set({ profile: null, isLoading: false }),
}));
