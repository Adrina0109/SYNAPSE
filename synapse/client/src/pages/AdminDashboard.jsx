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

const isUpcoming = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
};

function ResourceSkeleton({ label }) {
    return (
        <div className="space-y-3 p-4" role="status" aria-label={label}>
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
        </div>
    );
}

function ResourceCardHeader({ eyebrow, title, action }) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
            <div className="min-w-0">
                <p className="section-label mb-1">{eyebrow}</p>
                <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
            </div>
            {action}
        </header>
    );
}

function DrivesCard({ drives, loading, error, onRetry }) {
    const upcoming = useMemo(() => drives
        .filter((drive) => isUpcoming(drive.date))
        .sort((left, right) => new Date(left.date) - new Date(right.date))
        .slice(0, 4), [drives]);

    return (
        <Card className="min-w-0 overflow-hidden">
            <ResourceCardHeader
                eyebrow="Hiring activity"
                title="Upcoming placement drives"
                action={<Link to="/placement/drives" className="btn-secondary px-3 py-2 text-sm">View all</Link>}
            />
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
                            <StatusBadge
                                tone={drive.status === 'open' ? 'success' : 'neutral'}
                                label={drive.status || 'Unknown'}
                            />
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
            <ResourceCardHeader
                eyebrow="Knowledge library"
                title="Recent documents"
                action={<Link to="/documents" className="btn-secondary px-3 py-2 text-sm">View all</Link>}
            />
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
                                <p className="mt-1 font-body text-xs capitalize text-text-muted">{document.category || 'Uncategorized'}</p>
                                <p className="mt-2 font-mono text-xs text-text-faint">
                                    {document.chunkCount ?? '—'} chunks · {formatDate(document.createdAt)}
                                </p>
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
            <ResourceCardHeader eyebrow="Communications" title="Recent announcements" />
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
                                <p className="line-clamp-2 whitespace-pre-wrap break-words font-body text-sm text-text">
                                    {announcement.rawText}
                                </p>
                                <p className="mt-2 font-mono text-xs text-text-faint">
                                    {announcement.sourceType?.replaceAll('_', ' ') || 'Announcement'} · {announcement.recipientCount ?? '—'} recipients
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

function MetricSkeleton({ label }) {
    return (
        <div className="card-hard min-w-0 space-y-3 p-4 sm:p-5" role="status" aria-label={`Loading ${label}`}>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-3 w-4/5" />
        </div>
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
    const [savingUserIds, setSavingUserIds] = useState([]);
    const [rowErrors, setRowErrors] = useState({});
    const [assignmentFeedback, setAssignmentFeedback] = useState('');

    const requestIds = useRef({
        users: 0,
        stats: 0,
        analytics: 0,
        drives: 0,
        documents: 0,
        announcements: 0,
    });
    const loaded = useRef({
        users: false,
        stats: false,
        analytics: false,
        drives: false,
        documents: false,
        announcements: false,
    });

    const loadUsers = useCallback(async () => {
        const requestId = ++requestIds.current.users;
        if (!loaded.current.users) setUsersLoading(true);
        setUsersError('');
        try {
            const [studentsResponse, mentorsResponse] = await Promise.all([
                api.get('/admin/users', { params: { role: 'student' } }),
                api.get('/admin/mentors'),
            ]);
            if (requestId !== requestIds.current.users) return;
            const students = Array.isArray(studentsResponse.data.users) ? studentsResponse.data.users : [];
            const mentorProfiles = Array.isArray(mentorsResponse.data.mentors)
                ? mentorsResponse.data.mentors
                : [];
            setUsers([...students, ...mentorProfiles].sort((left, right) => left.name.localeCompare(right.name)));
            setMentors(mentorProfiles);
            loaded.current.users = true;
        } catch (requestError) {
            if (requestId === requestIds.current.users) {
                setUsersError(requestError.response?.data?.message || 'Could not load users. Please try again.');
            }
        } finally {
            if (requestId === requestIds.current.users) setUsersLoading(false);
        }
    }, []);

    const loadStats = useCallback(async () => {
        const requestId = ++requestIds.current.stats;
        if (!loaded.current.stats) setStatsLoading(true);
        setStatsError('');
        try {
            const { data } = await api.get('/admin/stats');
            if (requestId === requestIds.current.stats) {
                setStats(data.stats ?? null);
                loaded.current.stats = true;
            }
        } catch (requestError) {
            if (requestId === requestIds.current.stats) {
                setStatsError(requestError.response?.data?.message || 'Could not load institution metrics.');
            }
        } finally {
            if (requestId === requestIds.current.stats) setStatsLoading(false);
        }
    }, []);

    const loadAnalytics = useCallback(async () => {
        const requestId = ++requestIds.current.analytics;
        if (!loaded.current.analytics) setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const { data } = await api.get('/mentor/analytics');
            if (requestId === requestIds.current.analytics) {
                setAnalytics(data.analytics ?? null);
                loaded.current.analytics = true;
            }
        } catch (requestError) {
            if (requestId === requestIds.current.analytics) {
                setAnalyticsError(requestError.response?.data?.message || 'Could not load readiness and risk analytics.');
            }
        } finally {
            if (requestId === requestIds.current.analytics) setAnalyticsLoading(false);
        }
    }, []);

    const loadDrives = useCallback(async () => {
        const requestId = ++requestIds.current.drives;
        if (!loaded.current.drives) setDrivesLoading(true);
        setDrivesError('');
        try {
            const { data } = await api.get('/placement/drives');
            if (requestId === requestIds.current.drives) {
                setDrives(Array.isArray(data.drives) ? data.drives : []);
                loaded.current.drives = true;
            }
        } catch (requestError) {
            if (requestId === requestIds.current.drives) {
                setDrivesError(requestError.response?.data?.message || 'Could not load placement drives.');
            }
        } finally {
            if (requestId === requestIds.current.drives) setDrivesLoading(false);
        }
    }, []);

    const loadDocuments = useCallback(async () => {
        const requestId = ++requestIds.current.documents;
        if (!loaded.current.documents) setDocumentsLoading(true);
        setDocumentsError('');
        try {
            const { data } = await api.get('/documents');
            if (requestId === requestIds.current.documents) {
                setDocuments(Array.isArray(data.documents) ? data.documents : []);
                loaded.current.documents = true;
            }
        } catch (requestError) {
            if (requestId === requestIds.current.documents) {
                setDocumentsError(requestError.response?.data?.message || 'Could not load documents.');
            }
        } finally {
            if (requestId === requestIds.current.documents) setDocumentsLoading(false);
        }
    }, []);

    const loadAnnouncements = useCallback(async () => {
        const requestId = ++requestIds.current.announcements;
        if (!loaded.current.announcements) setAnnouncementsLoading(true);
        setAnnouncementsError('');
        try {
            const { data } = await api.get('/announcements/sent');
            if (requestId === requestIds.current.announcements) {
                setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
                loaded.current.announcements = true;
            }
        } catch (requestError) {
            if (requestId === requestIds.current.announcements) {
                setAnnouncementsError(requestError.response?.data?.message || 'Could not load recent announcements.');
            }
        } finally {
            if (requestId === requestIds.current.announcements) setAnnouncementsLoading(false);
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
            setAssignmentFeedback(action === 'assign'
                ? `${mentor.name} assigned to ${student.name}.`
                : `${mentor.name} removed from ${student.name}.`);
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
    const adminCount = stats?.usersByRole?.admin;
    const unassignedCount = stats?.unassignedStudentCount;
    const assignedCount = unassignedCount == null ? null : Math.max(0, studentCount - unassignedCount);
    const assignmentCoverage = studentCount > 0 && assignedCount != null
        ? Math.round((assignedCount / studentCount) * 100)
        : null;
    const riskDistribution = analytics?.riskDistribution;
    const atRiskCount = riskDistribution
        ? (riskDistribution.high ?? 0) + (riskDistribution.medium ?? 0)
        : null;
    const userProfilesLoaded = !usersLoading && !usersError;
    const studentMetricValue = stats?.usersByRole?.student ?? (userProfilesLoaded ? studentCount : null);
    const mentorMetricValue = stats?.usersByRole?.mentor ?? (userProfilesLoaded ? mentorCount : null);

    const metricCards = [
        {
            label: 'Total students',
            value: studentMetricValue ?? 'Unavailable',
            hint: studentMetricValue == null ? statsError || usersError || 'Student count unavailable' : 'Registered student profiles',
            loading: studentMetricValue == null && (statsLoading || usersLoading),
        },
        {
            label: 'Total mentors',
            value: mentorMetricValue ?? 'Unavailable',
            hint: mentorMetricValue == null ? statsError || usersError || 'Mentor count unavailable' : 'Registered mentor profiles',
            loading: mentorMetricValue == null && (statsLoading || usersLoading),
        },
        {
            label: 'Mentor coverage',
            value: assignmentCoverage == null ? '—' : `${assignmentCoverage}%`,
            hint: assignedCount == null ? statsError || 'Assignment totals unavailable' : `${assignedCount} of ${studentCount} students assigned`,
            loading: statsLoading && !stats,
        },
        {
            label: 'Average readiness',
            value: analytics?.averageReadiness == null ? '—' : `${analytics.averageReadiness}/100`,
            hint: analyticsError || 'Average across students in institution analytics',
            loading: analyticsLoading && !analytics,
        },
        {
            label: 'At-risk students',
            value: atRiskCount == null ? '—' : atRiskCount,
            hint: analyticsError || 'High and medium risk from institution analytics',
            loading: analyticsLoading && !analytics,
        },
    ];

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
                {metricCards.map((metric) => metric.loading ? (
                    <MetricSkeleton key={metric.label} label={metric.label.toLowerCase()} />
                ) : (
                    <MetricCard key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
            </section>

            <div className="mb-5 grid min-w-0 gap-4 lg:grid-cols-2">
                {analyticsLoading && !analytics ? (
                    <Card className="min-w-0 space-y-4 p-4 sm:p-5" aria-label="Loading risk distribution">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </Card>
                ) : analyticsError && !analytics ? (
                    <Card className="min-w-0 p-4 sm:p-5">
                        <div>
                            <p className="section-label mb-1">Institution overview</p>
                            <h2 className="mb-4 font-display text-xl font-semibold text-text">Risk distribution</h2>
                            <ErrorState message={analyticsError} onRetry={loadAnalytics} />
                        </div>
                    </Card>
                ) : analytics ? (
                    <RiskDistribution distribution={riskDistribution} contextLabel="Institution overview" />
                ) : (
                    <Card className="min-w-0 p-4 sm:p-5">
                        <EmptyState title="Risk data unavailable" body="The analytics response did not include risk distribution." />
                    </Card>
                )}
                <UserManagementCard
                    users={users}
                    mentors={mentors}
                    adminCount={adminCount}
                    loading={usersLoading}
                    error={usersError}
                    onRetry={loadUsers}
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
