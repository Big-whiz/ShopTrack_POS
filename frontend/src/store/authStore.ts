import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../services/api';

interface AuthState {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: () => boolean;
    isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,

            login: async (username, password) => {
                const form = new URLSearchParams();
                form.append('username', username);
                form.append('password', password);
                const { data } = await api.post('/auth/login', form, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                localStorage.setItem('access_token', data.access_token);
                set({ user: data.user, token: data.access_token });
            },

            logout: () => {
                localStorage.removeItem('access_token');
                set({ user: null, token: null });
            },

            isAuthenticated: () => !!get().token && !!get().user,
            isAdmin: () => get().user?.role === 'admin',
        }),
        { name: 'auth_store', partialize: (s) => ({ user: s.user, token: s.token }) }
    )
);
