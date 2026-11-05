import { useEffect, useRef } from 'react';
import Card from '../ui/Card.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import './mentorDashboard.css';

const dateLabel = (value) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? 'Deadline unavailable'
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getRiskTone = (riskLevel) => (
    riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : riskLevel === 'low' ? 'success' : 'neutral'
);

const getInitials = (name = '') => name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase())
    .join('') || '?';

export default function StudentDetailDrawer({
    student,
    openerRef,
    loading,
    error,
    summary,
    summaryLoading,
    summaryError,
    onClose,
    onRetry,
    onGenerateSummary,
}) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const getFocusable = () => [...(dialogRef.current?.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || [])];

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = getFocusable();
            if (!focusable.length) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialogRef.current?.contains(document.activeElement)) {
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

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            if (openerRef.current?.isConnected) openerRef.current.focus();
        };
    }, [onClose, openerRef]);

    const details = student || {};
    const tasks = details.tasks || [];
    const pendingTasks = tasks.filter((task) => task.status !== 'completed');
    const now = Date.now();
    const overdueTasks = pendingTasks.filter((task) => (
        task.deadline && new Date(task.deadline).getTime() < now
    ));
    const roadmaps = details.roadmaps || [];
    const riskLevel = details.risk?.riskLevel || 'low';
    const readinessBreakdown = details.readiness?.breakdown || [];

    return (
        <div
            className="fixed inset-0 z-[80] bg-scrim/55"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside
                ref={dialogRef}
                className="mentor-detail-drawer ml-auto flex h-full w-full flex-col overflow-y-auto border-l border-border bg-bg p-4 shadow-2xl sm:max-w-2xl sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-detail-heading"
            >
                <header className="mb-5 flex items-start justify-between gap-4 border-b border-border pb-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-lg font-semibold text-accent" aria-hidden="true">
                            {getInitials(details.name || student?.name)}
                        </div>
                        <div className="min-w-0">
                            <p className="section-label mb-1">Student profile</p>
                            <h2 id="student-detail-heading" className="break-words font-display text-xl font-semibold text-text">
                                {details.name || student?.name}
                            </h2>
                            <p className="break-all font-body text-xs text-text-muted">{details.email || student?.email}</p>
                        </div>
                    </div>
                    <button ref={closeButtonRef} type="button" onClick={onClose} className="btn-secondary px-3 py-2 text-sm">
                        Close
                    </button>
                </header>

                {loading ? (
                    <div className="space-y-4" role="status" aria-label="Loading student details">
                        <Card className="space-y-3 p-5">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </Card>
                        <Card className="h-40 p-5"><Skeleton className="h-full w-full" /></Card>
                    </div>
                ) : error ? (
                    <ErrorState message={error} onRetry={onRetry} />
                ) : (
                    <div className="space-y-4 pb-6">
                        <Card className="space-y-3 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <StatusBadge tone={getRiskTone(riskLevel)} label={`${riskLevel} risk`} />
                                <div className="flex items-center gap-2 font-mono text-sm text-text">
                                    <span>Readiness</span>
                                    <strong>{details.readiness?.score ?? '—'}{details.readiness ? '/100' : ''}</strong>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 font-body text-sm text-text-muted">
                                {details.department && <StatusBadge tone="neutral" label={details.department} />}
                                {details.year != null && <StatusBadge tone="neutral" label={`Year ${details.year}`} />}
                                {details.cgpa != null && <StatusBadge tone="accent" label={`CGPA ${details.cgpa}`} />}
                                {details.backlogs != null && <StatusBadge tone={details.backlogs > 0 ? 'warning' : 'success'} label={`${details.backlogs} backlogs`} />}
                                {details.targetRole && <StatusBadge tone="info" label={details.targetRole} />}
                            </div>
                        </Card>

                        <section aria-labelledby="detail-tasks-heading">
                            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                <h3 id="detail-tasks-heading" className="font-display text-lg font-semibold text-text">Pending and overdue tasks</h3>
                                <span className="font-mono text-xs text-text-muted">{pendingTasks.length} pending · {overdueTasks.length} overdue in returned tasks</span>
                            </div>
                            {pendingTasks.length ? (
                                <ul className="space-y-2">
                                    {pendingTasks.map((task) => {
                                        const overdue = task.deadline && new Date(task.deadline).getTime() < now;
                                        return (
                                            <li key={task._id} className="card-hard flex min-w-0 items-start justify-between gap-3 p-3">
                                                <div className="min-w-0">
                                                    <p className="break-words font-body text-sm font-medium text-text">{task.title}</p>
                                                    <p className="mt-1 font-mono text-xs text-text-faint">{task.status.replaceAll('_', ' ')} · {dateLabel(task.deadline)}</p>
                                                </div>
                                                <StatusBadge tone={overdue ? 'danger' : 'neutral'} label={overdue ? 'Overdue' : 'Pending'} />
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <Card className="p-4"><p className="font-body text-sm text-text-muted">No pending tasks in the returned task list.</p></Card>
                            )}
                        </section>

                        <section aria-labelledby="detail-roadmaps-heading">
                            <h3 id="detail-roadmaps-heading" className="mb-2 font-display text-lg font-semibold text-text">Roadmap progress</h3>
                            {roadmaps.length ? (
                                <div className="space-y-2">
                                    {roadmaps.map((roadmap) => {
                                        const total = roadmap.days?.length || 0;
                                        const completed = roadmap.days?.filter((day) => day.completed).length || 0;
                                        const progress = total ? (completed / total) * 100 : 0;
                                        return (
                                            <Card key={roadmap._id} className="space-y-3 p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <p className="break-words font-body text-sm font-semibold text-text">{roadmap.goal}</p>
                                                    <StatusBadge tone={roadmap.status === 'completed' ? 'success' : roadmap.status === 'active' ? 'accent' : 'neutral'} label={roadmap.status} />
                                                </div>
                                                <ProgressBar value={progress} label={`${completed} of ${total} days complete`} />
                                            </Card>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="p-4"><p className="font-body text-sm text-text-muted">No roadmaps found.</p></Card>
                            )}
                        </section>

                        {readinessBreakdown.length > 0 && (
                            <section aria-labelledby="detail-readiness-heading">
                                <h3 id="detail-readiness-heading" className="mb-2 font-display text-lg font-semibold text-text">Placement readiness</h3>
                                <Card className="space-y-3 p-4">
                                    {readinessBreakdown.map((item) => (
                                        <div key={item.factor} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                                            <span className="font-body text-sm text-text">{item.factor}</span>
                                            <span className="font-mono text-xs text-text-muted">{item.value}% · {item.contribution} points</span>
                                        </div>
                                    ))}
                                </Card>
                            </section>
                        )}

                        <section aria-labelledby="detail-risk-heading">
                            <h3 id="detail-risk-heading" className="mb-2 font-display text-lg font-semibold text-text">Risk factors</h3>
                            {details.risk?.reasons?.length ? (
                                <ul className="list-disc space-y-1 rounded-xl border border-border bg-surface p-4 pl-8 font-body text-sm text-text-muted">
                                    {details.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                                </ul>
                            ) : (
                                <Card className="p-4"><p className="font-body text-sm text-text-muted">No current risk factors reported.</p></Card>
                            )}
                        </section>

                        <section className="border-t border-border pt-4" aria-labelledby="detail-summary-heading">
                            <div className="mb-3">
                                <p className="section-label mb-1">Mentor support</p>
                                <h3 id="detail-summary-heading" className="font-display text-lg font-semibold text-text">AI summary and suggested action</h3>
                            </div>
                            {!summary && (
                                <button type="button" onClick={onGenerateSummary} disabled={summaryLoading} className="btn-primary w-full sm:w-auto">
                                    {summaryLoading ? 'Generating summary…' : 'Generate AI summary'}
                                </button>
                            )}
                            {summaryError && <p className="mt-3 font-body text-sm text-danger" role="alert">{summaryError}</p>}
                            {summaryLoading && <div role="status" className="mt-3"><Skeleton className="h-20 w-full" /></div>}
                            {summary && (
                                <Card className="space-y-3 p-4" aria-live="polite">
                                    <div>
                                        <p className="section-label mb-1">Summary</p>
                                        <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text">{summary.summary}</p>
                                    </div>
                                    <div className="border-t border-border pt-3">
                                        <p className="section-label mb-1">Suggested mentor action</p>
                                        <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed text-text">{summary.suggestedAction}</p>
                                    </div>
                                </Card>
                            )}
                        </section>
                    </div>
                )}
            </aside>
        </div>
    );
}
