import { useCallback, useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const riskTone = {
    high: 'border-signal/40 bg-signal/10 text-signal',
    medium: 'border-amber-500/40 bg-amber-500/10 text-amber-800',
    low: 'border-forest/30 bg-forest/10 text-forest',
};

const RiskBadge = ({ risk }) => {
    const level = ['high', 'medium', 'low'].includes(risk?.riskLevel) ? risk.riskLevel : 'low';
    return (
        <span className={`inline-flex rounded-sm border px-2 py-1 font-mono text-xs uppercase ${riskTone[level]}`}>
            {level} risk
        </span>
    );
};

const Loading = ({ label }) => (
    <div className="flex items-center gap-3 py-6" role="status">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
        <span className="font-mono text-xs uppercase tracking-widest text-ink-faint">{label}</span>
    </div>
);

const dateLabel = (value) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Deadline unavailable'
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function MentorDashboard() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [studentsError, setStudentsError] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [analyticsError, setAnalyticsError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
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
        pending: students.reduce((sum, student) => sum + (student.pendingTaskCount || 0), 0),
        overdue: students.reduce((sum, student) => sum + (student.overdueTaskCount || 0), 0),
    }), [students]);
    const riskDistribution = analytics?.riskDistribution ?? { low: 0, medium: 0, high: 0 };
    const riskTotal = ['high', 'medium', 'low'].reduce((sum, risk) => sum + (riskDistribution[risk] || 0), 0);

    return (
        <div className="min-h-screen bg-paper">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
                <header className="mb-6">
                    <p className="section-label mb-2 text-signal">Mentor view</p>
                    <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Your batch.</h1>
                    <p className="mt-2 font-body text-sm text-ink-muted">
                        {user?.department || 'Mentor dashboard'} · {students.length} assigned student{students.length === 1 ? '' : 's'}
                    </p>
                </header>

                <section className="card-hard mb-6 p-4 sm:p-5" aria-labelledby="analytics-heading">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">Class overview</p>
                            <h2 id="analytics-heading" className="font-display text-xl font-semibold text-ink">Analytics</h2>
                        </div>
                        <button type="button" className="btn-ghost text-sm" onClick={loadAnalytics}>Refresh</button>
                    </div>
                    {analyticsLoading ? (
                        <Loading label="Loading analytics" />
                    ) : analyticsError ? (
                        <div role="alert">
                            <p className="mb-3 font-body text-sm text-signal">{analyticsError}</p>
                            <button type="button" onClick={loadAnalytics} className="btn-secondary px-4 py-2 text-sm">Retry</button>
                        </div>
                    ) : analytics ? (
                        <div className="grid gap-5 sm:grid-cols-3">
                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-body text-sm text-ink-muted">Task completion</span>
                                    <strong className="font-display text-2xl text-ink">{analytics.taskCompletionRate ?? 0}%</strong>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden bg-ink/10" role="progressbar" aria-label="Task completion rate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analytics.taskCompletionRate ?? 0}>
                                    <div className="h-full bg-forest" style={{ width: `${Math.min(100, Math.max(0, analytics.taskCompletionRate ?? 0))}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-body text-sm text-ink-muted">Average readiness</span>
                                    <strong className="font-display text-2xl text-ink">{analytics.averageReadiness ?? 0}<span className="font-mono text-xs">/100</span></strong>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden bg-ink/10" role="progressbar" aria-label="Average readiness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analytics.averageReadiness ?? 0}>
                                    <div className="h-full bg-signal" style={{ width: `${Math.min(100, Math.max(0, analytics.averageReadiness ?? 0))}%` }} />
                                </div>
                            </div>
                            <div>
                                <p className="mb-2 font-body text-sm text-ink-muted">Risk distribution</p>
                                {riskTotal === 0 ? (
                                    <p className="font-mono text-xs text-ink-faint">No risk data yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {['high', 'medium', 'low'].map((risk) => {
                                            const count = riskDistribution[risk] || 0;
                                            const width = (count / riskTotal) * 100;
                                            const color = risk === 'high' ? 'bg-signal' : risk === 'medium' ? 'bg-amber-500' : 'bg-forest';
                                            return (
                                                <div key={risk} className="grid grid-cols-[3.5rem_1fr_1.5rem] items-center gap-2">
                                                    <span className="font-mono text-[10px] uppercase text-ink-faint">{risk}</span>
                                                    <div className="h-2 overflow-hidden bg-ink/10" role="img" aria-label={`${count} ${risk} risk students`}>
                                                        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
                                                    </div>
                                                    <span className="text-right font-mono text-xs text-ink">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="font-body text-sm text-ink-muted">Analytics are not available yet.</p>
                    )}
                </section>

                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    <div className="card-hard p-4 text-center sm:p-5">
                        <p className="font-display text-3xl font-bold text-ink">{students.length}</p>
                        <p className="section-label mt-1">Students</p>
                    </div>
                    <div className="card-hard p-4 text-center sm:p-5">
                        <p className="font-display text-3xl font-bold text-forest">{studentTotals.pending}</p>
                        <p className="section-label mt-1">Pending tasks</p>
                    </div>
                    <div className="card-hard col-span-2 p-4 text-center sm:col-span-1 sm:p-5">
                        <p className="font-display text-3xl font-bold text-signal">{studentTotals.overdue}</p>
                        <p className="section-label mt-1">Overdue tasks</p>
                    </div>
                </div>

                <section className="card-hard mb-6 overflow-hidden" aria-labelledby="students-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-4 sm:px-5">
                        <h2 id="students-heading" className="font-display text-xl font-semibold text-ink">Assigned students</h2>
                        <button type="button" onClick={loadStudents} className="btn-ghost text-sm">Refresh</button>
                    </div>
                    {studentsLoading ? (
                        <div className="px-5"><Loading label="Loading students" /></div>
                    ) : studentsError ? (
                        <div className="px-5 py-6 text-center" role="alert">
                            <p className="mb-3 font-body text-sm text-signal">{studentsError}</p>
                            <button type="button" onClick={loadStudents} className="btn-secondary px-4 py-2 text-sm">Try again</button>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                            <p className="font-display text-lg font-semibold text-ink">No students assigned yet</p>
                            <p className="mt-2 font-body text-sm text-ink-muted">Students assigned by an admin will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-left">
                                <thead>
                                    <tr className="border-b border-ink/10 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                                        <th className="px-4 py-3 font-normal">Student</th>
                                        <th className="px-4 py-3 font-normal">Risk</th>
                                        <th className="px-4 py-3 font-normal">Tasks</th>
                                        <th className="px-4 py-3 font-normal">Readiness</th>
                                        <th className="px-4 py-3 font-normal"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink/10">
                                    {students.map((student) => (
                                        <tr key={student._id} className="align-top">
                                            <td className="px-4 py-4">
                                                <p className="font-body text-sm font-semibold text-ink">{student.name}</p>
                                                <p className="break-all font-mono text-xs text-ink-faint">{student.email}</p>
                                                {student.risk?.reasons?.length > 0 && (
                                                    <ul className="mt-2 space-y-1">
                                                        {student.risk.reasons.map((reason) => <li key={reason} className="font-body text-xs text-ink-muted">· {reason}</li>)}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="px-4 py-4"><RiskBadge risk={student.risk} /></td>
                                            <td className="px-4 py-4">
                                                <p className="whitespace-nowrap font-mono text-xs text-ink">{student.pendingTaskCount || 0} pending</p>
                                                <p className="mt-1 whitespace-nowrap font-mono text-xs text-signal">{student.overdueTaskCount || 0} overdue</p>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-sm text-ink">{student.readiness?.score ?? '—'}{student.readiness ? '/100' : ''}</td>
                                            <td className="px-4 py-4">
                                                <button type="button" onClick={() => openStudent(student)} className="btn-secondary whitespace-nowrap px-3 py-2 text-xs">
                                                    View details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="card-hard p-4 sm:p-5" aria-labelledby="broadcast-heading">
                    <p className="section-label mb-1">Share with your batch</p>
                    <h2 id="broadcast-heading" className="mb-4 font-display text-xl font-semibold text-ink">Broadcast a task</h2>
                    {broadcastFeedback && <p className="mb-4 border border-forest/30 bg-forest/10 px-4 py-3 font-body text-sm text-forest" role="status">{broadcastFeedback}</p>}
                    {broadcastError && <p className="mb-4 border border-signal/30 bg-signal/10 px-4 py-3 font-body text-sm text-signal" role="alert">{broadcastError}</p>}
                    <form onSubmit={submitBroadcast} className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="broadcast-title" className="mb-1 block font-body text-sm font-medium text-ink">Title</label>
                            <input id="broadcast-title" required maxLength={200} value={broadcast.title} onChange={(event) => setBroadcast({ ...broadcast, title: event.target.value })} className="input-base" />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="broadcast-description" className="mb-1 block font-body text-sm font-medium text-ink">Description</label>
                            <textarea id="broadcast-description" rows={3} maxLength={2000} value={broadcast.description} onChange={(event) => setBroadcast({ ...broadcast, description: event.target.value })} className="input-base resize-y" />
                        </div>
                        <div>
                            <label htmlFor="broadcast-deadline" className="mb-1 block font-body text-sm font-medium text-ink">Deadline</label>
                            <input id="broadcast-deadline" type="datetime-local" value={broadcast.deadline} onChange={(event) => setBroadcast({ ...broadcast, deadline: event.target.value })} className="input-base min-w-0" />
                        </div>
                        <div>
                            <label htmlFor="broadcast-category" className="mb-1 block font-body text-sm font-medium text-ink">Category</label>
                            <select id="broadcast-category" value={broadcast.category} onChange={(event) => setBroadcast({ ...broadcast, category: event.target.value })} className="input-base">
                                {['assessment', 'assignment', 'placement', 'event', 'personal'].map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="broadcast-hours" className="mb-1 block font-body text-sm font-medium text-ink">Estimated hours</label>
                            <input id="broadcast-hours" type="number" min="0" max="100" step="0.5" required value={broadcast.estimatedHours} onChange={(event) => setBroadcast({ ...broadcast, estimatedHours: event.target.value })} className="input-base" />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={broadcastLoading || students.length === 0} className="btn-primary w-full sm:w-auto">
                                {broadcastLoading ? 'Sending…' : 'Send to assigned students'}
                            </button>
                        </div>
                        {students.length === 0 && !studentsLoading && <p className="font-body text-xs text-ink-faint sm:col-span-2">Assign students before broadcasting a task.</p>}
                    </form>
                </section>
            </main>

            {selectedStudent && (
                <div className="fixed inset-0 z-40 bg-ink/40" role="presentation" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) setSelectedStudent(null);
                }}>
                    <aside className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-ink/15 bg-paper p-4 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="student-detail-heading">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="section-label mb-1">Student details</p>
                                <h2 id="student-detail-heading" className="break-words font-display text-2xl font-semibold text-ink">{studentDetail?.name || selectedStudent.name}</h2>
                            </div>
                            <button type="button" onClick={() => setSelectedStudent(null)} className="btn-ghost text-sm">Close</button>
                        </div>
                        {detailLoading ? (
                            <Loading label="Loading student details" />
                        ) : detailError ? (
                            <div role="alert">
                                <p className="mb-3 font-body text-sm text-signal">{detailError}</p>
                                <button type="button" onClick={() => openStudent(selectedStudent)} className="btn-secondary px-4 py-2 text-sm">Try again</button>
                            </div>
                        ) : studentDetail && (
                            <div className="space-y-6">
                                <div className="grid gap-2 border-b border-ink/10 pb-4 font-body text-sm text-ink-muted">
                                    <p className="break-all">{studentDetail.email}</p>
                                    <p>{studentDetail.department || 'Department not set'}{studentDetail.year ? ` · Year ${studentDetail.year}` : ''}</p>
                                </div>

                                <section>
                                    <h3 className="mb-2 font-display text-lg font-semibold text-ink">Risk & readiness</h3>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <RiskBadge risk={studentDetail.risk} />
                                        <span className="tag-pill-outline">Readiness {studentDetail.readiness?.score ?? '—'}/100</span>
                                    </div>
                                    {studentDetail.risk?.reasons?.length > 0 ? (
                                        <ul className="mt-3 list-disc space-y-1 pl-5 font-body text-sm text-ink-muted">
                                            {studentDetail.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                                        </ul>
                                    ) : (
                                        <p className="mt-3 font-body text-sm text-ink-muted">No current risk factors reported.</p>
                                    )}
                                </section>

                                <section>
                                    <h3 className="mb-2 font-display text-lg font-semibold text-ink">Tasks</h3>
                                    {studentDetail.tasks?.length ? (
                                        <ul className="space-y-2">
                                            {studentDetail.tasks.map((task) => (
                                                <li key={task._id} className="border border-ink/10 p-3">
                                                    <p className={`break-words font-body text-sm font-medium ${task.status === 'completed' ? 'text-ink-faint line-through' : 'text-ink'}`}>{task.title}</p>
                                                    <p className="mt-1 font-mono text-xs text-ink-faint">{task.status.replaceAll('_', ' ')} · {dateLabel(task.deadline)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p className="font-body text-sm text-ink-muted">No tasks found.</p>}
                                </section>

                                <section>
                                    <h3 className="mb-2 font-display text-lg font-semibold text-ink">Roadmaps</h3>
                                    {studentDetail.roadmaps?.length ? (
                                        <ul className="space-y-2">
                                            {studentDetail.roadmaps.map((roadmap) => {
                                                const total = roadmap.days?.length ?? 0;
                                                const completed = roadmap.days?.filter((day) => day.completed).length ?? 0;
                                                const percent = total ? Math.round((completed / total) * 100) : 0;
                                                return (
                                                    <li key={roadmap._id} className="border border-ink/10 p-3">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p className="font-body text-sm font-medium text-ink">{roadmap.goal}</p>
                                                            <span className="tag-pill-outline">{roadmap.status}</span>
                                                        </div>
                                                        <div className="mt-2 h-2 bg-ink/10"><div className="h-full bg-forest" style={{ width: `${percent}%` }} /></div>
                                                        <p className="mt-1 font-mono text-xs text-ink-faint">{percent}% complete</p>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : <p className="font-body text-sm text-ink-muted">No roadmaps found.</p>}
                                </section>

                                <section className="border-t border-ink/10 pt-5">
                                    <button type="button" onClick={generateSummary} disabled={summaryLoading} className="btn-primary w-full sm:w-auto">
                                        {summaryLoading ? 'Generating…' : 'Generate AI summary'}
                                    </button>
                                    {summaryError && <p className="mt-3 font-body text-sm text-signal" role="alert">{summaryError}</p>}
                                    {summary && (
                                        <div className="mt-4 border border-ink/10 bg-white/40 p-4" aria-live="polite">
                                            <h3 className="font-display text-base font-semibold text-ink">Mentor summary</h3>
                                            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">{summary.summary}</p>
                                            <p className="mt-3 font-body text-sm"><span className="font-semibold text-ink">Suggested action:</span> {summary.suggestedAction}</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}
