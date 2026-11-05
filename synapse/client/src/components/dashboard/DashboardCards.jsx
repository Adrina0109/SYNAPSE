import { Link } from 'react-router-dom';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import Ring from '../ui/Ring.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { formatDayKey } from '../planner/plannerHelpers.js';

const Card = ({ title, subtitle, children, className = '' }) => (
    <section className={`card-hard min-w-0 p-4 sm:p-5 ${className}`}>
        <div className="mb-4">
            {subtitle && <p className="section-label mb-1">{subtitle}</p>}
            <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        </div>
        {children}
    </section>
);

const formatHours = (hours) => {
    const value = Number(hours);
    if (!Number.isFinite(value)) return '0';
    return Number(value.toFixed(2)).toString();
};

const getIstDayKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Asia/Kolkata',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
    return `${values.year}-${values.month}-${values.day}`;
};

const relativeDeadline = (deadline, now) => {
    const difference = new Date(deadline).getTime() - now.getTime();
    const hours = Math.ceil(Math.abs(difference) / 3600000);
    const timeLabel = hours < 24
        ? `${hours} ${hours === 1 ? 'hour' : 'hours'}`
        : `${Math.ceil(hours / 24)} ${Math.ceil(hours / 24) === 1 ? 'day' : 'days'}`;
    return difference < 0 ? `Overdue by ${timeLabel}` : `Due in ${timeLabel}`;
};

const deadlineTone = (deadline, now) => {
    const hours = (new Date(deadline).getTime() - now.getTime()) / 3600000;
    if (hours < 0 || hours <= 24) return 'border-l-danger';
    if (hours <= 72) return 'border-l-warning';
    return 'border-l-border-strong';
};

