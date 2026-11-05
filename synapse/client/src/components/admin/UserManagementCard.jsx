import { useMemo, useState } from 'react';
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

function MentorAssignment({ user, mentors, onAssign, onUnassign, saving, error }) {
    if (user.role !== 'student') {
        return <span className="font-body text-sm text-text-faint">Not applicable</span>;
    }

    return (
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
                <option value="">
                    {saving ? 'Saving assignment…' : mentors.length ? 'Add mentor…' : 'No mentors available'}
                </option>
                {mentors
                    .filter((mentor) => !user.mentors?.some((assigned) => assigned._id === mentor._id))
                    .map((mentor) => <option key={mentor._id} value={mentor._id}>{mentor.name}</option>)}
            </select>
            {saving && <p className="mt-1 font-mono text-xs text-text-faint" role="status">Saving mentor assignment…</p>}
            <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {user.mentors?.length ? user.mentors.map((mentor) => (
                    <span
                        key={mentor._id}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-border-strong bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted"
                    >
                        <span className="break-words">{mentor.name}</span>
                        <button
                            type="button"
                            onClick={() => onUnassign(user, mentor)}
                            disabled={saving}
                            aria-label={`Remove ${mentor.name} from ${user.name}`}
                            className="rounded px-1 text-danger hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                        >
                            <span aria-hidden="true">×</span>
                        </button>
                    </span>
                )) : (
                    <span className="font-body text-xs text-text-faint">No mentor assigned</span>
                )}
            </div>
            {error && <p className="mt-2 font-body text-xs text-danger" role="alert">{error}</p>}
        </div>
    );
}

function UserIdentity({ user }) {
    return (
        <div className="min-w-0">
            <p className="break-words font-body text-sm font-semibold text-text">{user.name}</p>
            <p className="break-all font-mono text-xs text-text-faint">{user.email}</p>
        </div>
    );
}

function UserCard({ user, mentors, onAssign, onUnassign, saving, error }) {
    return (
        <li className="min-w-0 rounded-xl border border-border bg-surface p-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <UserIdentity user={user} />
                <StatusBadge tone={roleTone[user.role] || 'neutral'} label={user.role} />
            </div>
            <p className="mt-3 break-words font-body text-sm text-text-muted">
                {user.department || 'Department not provided'}
            </p>
            {user.role === 'student' && (
                <div className="mt-4 border-t border-border pt-3">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-faint">Mentor assignment</p>
                    <MentorAssignment
                        user={user}
                        mentors={mentors}
                        onAssign={onAssign}
                        onUnassign={onUnassign}
                        saving={saving}
                        error={error}
                    />
                </div>
            )}
        </li>
    );
}

function UserTableRow({ user, mentors, onAssign, onUnassign, saving, error }) {
    return (
        <tr className="border-b border-border last:border-b-0">
            <td className="px-4 py-4 align-top"><UserIdentity user={user} /></td>
            <td className="px-4 py-4 align-top">
                <StatusBadge tone={roleTone[user.role] || 'neutral'} label={user.role} />
            </td>
            <td className="px-4 py-4 align-top">
                <span className="break-words font-body text-sm text-text-muted">
                    {user.department || 'Department not provided'}
                </span>
            </td>
            <td className="min-w-64 px-4 py-4 align-top">
                <MentorAssignment
                    user={user}
                    mentors={mentors}
                    onAssign={onAssign}
                    onUnassign={onUnassign}
                    saving={saving}
                    error={error}
                />
            </td>
        </tr>
    );
}

export default function UserManagementCard({
    users,
    mentors,
    adminCount,
    loading,
    error,
    onRetry,
    onAssign,
    onUnassign,
    savingUserIds,
    rowErrors,
}) {
    const [activeRole, setActiveRole] = useState('all');
    const [search, setSearch] = useState('');
    const counts = {
        all: users.length + (adminCount ?? 0),
        student: users.filter((user) => user.role === 'student').length,
        mentor: users.filter((user) => user.role === 'mentor').length,
        admin: adminCount ?? '—',
    };
    const filteredUsers = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();
        return users.filter((user) => (
            (activeRole === 'all' || user.role === activeRole)
            && (!normalizedSearch || `${user.name || ''} ${user.email || ''} ${user.department || ''}`
                .toLocaleLowerCase()
                .includes(normalizedSearch))
        ));
    }, [activeRole, search, users]);

    const adminProfilesUnavailable = activeRole === 'admin';
    const noUsers = filteredUsers.length === 0;

    return (
        <Card className="min-w-0 overflow-hidden">
            <header className="border-b border-border p-4 sm:p-5">
                <p className="section-label mb-1">People & support</p>
                <h2 className="font-display text-xl font-semibold text-text">User management</h2>
                <div className="mt-4 grid min-w-0 gap-3">
                    <label className="sr-only" htmlFor="admin-user-search">Search users</label>
                    <input
                        id="admin-user-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
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
                {!loading && !error && adminCount > 0 && (
                    <p className="mt-3 font-body text-xs text-text-faint">
                        Admin profiles are not returned by the existing user endpoint; the admin count comes from institution stats.
                    </p>
                )}
            </header>

            {loading ? (
                <div className="space-y-3 p-4" role="status" aria-label="Loading users">
                    {[0, 1, 2].map((item) => <Skeleton key={item} className="h-20 w-full" />)}
                </div>
            ) : error ? (
                <div className="p-4 sm:p-5"><ErrorState message={error} onRetry={onRetry} /></div>
            ) : noUsers ? (
                <div className="p-4 sm:p-5">
                    <EmptyState
                        title={adminProfilesUnavailable ? 'Admin profiles are not available' : 'No matching users'}
                        body={adminProfilesUnavailable
                            ? 'The existing endpoints return only an admin count, not admin profile details.'
                            : 'Try a different search or role filter.'}
                    />
                </div>
            ) : (
                <>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[720px] table-fixed text-left">
                            <thead className="bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-text-faint">
                                <tr>
                                    <th scope="col" className="w-[25%] px-4 py-3 font-medium">Name and email</th>
                                    <th scope="col" className="w-[13%] px-4 py-3 font-medium">Role</th>
                                    <th scope="col" className="w-[22%] px-4 py-3 font-medium">Department</th>
                                    <th scope="col" className="w-[40%] px-4 py-3 font-medium">Mentor assignment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <UserTableRow
                                        key={user._id}
                                        user={user}
                                        mentors={mentors}
                                        onAssign={onAssign}
                                        onUnassign={onUnassign}
                                        saving={savingUserIds.includes(user._id)}
                                        error={rowErrors[user._id]}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <ul className="space-y-3 p-3 md:hidden">
                        {filteredUsers.map((user) => (
                            <UserCard
                                key={user._id}
                                user={user}
                                mentors={mentors}
                                onAssign={onAssign}
                                onUnassign={onUnassign}
                                saving={savingUserIds.includes(user._id)}
                                error={rowErrors[user._id]}
                            />
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
