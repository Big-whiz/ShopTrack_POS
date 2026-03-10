import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, History,
    BarChart2, Users, LogOut, ShoppingBag, Tag, CreditCard, X, Settings
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
    {
        label: 'MAIN', items: [
            { to: '/', Icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/pos', Icon: ShoppingCart, label: 'New Sale (POS)' },
            { to: '/sales', Icon: History, label: 'Sales History' },
            { to: '/credits', Icon: CreditCard, label: 'Credit Sales' },
        ]
    },
    {
        label: 'INVENTORY', items: [
            { to: '/inventory', Icon: Package, label: 'Products' },
            { to: '/categories', Icon: Tag, label: 'Categories' },
        ]
    },
    {
        label: 'SUPPLIERS', items: [
            { to: '/suppliers', Icon: Users, label: 'Suppliers' },
            { to: '/supplier-debts', Icon: CreditCard, label: 'Supplier Debts' },
        ]
    }
];

const adminItems = [
    {
        label: 'ADMIN', items: [
            { to: '/analytics', Icon: BarChart2, label: 'Analytics' },
            { to: '/users', Icon: Users, label: 'Users' },
            { to: '/settings', Icon: Settings, label: 'Settings' },
        ]
    },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user, logout, isAdmin } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = (user?.full_name || user?.username || 'U')
        .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

    const sectionsToRender = isAdmin() ? [...navItems, ...adminItems] : navItems;

    return (
        <aside className={`sidebar${isOpen ? ' mobile-open' : ''}`}>
            <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <div className="sidebar-logo-icon"><ShoppingBag size={20} color="white" /></div>
                <div>
                    <div className="sidebar-logo-text">ShopTrack</div>
                    <div className="sidebar-logo-sub">POS System</div>
                </div>
                {/* Close button — only visible on mobile when open */}
                <button
                    onClick={onClose}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: isOpen ? 'flex' : 'none' }}
                    className="hamburger"
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {sectionsToRender.map((section) => (
                    <div key={section.label} className="sidebar-section">
                        <div className="sidebar-section-label">{section.label}</div>
                        {section.items.map(({ to, Icon, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                                end={to === '/'}
                                onClick={onClose}
                            >
                                <Icon className="nav-item-icon" size={18} />
                                <span>{label}</span>
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                            className="sidebar-user-name"
                            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={user?.full_name || user?.username}
                        >
                            {user?.full_name || user?.username}
                        </div>
                        <div className="sidebar-user-role" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
                    </div>
                    <button className="btn-icon" onClick={handleLogout} title="Logout">
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
