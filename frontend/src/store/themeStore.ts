import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark', // default to our existing beautiful dark mode
            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    return { theme: newTheme };
                }),
            setTheme: (theme) => {
                document.documentElement.setAttribute('data-theme', theme);
                set({ theme });
            },
        }),
        {
            name: 'shoptrack-theme', // local storage key
        }
    )
);

// Helper to initialize theme on app load
export const initTheme = () => {
    const stored = localStorage.getItem('shoptrack-theme');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.state && parsed.state.theme) {
                document.documentElement.setAttribute('data-theme', parsed.state.theme);
                return;
            }
        } catch { } // ignore
    }
    // Fallback default
    document.documentElement.setAttribute('data-theme', 'dark');
};
