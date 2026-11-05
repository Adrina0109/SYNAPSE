import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { ProfileIcon } from './navIcons.jsx';

const BellIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" />
    </svg>
);

export default function TopBar({ title }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activePopover, setActivePopover] = useState('');
    const containerRef = useRef(null);
    const notificationButtonRef = useRef(null);
    const menuButtonRef = useRef(null);

    useEffect(() => {
        if (!activePopover) return undefined;
        const handlePointerDown = (event) => {
            if (!containerRef.current?.contains(event.target)) setActivePopover('');
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                const activeButton = activePopover === 'notifications'
                    ? notificationButtonRef.current
                    : menuButtonRef.current;
                setActivePopover('');
                activeButton?.focus();
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePopover]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const initials = user?.name?.trim()?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';

    return (
        <header className="flex min-w-0 items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-8 lg:px-10">
            <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-text sm:text-xl">{title}</p>
            </div>
            <div ref={containerRef} className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="relative">
                    <button
                        ref={notificationButtonRef}
                        type="button"
                        aria-label="Notifications"
                        aria-expanded={activePopover === 'notifications'}
                        onClick={() => setActivePopover((current) => current === 'notifications' ? '' : 'notifications')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                        <BellIcon />
                    </button>
                    {activePopover === 'notifications' && (
                        <div role="status" className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-border bg-surface p-4 shadow-xl">
                            <p className="font-body text-sm text-text-muted">Nothing new.</p>
                        </div>
                    )}
                </div>
                <div className="hidden sm:block"><ThemeToggle /></div>
                <div className="relative">
                    <button
                        ref={menuButtonRef}
                        type="button"
                        aria-label="Account menu"
                        aria-expanded={activePopover === 'account'}
                        onClick={() => setActivePopover((current) => current === 'account' ? '' : 'account')}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                        {initials}
                    </button>
                    {activePopover === 'account' && (
                        <div className="absolute right-0 top-12 z-50 min-w-44 rounded-lg border border-border bg-surface p-1 shadow-xl">
                            {user?.role === 'student' && (
                                <Link
                                    to="/profile"
                                    onClick={() => setActivePopover('')}
                                    className="flex items-center gap-2 rounded-md px-3 py-2 font-body text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                                >
                                    <ProfileIcon />
                                    Profile
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full rounded-md px-3 py-2 text-left font-body text-sm text-danger hover:bg-surface-2"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
