import { useState } from 'react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

const ROLE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'mentor', label: 'Mentors' },
    { key: 'admin', label: 'Admins' },
];

const roleTone = {
    student: 'info',
    mentor: 'accent',
    admin: 'neutral',
};

function UserRow({ user, mentors, onAssign, onUnassign, saving, error }) {
    return (
        <div className="grid min-w-0 gap-3 border-b border-border p-4 last:border-b-0 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_minmax(0,1.3fr)] md:items-center md:px-5">
            <div className="min-w-0">
                <p className="break-words font-body text-sm font-semibold text-text">{user.name}</p>
                <p className="break-all font-mono text-xs text-text-faint">{user.email}</p>
            </div>
            <p className="break-words font-body text-sm text-text-muted">{user.department || 'Department not provided'}</p>
            <div><StatusBadge tone={roleTone[user.role] || 'neutral'} label={user.role} /></div>
            {user.role === 'student' ? (
                <div className="min-w-0">
                    <label className="sr-only" htmlFor={`mentor-assignment-${user._id}`}>
                        Add a mentor for {user.name}
                    </label>
                    <select
                        id={`mentor-assignment-${user._id}`}
                        value=""
                        onChange={(event) => {
                            if (event.target.value) onAssign(user, event.target.value);
                        }}
                        disabled={saving || mentors.length === 0}
                        className="input-base min-w-0 py-2 text-sm"
                    >
                        <option value="">{saving ? 'Saving assignment…' : mentors.length ? 'Add mentor…' : 'No mentors available'}</option>
                        {mentors
                            .filter((mentor) => !user.mentors?.some((assigned) => assigned._id === mentor._id))
                            .map((mentor) => <option key={mentor._id} value={mentor._id}>{mentor.name}</option>)}
                    </select>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                        {user.mentors?.length ? user.mentors.map((mentor) => (
                            <span key={mentor._id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted">
                                <span className="break-words">{mentor.name}</span>
                                <button
                                    type="button"
                                    onClick={() => onUnassign(user, mentor)}
                                    disabled={saving}
                                    aria-label={`Remove ${mentor.name} from ${user.name}`}
                                    className="rounded px-1 text-danger hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                                >
                                    ×
                                </button>
                            </span>
                        )) : (
                            <span className="font-body text-xs text-text-faint">No mentor assigned</span>
                        )}
                    </div>
                    {error && <p className="mt-2 font-body text-xs text-danger" role="alert">{error}</p>}
                </div>
            ) : (
                <p className="font-body text-sm text-text-muted">Mentor assignment is only available for students.</p>
            )}
        </div>
    );
}

export default function UserManagementCard({
    users,
    mentors,
    adminCount,
    loading,
    error,
    onRetry,
    search,
    onSearchChange,
    onAssign,
    onUnassign,
    savingUserIds,
    rowErrors,
}) {
    const [activeRole, setActiveRole] = React.useState('all');
    const counts = {
        all: users.length,
        student: users.filter((user) => user.role === 'student').length,
        mentor: users.filter((user) => user.role === 'mentor').length,
        admin: adminCount ?? '—',
    };
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filteredUsers = users.filter((user) => (
        (activeRole === 'all' || user.role === activeRole)
        && (!normalizedSearch || `${user.name || ''} ${user.email || ''} ${user.department || ''}`.toLocaleLowerCase().includes(normalizedSearch))
    ));

    return (
        <Card className="min-w-0 overflow-hidden">
            <header className="border-b border-border p-4 sm:p-5">
                <div>
                    <p className="section-label mb-1">People & support</p>
                    <h2 className="font-display text-xl font-semibold text-text">User management</h2>
                </div>
                <div className="mt-4 grid min-w-0 gap-3">
                    <label className="sr-only" htmlFor="admin-user-search">Search users</label>
                    <input
                        id="admin-user-search"
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="input-base"
                        placeholder="Search name, email or department"
                    />
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter users by role">
                        {ROLE_FILTERS.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveRole(filter.key)}
                                aria-pressed={activeRole === filter.key}
                                className={`rounded-full border px-3 py-2 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                    activeRole === filter.key
                                        ? 'border-accent bg-accent-soft text-accent'
                                        : 'border-border-strong bg-surface text-text-muted hover:bg-surface-2'
                                }`}
                            >
                                {filter.label} <span className="ml-1">{counts[filter.key]}</span>
                            </button>
                        ))}
                    </div>
                </div>
                {!loading && !error && (
                    <p className="mt-3 font-body text-xs text-text-faint">
                        The existing user endpoint returns student and mentor profiles only. Admin profile details are not available here.
                    </p>
                )}
            </header>

            {loading ? (
                <div className="space-y-3 p-4" role="status" aria-label="Loading users">
                    {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 w-full" />)}
                </div>
            ) : error ? (
                <div className="p-4 sm:p-5"><ErrorState message={error} onRetry={onRetry} /></div>
            ) : filteredUsers.length === 0 ? (
                <div className="p-4 sm:p-5">
                    <EmptyState
                        title={activeRole === 'admin' ? 'Admin profiles are not returned' : 'No matching users'}
                        body={activeRole === 'admin'
                            ? 'The admin stats endpoint returns a count only; no existing endpoint provides admin profile rows.'
                            : 'Try a different search or role filter.'}
                    />
                </div>
            ) : (
                <>
                    <div className="hidden border-b border-border bg-surface-2 px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-text-faint md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_minmax(0,1.3fr)]">
                        <span>Name and email</span>
                        <span>Department</span>
                        <span>Role</span>
                        <span>Mentor assignments</span>
                    </div>
                    <div className="hidden md:block">
                        {filteredUsers.map((user) => (
                            <UserRow
                                key={user._id}
                                user={user}
                                mentors={mentors}
                                onAssign={onAssign}
                                onUnassign={onUnassign}
                                saving={savingUserIds.includes(user._id)}
                                error={rowErrors[user._id]}
                            />
                        ))}
                    </div>
                    <ul className="space-y-3 p-3 md:hidden">
                        {filteredUsers.map((user) => (
                            <li key={user._id} className="min-w-0 rounded-xl border border-border bg-surface">
                                <UserRow
                                    user={user}
                                    mentors={mentors}
                                    onAssign={onAssign}
                                    onUnassign={onUnassign}
                                    saving={savingUserIds.includes(user._id)}
                                    error={rowErrors[user._id]}
                                />
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
