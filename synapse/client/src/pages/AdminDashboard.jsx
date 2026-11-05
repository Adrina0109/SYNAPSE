import { useCallback, useEffect, useMemo, useState } from 'react';
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
        }
    }, []);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        setStatsError('');
        try {
            const { data } = await api.get('/admin/stats');
            setStats(data.stats ?? null);
        } catch (requestError) {
            setStatsError(requestError.response?.data?.message || 'Could not load institution stats. Please try again.');
        } finally {
            setStatsLoading(false);
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
