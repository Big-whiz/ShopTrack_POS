import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const TIMEOUT_MS = 30 * 60 * 1000;   // 30 minutes
const WARNING_MS = 5 * 60 * 1000;    // warn 5 minutes before

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionTimeout() {
    const logout = useAuthStore((s) => s.logout);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
    const navigate = useNavigate();

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningToastRef = useRef<string | null>(null);

    const clearTimers = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        if (warningToastRef.current) {
            toast.dismiss(warningToastRef.current);
            warningToastRef.current = null;
        }
    }, []);

    const resetTimer = useCallback(() => {
        clearTimers();

        if (!isAuthenticated) return;

        // Warning appears 1 minute before logout
        warningRef.current = setTimeout(() => {
            warningToastRef.current = toast(
                '⚠️ Session expiring in 1 minute due to inactivity. Move your mouse or press a key to stay logged in.',
                { duration: 60000, icon: '⏱️' }
            );
        }, TIMEOUT_MS - WARNING_MS);

        // Auto-logout after full timeout
        timeoutRef.current = setTimeout(() => {
            clearTimers();
            logout();
            navigate('/login', { replace: true });
            toast.error('You were logged out due to inactivity.');
        }, TIMEOUT_MS);
    }, [isAuthenticated, logout, navigate, clearTimers]);

    useEffect(() => {
        if (!isAuthenticated) {
            clearTimers();
            return;
        }

        // Start timer immediately on mount / login
        resetTimer();

        // Register activity listeners to reset the timer
        ACTIVITY_EVENTS.forEach((event) =>
            window.addEventListener(event, resetTimer, { passive: true })
        );

        return () => {
            clearTimers();
            ACTIVITY_EVENTS.forEach((event) =>
                window.removeEventListener(event, resetTimer)
            );
        };
    }, [isAuthenticated, resetTimer, clearTimers]);
}
