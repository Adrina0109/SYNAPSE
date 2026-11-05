import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api.js';
import RiskDistribution from '../components/mentor/RiskDistribution.jsx';
import StudentDetailDrawer from '../components/mentor/StudentDetailDrawer.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

const RISK_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
];

const riskTone = (riskLevel) => (
    riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : riskLevel === 'low' ? 'success' : 'neutral'
);

const formatStudentProgress = (student) => {
    if (Number.isFinite(student.roadmapProgress)) return student.roadmapProgress;
    if (Number.isFinite(student.averageRoadmapProgress)) return student.averageRoadmapProgress;
    return null;
};

const LoadingStudents = () => (
    <div className="space-y-3 p-4" role="status" aria-label="Loading assigned students">
        {[0, 1, 2].map((item) => (
            <Card key={item} className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20" />
            </Card>
        ))}
    </div>
);

export default function MentorDashboard() {
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [studentsError, setStudentsError] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState('');
    const [search, setSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [broadcastOpen, setBroadcastOpen] = useState(false);
    const [broadcast, setBroadcast] = useState({
        title: '',
        description: '',
        deadline: '',
        category: 'personal',
        estimatedHours: '1',
    });
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [broadcastError, setBroadcastError] = useState('');
    const [broadcastFeedback, setBroadcastFeedback] = useState('');
    const openerRef = useRef(null);

    const loadStudents = useCallback(async () => {
        setStudentsLoading(true);
        setStudentsError('');
        try {
            const { data } = await api.get('/mentor/students');
            setStudents(Array.isArray(data.students) ? data.students : []);
        } catch (error) {
            setStudentsError(error.response?.data?.message || 'Could not load assigned students. Please try again.');
        } finally {
            setStudentsLoading(false);
        }
    }, []);

    const loadAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const { data } = await api.get('/mentor/analytics');
            setAnalytics(data.analytics ?? null);
        } catch (error) {
            setAnalyticsError(error.response?.data?.message || 'Could not load class analytics. Please try again.');
        } finally {
            setAnalyticsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStudents();
        loadAnalytics();
    }, [loadAnalytics, loadStudents]);

    const openStudent = async (student) => {
        if (!selectedStudent) openerRef.current = document.activeElement;
        setSelectedStudent(student);
        setStudentDetail(null);
        setDetailError('');
        setSummary(null);
        setSummaryError('');
        setDetailLoading(true);
        try {
            const { data } = await api.get(`/mentor/students/${student._id}`);
            setStudentDetail(data.student ?? null);
        } catch (error) {
            setDetailError(error.response?.data?.message || 'Could not load student details. Please try again.');
        } finally {
            setDetailLoading(false);
        }
    };

    const generateSummary = async () => {
        if (!selectedStudent) return;
        setSummaryLoading(true);
        setSummaryError('');
        setSummary(null);
        try {
            const { data } = await api.post(`/mentor/students/${selectedStudent._id}/summary`);
            setSummary(data.summary ?? null);
        } catch (error) {
            setSummaryError(error.response?.data?.message || 'Could not generate the student summary. Please try again.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const submitBroadcast = async (event) => {
        event.preventDefault();
        setBroadcastLoading(true);
        setBroadcastError('');
        setBroadcastFeedback('');
        try {
            const { data } = await api.post('/mentor/broadcast', {
                ...broadcast,
                deadline: broadcast.deadline ? new Date(broadcast.deadline).toISOString() : null,
                estimatedHours: Number(broadcast.estimatedHours),
            });
            setBroadcastFeedback(`Task sent to ${data.count} student${data.count === 1 ? '' : 's'}.`);
            setBroadcast({
                title: '',
                description: '',
                deadline: '',
                category: 'personal',
                estimatedHours: '1',
            });
        } catch (error) {
            setBroadcastError(error.response?.data?.message || 'Could not broadcast this task. Please try again.');
        } finally {
            setBroadcastLoading(false);
        }
    };

    const studentTotals = useMemo(() => ({
        overdue: students.reduce((sum, student) => sum + (student.overdueTaskCount || 0), 0),
        atRisk: students.filter((student) => ['high', 'medium'].includes(student.risk?.riskLevel)).length,
    }), [students]);

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return students.filter((student) => {
            const matchesRisk = riskFilter === 'all' || student.risk?.riskLevel === riskFilter;
            const searchable = `${student.name || ''} ${student.email || ''} ${student.department || ''}`.toLocaleLowerCase();
            return matchesRisk && (!query || searchable.includes(query));
        });
    }, [riskFilter, search, students]);

    const riskCounts = useMemo(() => ({
        all: students.length,
        high: students.filter((student) => student.risk?.riskLevel === 'high').length,
        medium: students.filter((student) => student.risk?.riskLevel === 'medium').length,
        low: students.filter((student) => student.risk?.riskLevel === 'low').length,
    }), [students]);

    const closeStudent = useCallback(() => setSelectedStudent(null), []);
    const handleRetryDetail = () => {
        if (selectedStudent) openStudent(selectedStudent);
    };

    return (
        <div className="mx-auto w-full max-w-6xl">
            <PageHeader
                title="Mentor dashboard"
                subtitle="Your assigned students, their risk and what needs attention."
                actions={(
                    <button
                        type="button"
                        onClick={() => {
                            setBroadcastOpen((open) => !open);
                            setBroadcastError('');
                            setBroadcastFeedback('');
                        }}
                        className="btn-primary w-full sm:w-auto"
                        aria-expanded={broadcastOpen}
                        aria-controls="broadcast-form"
                    >
                        {broadcastOpen ? 'Close broadcast' : 'Broadcast task'}
                    </button>
                )}
            />

            {broadcastOpen && (
                <Card className="mb-5 p-4 sm:p-6" header={(
                    <div>
                        <p className="section-label mb-1">Share with your assigned students</p>
                        <h2 className="font-display text-xl font-semibold text-text">Broadcast a task</h2>
                    </div>
                )}>
                    <div id="broadcast-form" className="space-y-4 p-4 sm:p-6">
                        {broadcastFeedback && (
                            <p className="rounded-lg border border-mint/25 bg-mint/10 px-4 py-3 font-body text-sm text-mint" role="status">
                                {broadcastFeedback}
                            </p>
                        )}
                        {broadcastError && <ErrorState message={broadcastError} />}
                        <form onSubmit={submitBroadcast} className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="broadcast-title" className="mb-1 block font-body text-sm font-medium text-text">Title</label>
                                <input id="broadcast-title" required maxLength={200} value={broadcast.title} onChange={(event) => setBroadcast({ ...broadcast, title: event.target.value })} className="input-base" />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="broadcast-description" className="mb-1 block font-body text-sm font-medium text-text">Description</label>
                                <textarea id="broadcast-description" rows={3} maxLength={2000} value={broadcast.description} onChange={(event) => setBroadcast({ ...broadcast, description: event.target.value })} className="input-base resize-y" />
                            </div>
                            <div>
                                <label htmlFor="broadcast-deadline" className="mb-1 block font-body text-sm font-medium text-text">Deadline</label>
                                <input id="broadcast-deadline" type="datetime-local" value={broadcast.deadline} onChange={(event) => setBroadcast({ ...broadcast, deadline: event.target.value })} className="input-base min-w-0" />
                            </div>
                            <div>
                                <label htmlFor="broadcast-category" className="mb-1 block font-body text-sm font-medium text-text">Category</label>
                                <select id="broadcast-category" value={broadcast.category} onChange={(event) => setBroadcast({ ...broadcast, category: event.target.value })} className="input-base">
                                    {['assessment', 'assignment', 'placement', 'event', 'personal'].map((category) => <option key={category} value={category}>{category}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="broadcast-hours" className="mb-1 block font-body text-sm font-medium text-text">Estimated hours</label>
                                <input id="broadcast-hours" type="number" min="0" max="100" step="0.5" required value={broadcast.estimatedHours} onChange={(event) => setBroadcast({ ...broadcast, estimatedHours: event.target.value })} className="input-base" />
                            </div>
                            <div className="flex items-end">
                                <button type="submit" disabled={broadcastLoading || students.length === 0} className="btn-primary w-full sm:w-auto">
                                    {broadcastLoading ? 'Sending…' : 'Send to assigned students'}
                                </button>
                            </div>
                            {students.length === 0 && !studentsLoading && (
                                <p className="font-body text-xs text-text-faint sm:col-span-2">Assign students before broadcasting a task.</p>
                            )}
                        </form>
                    </div>
                </Card>
            )}

            <section aria-label="Mentor summary metrics" className="mb-5 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3">
                <MetricCard
                    label="Assigned students"
                    value={studentsLoading ? '…' : studentsError ? '—' : students.length}
                    hint={studentsError || 'Students assigned to you'}
                />
                <MetricCard
                    label="At-risk students"
                    value={studentsLoading ? '…' : studentsError ? '—' : studentTotals.atRisk}
                    hint={studentsError || 'High and medium risk'}
                />
                <MetricCard
                    label="Overdue tasks"
                    value={studentsLoading ? '…' : studentsError ? '—' : studentTotals.overdue}
                    hint={studentsError || 'Across your assigned students'}
                />
                {Number.isFinite(analytics?.averageRoadmapProgress) && (
                    <MetricCard
                        label="Average roadmap progress"
                        value={`${analytics.averageRoadmapProgress}%`}
                        hint="Across assigned students"
                    />
                )}
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
                    <RiskDistribution distribution={analytics?.riskDistribution} />
                )}
                <Card className="flex min-w-0 flex-col justify-between gap-3 p-4 sm:p-5">
                    <div>
                        <p className="section-label mb-1">Class overview</p>
                        <h2 className="font-display text-xl font-semibold text-text">Task completion</h2>
                    </div>
                    {analyticsLoading ? (
                        <div role="status" aria-label="Loading task completion">
                            <Skeleton className="h-3 w-full" />
                        </div>
                    ) : analyticsError ? (
                        <p className="font-body text-sm text-danger" role="alert">{analyticsError}</p>
                    ) : analytics ? (
                        <ProgressBar value={analytics.taskCompletionRate} label="Assigned task completion" />
                    ) : (
                        <p className="font-body text-sm text-text-muted">Analytics are not available yet.</p>
                    )}
                </Card>
            </div>

            <section className="card-hard min-w-0 overflow-hidden" aria-labelledby="students-heading">
                <header className="border-b border-border p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">Assigned to you</p>
                            <h2 id="students-heading" className="font-display text-xl font-semibold text-text">Student roster</h2>
                        </div>
                        <button type="button" onClick={loadStudents} className="btn-secondary px-3 py-2 text-sm" disabled={studentsLoading}>
                            {studentsLoading ? 'Refreshing…' : 'Refresh'}
                        </button>
                    </div>
                    {!studentsLoading && !studentsError && students.length > 0 && (
                        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                            <div>
                                <label htmlFor="student-search" className="sr-only">Search assigned students</label>
                                <input
                                    id="student-search"
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    className="input-base"
                                    placeholder="Search name, email or department"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by risk">
                                {RISK_FILTERS.map((filter) => (
                                    <button
                                        key={filter.key}
                                        type="button"
                                        onClick={() => setRiskFilter(filter.key)}
                                        aria-pressed={riskFilter === filter.key}
                                        className={`rounded-full border px-3 py-2 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                                            riskFilter === filter.key
                                                ? 'border-accent bg-accent-soft text-accent'
                                                : 'border-border-strong bg-surface text-text-muted hover:bg-surface-2'
                                        }`}
                                    >
                                        {filter.label} <span className="ml-1">{riskCounts[filter.key]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </header>

                {studentsLoading ? (
                    <LoadingStudents />
                ) : studentsError ? (
                    <div className="p-4 sm:p-5"><ErrorState message={studentsError} onRetry={loadStudents} /></div>
                ) : students.length === 0 ? (
                    <div className="p-4 sm:p-5">
                        <EmptyState
                            title="No assigned students"
                            body="Students assigned to you by an administrator will appear here. This roster only includes students assigned to your mentor account."
                        />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="p-4 sm:p-5">
                        <EmptyState title="No matching students" body="Try a different search term or risk filter." />
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full table-fixed text-left">
                                <caption className="sr-only">Students assigned to this mentor</caption>
                                <thead className="border-b border-border bg-surface-2 font-mono text-[10px] uppercase tracking-wider text-text-faint">
                                    <tr>
                                        <th scope="col" className="w-[20%] px-4 py-3 font-normal">Student</th>
                                        <th scope="col" className="w-[15%] px-4 py-3 font-normal">Department</th>
                                        <th scope="col" className="w-[12%] px-4 py-3 font-normal">Risk</th>
                                        <th scope="col" className="w-[17%] px-4 py-3 font-normal">Roadmap progress</th>
                                        <th scope="col" className="w-[10%] px-4 py-3 font-normal">Readiness</th>
                                        <th scope="col" className="w-[13%] px-4 py-3 font-normal">Tasks</th>
                                        <th scope="col" className="w-[13%] px-4 py-3 text-right font-normal">Open</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredStudents.map((student) => {
                                        const progress = formatStudentProgress(student);
                                        return (
                                            <tr key={student._id} className="align-middle hover:bg-surface-2/50">
                                                <td className="px-4 py-4">
                                                    <p className="break-words font-body text-sm font-semibold text-text">{student.name}</p>
                                                    <p className="break-all font-mono text-[10px] text-text-faint">{student.email}</p>
                                                </td>
                                                <td className="break-words px-4 py-4 font-body text-xs text-text-muted">{student.department || '—'}</td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge tone={riskTone(student.risk?.riskLevel)} label={`${student.risk?.riskLevel || 'unknown'} risk`} />
                                                </td>
                                                <td className="px-4 py-4">
                                                    {progress == null ? (
                                                        <span className="font-mono text-xs text-text-faint" aria-label="Roadmap progress not provided">Not provided</span>
                                                    ) : (
                                                        <ProgressBar value={progress} label="Roadmap progress" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 font-mono text-sm text-text">
                                                    {student.readiness?.score ?? '—'}{student.readiness ? '/100' : ''}
                                                </td>
                                                <td className="px-4 py-4 font-mono text-xs">
                                                    <p className="text-text-muted">{student.pendingTaskCount || 0} pending</p>
                                                    <p className={`mt-1 ${(student.overdueTaskCount || 0) > 0 ? 'text-danger' : 'text-text-faint'}`}>
                                                        {student.overdueTaskCount || 0} overdue
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <button type="button" onClick={() => openStudent(student)} className="btn-secondary whitespace-nowrap px-3 py-2 text-xs">
                                                        Open
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <ul className="space-y-3 p-3 md:hidden">
                            {filteredStudents.map((student) => {
                                const progress = formatStudentProgress(student);
                                return (
                                    <li key={student._id}>
                                        <Card className="space-y-4 p-4">
                                            <div className="flex min-w-0 items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="break-words font-display text-lg font-semibold text-text">{student.name}</p>
                                                    <p className="break-all font-mono text-xs text-text-faint">{student.email}</p>
                                                    <p className="mt-1 break-words font-body text-xs text-text-muted">{student.department || 'Department not provided'}</p>
                                                </div>
                                                <StatusBadge tone={riskTone(student.risk?.riskLevel)} label={`${student.risk?.riskLevel || 'unknown'} risk`} />
                                            </div>
                                            {progress == null ? (
                                                <p className="font-body text-xs text-text-faint">Roadmap progress not provided by the roster endpoint.</p>
                                            ) : (
                                                <ProgressBar value={progress} label="Roadmap progress" />
                                            )}
                                            <div className="grid grid-cols-2 gap-2 border-y border-border py-3">
                                                <div>
                                                    <p className="section-label mb-1">Readiness</p>
                                                    <p className="font-mono text-sm text-text">{student.readiness?.score ?? '—'}{student.readiness ? '/100' : ''}</p>
                                                </div>
                                                <div>
                                                    <p className="section-label mb-1">Tasks</p>
                                                    <p className="font-mono text-xs text-text-muted">{student.pendingTaskCount || 0} pending</p>
                                                    <p className={`font-mono text-xs ${(student.overdueTaskCount || 0) > 0 ? 'text-danger' : 'text-text-faint'}`}>
                                                        {student.overdueTaskCount || 0} overdue
                                                    </p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => openStudent(student)} className="btn-secondary w-full">
                                                Open student details
                                            </button>
                                        </Card>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </section>

            {selectedStudent && (
                <StudentDetailDrawer
                    student={studentDetail}
                    openerRef={openerRef}
                    loading={detailLoading}
                    error={detailError}
                    summary={summary}
                    summaryLoading={summaryLoading}
                    summaryError={summaryError}
                    onClose={closeStudent}
                    onRetry={handleRetryDetail}
                    onGenerateSummary={generateSummary}
                />
            )}
        </div>
    );
}
