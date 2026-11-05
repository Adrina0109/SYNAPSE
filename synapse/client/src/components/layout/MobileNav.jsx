import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { getNavGroups } from './navConfig.js';
import { ProfileIcon } from './navIcons.jsx';

const MenuIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
        <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
);

const CloseIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
        <path d="m6 6 12 12M18 6 6 18" />
    </svg>
);

const BrandMark = () => (
    <svg aria-hidden="true" viewBox="0 0 30 24" fill="none" className="h-6 w-8 text-accent">
        <path d="M9 12h12" stroke="currentColor" strokeWidth="2" />
        <circle cx="7" cy="12" r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
        <circle cx="23" cy="12" r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    </svg>
);

export default function MobileNav() {
    const { user } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const drawerRef = useRef(null);
    const triggerRef = useRef(null);
    const groups = getNavGroups(user?.role);

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusableSelector = 'a[href], button:not([disabled])';
        const focusable = () => [...(drawerRef.current?.querySelectorAll(focusableSelector) ?? [])];
        focusable()[0]?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                triggerRef.current?.focus();
                return;
            }
            if (event.key !== 'Tab') return;

            const elements = focusable();
            if (elements.length === 0) return;
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (!drawerRef.current?.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const closeDrawer = () => setIsOpen(false);

    return (
        <div className="lg:hidden">
            <div className="flex h-14 items-center justify-between border-b border-border bg-bg-elevated px-4">
                <div className="flex items-center gap-2">
                    <BrandMark />
                    <span className="font-display text-lg font-bold tracking-tight text-text">SYNAPSE</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        ref={triggerRef}
                        type="button"
                        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                        aria-expanded={isOpen}
                        aria-controls="mobile-navigation-drawer"
                        onClick={() => setIsOpen((open) => !open)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                        {isOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[60]">
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={closeDrawer}
                        className="absolute inset-0 h-full w-full bg-scrim/50"
                    />
                    <aside
                        id="mobile-navigation-drawer"
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Main navigation"
                        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-bg-elevated px-4 py-5 shadow-2xl"
                    >
                        <div className="mb-8 flex items-center justify-between px-2">
                            <Link to={user?.role === 'student' ? '/student' : user?.role === 'mentor' ? '/mentor' : '/admin'} onClick={closeDrawer} className="flex items-center gap-2">
                                <BrandMark />
                                <span className="font-display text-xl font-bold tracking-tight text-text">SYNAPSE</span>
                            </Link>
                            <button type="button" onClick={closeDrawer} aria-label="Close navigation menu" className="rounded-md p-2 text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                                <CloseIcon />
                            </button>
                        </div>

                        <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-7 overflow-y-auto">
                            {groups.map((group) => (
                                <section key={group.label}>
                                    <h2 className="mb-2 px-3 font-mono text-[10px] tracking-[0.16em] text-text-faint">{group.label}</h2>
                                    <ul className="space-y-1">
                                        {group.items.map(({ label, to, icon: ItemIcon }) => (
                                            <li key={to}>
                                                <NavLink
                                                    to={to}
                                                    end={to === '/student' || to === '/mentor' || to === '/admin'}
                                                    onClick={closeDrawer}
                                                    className={({ isActive }) => (
                                                        `relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 font-body text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                                            isActive ? 'bg-accent-soft font-medium text-accent' : 'text-text-muted hover:bg-surface-2 hover:text-text'
                                                        }`
                                                    )}
                                                >
                                                    {({ isActive }) => (
                                                        <>
                                                            {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
                                                            <ItemIcon />
                                                            <span>{label}</span>
                                                        </>
                                                    )}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </nav>

                        <footer className="mt-5 border-t border-border pt-4">
                            <div className="mb-3 flex items-center gap-3 px-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent" aria-hidden="true">
                                    {user?.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-body text-sm font-medium text-text">{user?.name || 'Account'}</p>
                                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-faint">{user?.role || ''}</p>
                                </div>
                            </div>
                            {user?.role === 'student' && (
                                <Link to="/profile" onClick={closeDrawer} className="flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm text-text-muted hover:bg-surface-2">
                                    <ProfileIcon />
                                    Profile
                                </Link>
                            )}
                        </footer>
                    </aside>
                </div>
            )}
        </div>
    );
}
