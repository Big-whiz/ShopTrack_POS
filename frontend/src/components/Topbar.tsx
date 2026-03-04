import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Menu, Wifi, WifiOff, RefreshCw, Sun, Moon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../services/db';
import { processQueue } from '../services/syncQueue';
import { useThemeStore } from '../store/themeStore';

interface TopbarProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

interface OutletCtx { onMenuClick?: () => void; }

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
    const ctx = useOutletContext<OutletCtx | null>();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { theme, toggleTheme } = useThemeStore();

    // Live count of pending sync items
    const pendingCount = useLiveQuery(() => db.syncQueue.where('status').equals('pending').count(), [], 0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="hamburger" aria-label="Open menu" onClick={() => ctx?.onMenuClick?.()}>
                    <Menu size={22} />
                </button>
                <div>
                    <div className="topbar-title">{title}</div>
                    {subtitle && <div className="topbar-sub">{subtitle}</div>}
                </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
                {actions && <div style={{ display: 'flex', gap: 12 }}>{actions}</div>}

                {pendingCount > 0 && (
                    <button
                        onClick={() => processQueue()}
                        className="btn"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', padding: '6px 12px', minHeight: 'unset', height: 32 }}
                        title="Click to attempt sync now"
                    >
                        <RefreshCw size={14} />
                        Sync ({pendingCount})
                    </button>
                )}

                <button
                    onClick={toggleTheme}
                    className="btn-icon"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', width: 32, height: 32, padding: 0 }}
                    title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: isOnline ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                    {isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
        </header>
    );
}
