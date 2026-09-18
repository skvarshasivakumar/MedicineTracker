import { create } from 'zustand';
import { Language, User } from '@/db/types';
import { getUser } from '@/db/repo';
import { setLocale } from '@/i18n';

interface UserStore {
  user: User | null;
  loaded: boolean;
  refresh: () => void;
  setUser: (u: User) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  loaded: false,
  refresh: () => {
    const u = getUser();
    if (u) setLocale(u.language as Language);
    set({ user: u, loaded: true });
  },
  setUser: (u) => {
    setLocale(u.language as Language);
    set({ user: u });
  },
}));
