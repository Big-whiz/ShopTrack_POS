import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { initTheme } from './store/themeStore';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import POSPage from './pages/POSPage';
import SalesPage from './pages/SalesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';
import CreditPage from './pages/CreditPage';

initTheme();

function ProtectedLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useSessionTimeout();
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <div className="app-layout">
            {/* Dark overlay when mobile sidebar is open */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay open"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            {/* main-content: CSS handles margin-left at every breakpoint */}
            <div className="main-content">
                <Outlet context={{ onMenuClick: () => setSidebarOpen(true) }} />
            </div>
        </div>
    );
}

function AdminRoute() {
    const isAdmin = useAuthStore((s) => s.isAdmin());
    if (!isAdmin) return <Navigate to="/" replace />;
    return <Outlet />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: { background: '#1f2937', color: '#e6edf3', border: '1px solid #30363d' },
                    success: { iconTheme: { primary: '#10b981', secondary: '#1f2937' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#1f2937' } },
                }}
            />
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="pos" element={<POSPage />} />
                    <Route path="sales" element={<SalesPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="credits" element={<CreditPage />} />
                    <Route element={<AdminRoute />}>
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="users" element={<UsersPage />} />
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
