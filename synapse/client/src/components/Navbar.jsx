import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const linksByRole = {
    student: [
        { label: 'Dashboard', to: '/student' },
        { label: 'My tasks', to: '/tasks' },
        { label: 'Planner', to: '/planner' },
        { label: 'Roadmaps', to: '/roadmaps' },
        { label: 'Placement', to: '/placement' },
        { label: 'Announcements', to: '/announcements/inbox' },
        { label: 'Assistant', to: '/assistant' },
    ],
    mentor: [
        { label: 'Dashboard', to: '/mentor' },
        { label: 'Documents', to: '/documents' },
        { label: 'Placement drives', to: '/placement/drives' },
        { label: 'Announcements', to: '/announcements' },
    ],
    admin: [
        { label: 'Dashboard', to: '/admin' },
        { label: 'Documents', to: '/admin/documents' },
        { label: 'Placement drives', to: '/placement/drives' },
        { label: 'Announcements', to: '/announcements' },
    ],
};

const Logo = () => (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="4" cy="14" r="2.5" fill="#E8401C" />
        <circle cx="14" cy="6" r="2.5" fill="#E8401C" />
        <circle cx="24" cy="14" r="2.5" fill="#E8401C" />
        <circle cx="14" cy="22" r="2.5" fill="#E8401C" />
        <path d="M6 13 12 7M16 7l6 6m-1 3-6 5m-3 0-6-5" stroke="#16140F" strokeOpacity=".4" strokeWidth="1.5" />
    </svg>
);

export default function Navbar() {
    const { user, logout, getDashboardPath } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [logoutError, setLogoutError] = useState('');
    const [notificationCount, setNotificationCount] = useState(0);
    const [notificationError, setNotificationError] = useState('');
    const links = user ? (linksByRole[user.role] ?? []) : [];

    useEffect(() => {
        if (user?.role !== 'student') {
            setNotificationCount(0);
            setNotificationError('');
            return undefined;
        }

        let active = true;
        const pollNotifications = async () => {
            try {
                const { data } = await api.get('/notifications');
                if (active) {
                    setNotificationCount(data.unreadCount || 0);
                    setNotificationError('');
                }
            } catch (error) {
                if (active) {
                    setNotificationError(error.response?.data?.message || 'Notifications are temporarily unavailable.');
                }
            }
        };

        pollNotifications();
        const intervalId = window.setInterval(pollNotifications, 30000);
        return () => {
            active = false;
            window.clearInterval(intervalId);
        };
    }, [user?._id, user?.role]);

    const handleLogout = async () => {
        setLogoutError('');
        try {
            await logout();
            navigate('/');
        } catch (error) {
            setLogoutError(error.response?.data?.message || 'Could not sign out. Please try again.');
        }
    };

    return (
        <header className="relative z-20 border-b border-ink/10 bg-paper">
            <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
                <Link
                    to={user ? getDashboardPath() : '/'}
                    className="inline-flex shrink-0 items-center gap-2"
                    aria-label="SYNAPSE home"
                >
                    <Logo />
                    <span className="font-display text-lg font-bold tracking-tight text-ink">SYNAPSE</span>
                </Link>

                <button
                    type="button"
                    className="btn-secondary px-3 py-2 text-sm sm:hidden"
                    aria-expanded={menuOpen}
                    aria-controls="primary-navigation-links"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? 'Close menu' : 'Menu'}
                </button>

                <div
                    id="primary-navigation-links"
                    className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center`}
                >
                    {links.map(({ label, to }) => {
                        const active = location.pathname === to
                            || (to !== '/student' && to !== '/mentor' && to !== '/admin' && location.pathname.startsWith(`${to}/`));
                        return (
                            <Link
                                key={to}
                                to={to}
                                onClick={() => setMenuOpen(false)}
                                aria-current={active ? 'page' : undefined}
                                className={`px-3 py-2 font-body text-sm transition-colors hover:text-signal focus-visible:outline-2 focus-visible:outline-signal ${active ? 'font-semibold text-signal' : 'text-ink-muted'}`}
                            >
                                {label}
                            </Link>
                        );
                    })}
                    {user ? (
                        <div className="flex flex-col gap-2 border-t border-ink/10 pt-2 sm:flex-row sm:items-center sm:border-0 sm:pt-0">
                            {user.role === 'student' && (
                                <Link
                                    to="/announcements/inbox"
                                    aria-label={`Announcement inbox${notificationCount ? `, ${notificationCount} unread` : ''}`}
                                    className="relative inline-flex items-center gap-2 px-3 py-2 font-body text-sm text-ink-muted hover:text-signal"
                                >
                                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                                        <path d="M10 21h4" />
                                    </svg>
                                    <span>Inbox</span>
                                    {notificationCount > 0 && (
                                        <span className="rounded-full bg-signal px-1.5 py-0.5 font-mono text-[10px] text-white">
                                            {notificationCount > 99 ? '99+' : notificationCount}
                                        </span>
                                    )}
                                </Link>
                            )}
                            <span className="hidden max-w-36 truncate font-body text-sm text-ink-muted lg:block">{user.name}</span>
                            <button type="button" onClick={handleLogout} className="btn-ghost justify-start text-sm sm:justify-center">
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 border-t border-ink/10 pt-2 sm:border-0 sm:pt-0">
                            <Link to="/login" className="btn-secondary px-4 py-2 text-sm">Sign in</Link>
                            <Link to="/signup" className="btn-primary px-4 py-2 text-sm">Get started</Link>
                        </div>
                    )}
                </div>
            </nav>
            {logoutError && (
                <p className="mx-auto max-w-7xl px-4 pb-2 font-body text-sm text-signal sm:px-6 lg:px-10" role="alert">
                    {logoutError}
                </p>
            )}
            {notificationError && user?.role === 'student' && (
                <p className="mx-auto max-w-7xl px-4 pb-2 font-body text-xs text-signal sm:px-6 lg:px-10" role="status">
                    {notificationError}
                </p>
            )}
        </header>
    );
}