export function WeekPlanCard({ capacity, isLoading, error, onRetry }) {
    if (isLoading) {
        return <Card title="This week's plan"><Skeleton className="h-52 w-full" /></Card>;
    }
    if (error) {
        return <Card title="This week's plan"><ErrorState message={error} onRetry={onRetry} /></Card>;
    }

    const days = capacity?.days?.slice(0, 3) ?? [];
    return (
        <Card title="This week's plan" subtitle="Next three days">
            {days.length === 0 ? (
                <p className="font-body text-sm text-text-muted">No planned days are available.</p>
            ) : (
                <ul className="space-y-4">
                    {days.map((day, index) => {
                        const entries = [
                            ...(day.tasks ?? []).map((task) => ({
                                key: `task-${task.taskId}`,
                                label: task.title,
                                hours: task.hours,
                                kind: 'Task',
                            })),
                            ...(day.roadmapDays ?? []).map((roadmapDay) => ({
                                key: `roadmap-${roadmapDay.roadmapId}-${roadmapDay.dayNumber}`,
                                label: `Day ${roadmapDay.dayNumber}: ${roadmapDay.goal}`,
                                hours: roadmapDay.hours,
                                kind: 'Roadmap',
                            })),
                        ];
                        const dayLabel = index === 0
                            ? 'Today'
                            : index === 1
                                ? 'Tomorrow'
                                : formatDayKey(day.date);

                        return (
                            <li key={day.date} className="border-b border-border pb-3 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-body text-sm font-medium text-text">{dayLabel}</h3>
                                    <span className="font-mono text-xs text-text-muted">
                                        {formatHours(day.totalHours)} hrs planned · {formatHours(day.availableHours)} available
                                    </span>
                                </div>
                                {entries.length === 0 ? (
                                    <p className="mt-2 font-body text-xs text-text-faint">No items planned.</p>
                                ) : (
                                    <ul className="mt-2 space-y-2">
                                        {entries.map((entry) => (
                                            <li key={entry.key} className="flex min-w-0 items-start gap-2">
                                                <span aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 rounded border border-border-strong" />
                                                <span className="min-w-0 flex-1 break-words font-body text-xs leading-relaxed text-text-muted">
                                                    {entry.label}
                                                    <span className="ml-1 text-text-faint">· {entry.kind} · {formatHours(entry.hours)}h</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <Link to="/planner" className="btn-ghost mt-4 px-0 text-sm text-accent">View planner</Link>
        </Card>
    );
}

export function UpcomingDeadlinesCard({ tasks, isLoading, error, now, onRetry }) {
    if (isLoading) {
        return <Card title="Upcoming deadlines"><Skeleton className="h-52 w-full" /></Card>;
    }
    if (error) {
        return <Card title="Upcoming deadlines"><ErrorState message={error} onRetry={onRetry} /></Card>;
    }

    const deadlines = tasks
        .filter((task) => task.status === 'pending' && task.deadline && !Number.isNaN(new Date(task.deadline).getTime()))
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        .slice(0, 3);

    return (
        <Card title="Upcoming deadlines" subtitle="Tasks to keep in view">
            {deadlines.length === 0 ? (
                <p className="font-body text-sm text-text-muted">No pending tasks have a deadline.</p>
            ) : (
                <ul className="space-y-3">
                    {deadlines.map((task) => (
                        <li key={task._id} className={`min-w-0 border-l-2 py-1 pl-3 ${deadlineTone(task.deadline, now)}`}>
                            <p className="break-words font-body text-sm font-medium text-text">{task.title}</p>
                            <p className="mt-1 font-mono text-xs text-text-muted">{relativeDeadline(task.deadline, now)}</p>
                        </li>
                    ))}
                </ul>
            )}
            <Link to="/tasks" className="btn-ghost mt-4 px-0 text-sm text-accent">View tasks</Link>
        </Card>
    );
}

export function FocusInsightsCard({ tasks, tasksLoading, tasksError, completedThisWeek, plannedHours, capacityLoading, capacityError, roadmapProgress }) {
    const canShowWeeklyRate = !tasksLoading && !tasksError && tasks.length > 0;
    const ringValue = canShowWeeklyRate
        ? Math.round((completedThisWeek / tasks.length) * 100)
        : roadmapProgress;
    const ringLabel = canShowWeeklyRate ? 'Tasks completed this week' : 'Active roadmap progress';
    const completedCount = tasks.filter((task) => task.status === 'completed').length;

    return (
        <Card title="Focus insights" subtitle="A quick progress check">
            {tasksLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <Skeleton className="h-32 w-32 rounded-full" />
                    <Skeleton className="h-5 w-full" />
                </div>
            ) : (
                <>
                    {ringValue !== null
                        ? <div className="mb-5 flex justify-center"><Ring value={ringValue} label={ringLabel} /></div>
                        : <p className="mb-5 text-center font-body text-sm text-text-muted">Progress insight is unavailable.</p>}
                    {tasksError && (
                        <p className="mb-3 font-body text-xs text-danger" role="alert">{tasksError}</p>
                    )}
                    <dl className="space-y-3">
                        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                            <dt className="font-body text-sm text-text-muted">Tasks completed</dt>
                            <dd className="font-mono text-sm text-text">
                                {tasksError ? 'Unavailable' : `${completedCount} of ${tasks.length}`}
                            </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                            <dt className="font-body text-sm text-text-muted">Planned hours · next 7 days</dt>
                            <dd className="font-mono text-sm text-text">
                                {capacityLoading ? '…' : capacityError ? 'Unavailable' : `${formatHours(plannedHours)}h`}
                            </dd>
                        </div>
                    </dl>
                </>
            )}
        </Card>
    );
}

export function ContinueLearningCard({ roadmap, detail, isLoading, detailLoading, today, error, onRetry }) {
    if (isLoading) {
        return <Card title="Continue learning"><Skeleton className="h-40 w-full" /></Card>;
    }
    if (error && !roadmap) {
        return <Card title="Continue learning"><ErrorState message={error} onRetry={onRetry} /></Card>;
    }
    if (!roadmap) {
        return (
            <Card title="Continue learning">
                <EmptyState
                    title="No active roadmap"
                    body="Create a learning plan to track your next steps."
                    action={<Link to="/roadmaps" className="btn-primary px-4 py-2 text-sm">Generate roadmap</Link>}
                />
            </Card>
        );
    }

    const progress = roadmap.progress;
    const topic = detail?.days?.find((day) => (
        day.date && today
        && getIstDayKey(day.date) === today
    ))?.topic;
    return (
        <Card title="Continue learning" subtitle="Active roadmap">
            <h3 className="break-words font-display text-xl font-semibold text-text">{roadmap.goal}</h3>
            {progress?.completionPercent != null && (
                <div className="mt-4">
                    <ProgressBar value={progress.completionPercent} label="Roadmap progress" />
                </div>
            )}
            <p className="mt-3 font-mono text-xs text-text-muted">
                {progress?.currentStreak ?? 0} day streak
            </p>
            {detailLoading ? (
                <div className="mt-4"><Skeleton className="h-10 w-full" /></div>
            ) : error ? (
                <div className="mt-4"><ErrorState message={error || 'Today’s roadmap topic is unavailable.'} onRetry={onRetry} /></div>
            ) : topic ? (
                <p className="mt-4 border-t border-border pt-3 font-body text-sm text-text-muted">
                    Today: <span className="font-medium text-text">{topic}</span>
                </p>
            ) : (
                <p className="mt-4 border-t border-border pt-3 font-body text-sm text-text-muted">
                    No roadmap topic is scheduled for today.
                </p>
            )}
            <Link to={`/roadmaps/${roadmap._id}`} className="btn-primary mt-5 px-4 py-2 text-sm">Continue learning</Link>
        </Card>
    );
}

export function PlacementReadinessCard({ readiness, isLoading, error, onRetry }) {
    if (isLoading) {
        return <Card title="Placement readiness"><div className="flex justify-center"><Skeleton className="h-32 w-32 rounded-full" /></div></Card>;
    }
    if (error || !readiness) {
        return <Card title="Placement readiness"><ErrorState message={error || 'Readiness data is unavailable.'} onRetry={onRetry} /></Card>;
    }

    return (
        <Card title="Placement readiness" subtitle="Current score">
            <div className="flex justify-center"><Ring value={readiness.score} label="Readiness score" /></div>
            <div className="mt-4 border-t border-border pt-4">
                <p className="section-label mb-2">Next best action</p>
                <p className="font-body text-sm leading-relaxed text-text-muted">
                    {readiness.nextBestAction?.text || 'No next best action is available.'}
                </p>
            </div>
            <Link to="/placement" className="btn-ghost mt-3 px-0 text-sm text-accent">View placement readiness</Link>
        </Card>
    );
}

export function ConflictCard({ conflicts, isLoading, error, onRetry }) {
    if (isLoading) {
        return <section className="card-hard p-4 sm:p-5" aria-label="Planner conflicts"><Skeleton className="h-20 w-full" /></section>;
    }
    if (error) {
        return <section className="card-hard p-4 sm:p-5" aria-label="Planner conflicts"><ErrorState message={error} onRetry={onRetry} /></section>;
    }
    if (!conflicts?.length) return null;

    return (
        <section className="card-hard min-w-0 border-l-4 border-l-warning p-4 sm:p-5" role="status">
            <p className="section-label mb-1">Planner conflict</p>
            <p className="font-body text-sm leading-relaxed text-text">{conflicts[0].message}</p>
            <Link to="/planner" state={{ autoPreview: true }} className="btn-secondary mt-4 px-4 py-2 text-sm">
                Make room
            </Link>
        </section>
    );
}

export function DigestSkeleton() {
    return (
        <section className="card-hard p-5 sm:p-6">
            <Skeleton className="mb-3 h-6 w-56" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        </section>
    );
}
