import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from '../ThemeToggle.jsx';
import { getNavGroups } from './navConfig.js';

const BrandMark = () => (
    <svg aria-hidden="true" viewBox="0 0 30 24" fill="none" className="h-6 w-8 text-accent">
        <path d="M9 12h12" stroke="currentColor" strokeWidth="2" />
        <circle cx="7" cy="12" r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
        <circle cx="23" cy="12" r="4" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />
    </svg>
);

export default function Sidebar() {
    const { user } = useAuth();
    const groups = getNavGroups(user?.role);

    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-elevated px-4 py-5 lg:flex">
            <div className="mb-9 flex items-center gap-2 px-2">
                <BrandMark />
                <span className="font-display text-xl font-bold tracking-tight text-text">SYNAPSE</span>
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
                                        className={({ isActive }) => (
                                            `relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                                isActive
                                                    ? 'bg-accent-soft font-medium text-accent'
                                                    : 'text-text-muted hover:bg-surface-2 hover:text-text'
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
                <div className="mb-3 flex min-w-0 items-center gap-3 px-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-sm font-semibold text-accent" aria-hidden="true">
                        {user?.name?.trim()?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-body text-sm font-medium text-text">{user?.name || 'Account'}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-text-faint">{user?.role || ''}</p>
                    </div>
                </div>
                <div className="flex items-center justify-between px-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint">Appearance</span>
                    <ThemeToggle />
                </div>
            </footer>
        </aside>
    );
}
