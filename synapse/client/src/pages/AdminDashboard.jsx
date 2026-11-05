import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';
import UserManagementCard from '../components/admin/UserManagementCard.jsx';
import RiskDistribution from '../components/mentor/RiskDistribution.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Date unavailable'
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const upcomingDriveDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return date >= startOfToday;
};

function ResourceSkeleton({ label }) {
    return (
        <div className="space-y-3 p-4" role="status" aria-label={label}>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
        </div>
    );
}

function DrivesCard({ drives, loading, error, onRetry }) {
    const upcoming = useMemo(() => drives
        .filter((drive) => upcomingDriveDate(drive.date))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 4), [drives]);

    return (
        <Card className="min-w-0 overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
                <div>
                    <p className="section-label mb-1">Hiring activity</p>
                    <h2 className="font-display text-xl font-semibold text-text">Upcoming placement drives</h2>
                </div>
                <Link to="/placement/drives" className="btn-secondary px-3 py-2 text-sm">View all</Link>
            </header>
            {loading ? (
                <ResourceSkeleton label="Loading placement drives" />
            ) : error ? (
                <div className="p-4 sm:p-5"><ErrorState message={error} onRetry={onRetry} /></div>
            ) : upcoming.length === 0 ? (
                <div className="p-4 sm:p-5">
                    <EmptyState title="No upcoming drives" body="Placement drives from today onward will appear here." />
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {upcoming.map((drive) => (
                        <li key={drive._id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-4 sm:px-5">
                            <div className="min-w-0">
                                <p className="break-words font-body text-sm font-semibold text-text">{drive.company}</p>
                                <p className="mt-1 break-words font-body text-sm text-text-muted">{drive.role}</p>
                                <p className="mt-2 font-mono text-xs text-text-faint">{formatDate(drive.date)}</p>
                            </div>
                            <StatusBadge tone={drive.status === 'open' ? 'success' : 'neutral'} label={drive.status} />
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function DocumentsCard({ documents, loading, error, onRetry }) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
                <div>
                    <p className="section-label mb-1">Knowledge library</p>
                    <h2 className="font-display text-xl font-semibold text-text">Recent documents</h2>
                </div>
                <Link to="/documents" className="btn-secondary px-3 py-2 text-sm">View all</Link>
            </header>
            {loading ? (
                <ResourceSkeleton label="Loading recent documents" />
            ) : error ? (
                <div className="p-4 sm:p-5"><ErrorState message={error} onRetry={onRetry} /></div>
            ) : documents.length === 0 ? (
                <div className="p-4 sm:p-5">
                    <EmptyState title="No documents yet" body="Uploaded reference documents will appear here." />
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {documents.slice(0, 4).map((document) => (
                        <li key={document.id || document._id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-4 sm:px-5">
                            <div className="min-w-0">
                                <p className="break-words font-body text-sm font-semibold text-text">{document.title}</p>
                                <p className="mt-1 font-body text-xs capitalize text-text-muted">{document.category}</p>
                                <p className="mt-2 font-mono text-xs text-text-faint">{document.chunkCount} chunks · {formatDate(document.createdAt)}</p>
                            </div>
                            <StatusBadge
                                tone={document.accessLevel === 'all' ? 'success' : 'neutral'}
                                label={document.accessLevel === 'all' ? 'All students' : 'Mentors and admins'}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function AnnouncementsCard({ announcements, loading, error, onRetry }) {
    return (
        <Card className="min-w-0 overflow-hidden">
            <header className="border-b border-border p-4 sm:p-5">
                <p className="section-label mb-1">Communications</p>
                <h2 className="font-display text-xl font-semibold text-text">Recent announcements</h2>
            </header>
            {loading ? (
                <ResourceSkeleton label="Loading recent announcements" />
            ) : error ? (
                <div className="p-4 sm:p-5"><ErrorState message={error} onRetry={onRetry} /></div>
            ) : announcements.length === 0 ? (
                <div className="p-4 sm:p-5">
                    <EmptyState title="No announcements yet" body="Announcements sent by administrators and mentors will appear here." />
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {announcements.slice(0, 4).map((announcement) => (
                        <li key={announcement._id} className="grid min-w-0 gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5">
                            <div className="min-w-0">
                                <p className="line-clamp-2 whitespace-pre-wrap break-words font-body text-sm text-text">{announcement.rawText}</p>
                                <p className="mt-2 font-mono text-xs text-text-faint">
                                    {announcement.sourceType?.replaceAll('_', ' ')} · {announcement.audience} · {announcement.recipientCount} recipients
                                </p>
                            </div>
                            <time className="font-mono text-xs text-text-faint" dateTime={announcement.createdAt}>
                                {formatDate(announcement.createdAt)}
                            </time>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState('');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState('');
    const [drives, setDrives] = useState([]);
    const [drivesLoading, setDrivesLoading] = useState(true);
    const [drivesError, setDrivesError] = useState('');
    const [documents, setDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(true);
    const [documentsError, setDocumentsError] = useState('');
    const [announcements, setAnnouncements] = useState([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);
    const [announcementsError, setAnnouncementsError] = useState('');
    const [search, setSearch] = useState('');
    const [savingUserIds, setSavingUserIds] = useState([]);
    const [rowErrors, setRowErrors] = useState({});
    const [assignmentFeedback, setAssignmentFeedback] = useState('');

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        setUsersError('');
    const assignmentsRequestId = useRef(0);
    const statsRequestId = useRef(0);
    const hasAssignmentsLoaded = useRef(false);
    const hasStatsLoaded = useRef(false);

    const loadAssignments = useCallback(async () => {
        const requestId = ++assignmentsRequestId.current;
        if (!hasAssignmentsLoaded.current) setIsLoading(true);
        setError('');
        try {
            const [studentsResponse, mentorsResponse] = await Promise.all([
                api.get('/admin/users', { params: { role: 'student' } }),
                api.get('/admin/mentors'),
            ]);
            const studentUsers = Array.isArray(studentsResponse.data.users) ? studentsResponse.data.users : [];
            const mentorUsers = Array.isArray(mentorsResponse.data.mentors) ? mentorsResponse.data.mentors : [];
            setUsers([...studentUsers, ...mentorUsers]);
            setMentors(mentorUsers);
        } catch (requestError) {
            setUsersError(requestError.response?.data?.message || 'Could not load users. Please try again.');
        } finally {
            setUsersLoading(false);
            if (requestId === assignmentsRequestId.current) {
                hasAssignmentsLoaded.current = true;
                setStudents(studentsResponse.data.users || []);
                setMentors(mentorsResponse.data.mentors || []);
            }
        } catch (requestError) {
            if (requestId === assignmentsRequestId.current) {
                setError(requestError.response?.data?.message || 'Could not load mentor assignments. Please try again.');
            }
        } finally {
            if (requestId === assignmentsRequestId.current) setIsLoading(false);
        }
    }, []);

    const loadStats = useCallback(async () => {
        const requestId = ++statsRequestId.current;
        if (!hasStatsLoaded.current) setStatsLoading(true);
        setStatsError('');
        try {
            const { data } = await api.get('/admin/stats');
            if (requestId === statsRequestId.current) {
                hasStatsLoaded.current = true;
                setStats(data.stats ?? null);
            }
        } catch (requestError) {
            setStatsError(requestError.response?.data?.message || 'Could not load institution stats. Please try again.');
            if (requestId === statsRequestId.current) {
                setStatsError(requestError.response?.data?.message || 'Could not load admin stats. Please try again.');
            }
        } finally {
            if (requestId === statsRequestId.current) setStatsLoading(false);
        }
    }, []);

    const loadAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const { data } = await api.get('/mentor/analytics');
            setAnalytics(data.analytics ?? null);
        } catch (requestError) {
            setAnalyticsError(requestError.response?.data?.message || 'Could not load readiness and risk analytics. Please try again.');
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);
    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        const refreshVisibleDashboard = () => {
            if (document.visibilityState !== 'visible') return;
            loadAssignments();
            loadStats();
        };
        const intervalId = window.setInterval(refreshVisibleDashboard, 60000);
        window.addEventListener('focus', refreshVisibleDashboard);
        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', refreshVisibleDashboard);
        };
    }, [loadAssignments, loadStats]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return students;
        return students.filter((student) => [
            student.name,
            student.email,
            student.department,
            student.year,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)));
    }, [search, students]);

    const visibleStudentIds = filteredStudents.map((student) => student._id);
    const allVisibleSelected = visibleStudentIds.length > 0
        && visibleStudentIds.every((studentId) => selectedStudents.includes(studentId));

    const loadDrives = useCallback(async () => {
        setDrivesLoading(true);
        setDrivesError('');
        try {
            const { data } = await api.get('/placement/drives');
            setDrives(Array.isArray(data.drives) ? data.drives : []);
        } catch (requestError) {
            setDrivesError(requestError.response?.data?.message || 'Could not load placement drives. Please try again.');
        } finally {
            setDrivesLoading(false);
        }
    }, []);

    const loadDocuments = useCallback(async () => {
        setDocumentsLoading(true);
        setDocumentsError('');
        try {
            const { data } = await api.get('/documents');
            setDocuments(Array.isArray(data.documents) ? data.documents : []);
        } catch (requestError) {
            setDocumentsError(requestError.response?.data?.message || 'Could not load documents. Please try again.');
        } finally {
            setDocumentsLoading(false);
        }
    }, []);

    const loadAnnouncements = useCallback(async () => {
        setAnnouncementsLoading(true);
        setAnnouncementsError('');
        try {
            const { data } = await api.get('/announcements/sent');
            setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
        } catch (requestError) {
            setAnnouncementsError(requestError.response?.data?.message || 'Could not load recent announcements. Please try again.');
        } finally {
            setAnnouncementsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
        loadStats();
        loadAnalytics();
        loadDrives();
        loadDocuments();
        loadAnnouncements();
    }, [loadAnalytics, loadAnnouncements, loadDocuments, loadDrives, loadStats, loadUsers]);

    const updateMentorAssignment = async (student, mentor, action) => {
        setSavingUserIds((current) => [...new Set([...current, student._id])]);
        setRowErrors((current) => ({ ...current, [student._id]: '' }));
        setAssignmentFeedback('');
        try {
            const endpoint = action === 'assign' ? '/admin/assign' : '/admin/unassign';
            const { data } = await api.patch(endpoint, {
                studentIds: [student._id],
                mentorId: mentor._id,
            });
            setAssignmentFeedback(
                action === 'assign'
                    ? `${mentor.name} assigned to ${student.name}.`
                    : `${mentor.name} removed from ${student.name}.`
            );
            await Promise.all([loadUsers(), loadStats()]);
            if (data.updatedCount === 0) {
                setAssignmentFeedback(`${mentor.name} was already ${action === 'assign' ? 'assigned to' : 'unassigned from'} ${student.name}.`);
            }
        } catch (requestError) {
            setRowErrors((current) => ({
                ...current,
                [student._id]: requestError.response?.data?.message || 'Could not update this mentor assignment.',
            }));
        } finally {
            setSavingUserIds((current) => current.filter((id) => id !== student._id));
        }
    };

    const assignMentor = (student, mentorId) => {
        const mentor = mentors.find((item) => item._id === mentorId);
        if (mentor) updateMentorAssignment(student, mentor, 'assign');
    };

    const unassignMentor = (student, mentor) => updateMentorAssignment(student, mentor, 'unassign');
                <div className="mb-8">
                    {statsLoading ? (
                        <div className="card-hard p-5" role="status">
                            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Loading admin stats…</p>
                        </div>
                    ) : statsError ? (
                        <div className="card-hard flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
                            <p className="font-body text-sm text-signal">{statsError}</p>
                            <button type="button" onClick={loadStats} className="btn-secondary px-4 py-2 text-sm">Retry</button>
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 sm:gap-4">
                            <MetricCard num={stats.usersByRole?.student ?? 0} label="Students" />
                            <MetricCard num={stats.usersByRole?.mentor ?? 0} label="Mentors" />
                            <MetricCard num={stats.usersByRole?.admin ?? 0} label="Admins" />
                            <MetricCard num={stats.documentCount ?? 0} label="Documents" />
                            <MetricCard num={stats.announcementCount ?? 0} label="Announcements" />
                            <MetricCard num={stats.unassignedStudentCount ?? 0} label="Unassigned students" highlight />
                            <MetricCard num={stats.taskStats?.completed ?? 0} label="Tasks completed" />
                            <MetricCard num={stats.taskStats?.pending ?? 0} label="Tasks pending" />
                            <MetricCard num={stats.taskStats?.overdue ?? 0} label="Tasks overdue" highlight />
                            <MetricCard num={stats.taskStats?.dueInThreeDays ?? 0} label="Due in 3 days" />
                            <MetricCard num={`${stats.taskStats?.completionRate ?? 0}%`} label="Task completion" />
                            <MetricCard num={stats.taskStats?.completedThisWeek ?? 0} label="Completed this week" />
                        </div>
                    ) : (
                        <div className="card-hard p-5">
                            <p className="font-body text-sm text-ink-muted">Admin stats are not available yet.</p>
                            <button type="button" onClick={loadStats} className="btn-secondary mt-3 px-4 py-2 text-sm">Retry</button>
                        </div>
                    )}
                </div>

    const studentCount = stats?.usersByRole?.student ?? users.filter((user) => user.role === 'student').length;
    const mentorCount = stats?.usersByRole?.mentor ?? users.filter((user) => user.role === 'mentor').length;
    const adminCount = stats?.usersByRole?.admin ?? null;
    const unassignedCount = stats?.unassignedStudentCount ?? users
        .filter((user) => user.role === 'student' && !user.mentors?.length).length;
    const assignedCount = Math.max(0, studentCount - unassignedCount);
    const assignmentCoverage = studentCount > 0 ? Math.round((assignedCount / studentCount) * 100) : null;
    const riskDistribution = analytics?.riskDistribution;
    const atRiskCount = riskDistribution
        ? (riskDistribution.high || 0) + (riskDistribution.medium || 0)
        : null;

    return (
        <div className="mx-auto min-w-0 w-full max-w-6xl">
            <PageHeader
                title="Admin overview"
                subtitle="Institution-wide students, mentors, readiness and risk."
                actions={(
                    <Link to="/placement/drives" className="btn-primary w-full sm:w-auto">
                        Create placement drive
                    </Link>
                )}
            />

            {assignmentFeedback && (
                <p className="mb-4 rounded-lg border border-mint/25 bg-mint/10 px-4 py-3 font-body text-sm text-mint" role="status">
                    {assignmentFeedback}
                </p>
            )}

            <section aria-label="Institution metrics" className="mb-5 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <MetricCard
                    label="Total students"
                    value={statsLoading && usersLoading ? '…' : statsError && usersError ? '—' : studentCount}
                    hint={statsError && usersError ? statsError : 'From registered student profiles'}
                />
                <MetricCard
                    label="Total mentors"
                    value={statsLoading && usersLoading ? '…' : statsError && usersError ? '—' : mentorCount}
                    hint={statsError && usersError ? statsError : 'From registered mentor profiles'}
                />
                <MetricCard
                    label="Mentor coverage"
                    value={statsLoading && usersLoading ? '…' : assignmentCoverage == null ? '—' : `${assignmentCoverage}%`}
                    hint={`${assignedCount} of ${studentCount} students assigned`}
                />
                <MetricCard
                    label="Average readiness"
                    value={analyticsLoading ? '…' : analytics?.averageReadiness == null ? '—' : `${analytics.averageReadiness}/100`}
                    hint={analyticsError || 'Average across students returned by mentor analytics'}
                />
                <MetricCard
                    label="At-risk students"
                    value={analyticsLoading ? '…' : atRiskCount == null ? '—' : atRiskCount}
                    hint={analyticsError || 'High and medium risk from analytics'}
                />
            </section>

            <div className="mb-5 grid min-w-0 gap-4 lg:grid-cols-2">
                {analyticsLoading ? (
                    <Card className="space-y-4 p-5" aria-label="Loading risk distribution">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </Card>
                ) : analyticsError ? (
                    <ErrorState message={analyticsError} onRetry={loadAnalytics} />
                ) : (
                    <RiskDistribution distribution={riskDistribution} contextLabel="Institution overview" />
                )}
                <UserManagementCard
                    users={users}
                    mentors={mentors}
                    adminCount={adminCount}
                    loading={usersLoading}
                    error={usersError}
                    onRetry={loadUsers}
                    search={search}
                    onSearchChange={setSearch}
                    onAssign={assignMentor}
                    onUnassign={unassignMentor}
                    savingUserIds={savingUserIds}
                    rowErrors={rowErrors}
                />
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <DrivesCard drives={drives} loading={drivesLoading} error={drivesError} onRetry={loadDrives} />
                <DocumentsCard documents={documents} loading={documentsLoading} error={documentsError} onRetry={loadDocuments} />
            </div>
            <div className="mt-4">
                <AnnouncementsCard
                    announcements={announcements}
                    loading={announcementsLoading}
                    error={announcementsError}
                    onRetry={loadAnnouncements}
                />
            </div>
        </div>
    );
}
