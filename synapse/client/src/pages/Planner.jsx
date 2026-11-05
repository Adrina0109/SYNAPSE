import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { dayOfMonth, formatDayKey, formatHours, LOAD_META, SEVERITY_LABEL, weekdayShort } from '../components/planner/plannerHelpers.js';
import ReplanPanel from '../components/planner/ReplanPanel.jsx';
import MonthCalendar from '../components/planner/MonthCalendar.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Card from '../components/ui/Card.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

export default function Planner() {
    const navigate = useNavigate();
    const location = useLocation();
    const [autoPreview] = useState(() => Boolean(location.state?.autoPreview));
    const [capacity, setCapacity] = useState(null);
    const [conflicts, setConflicts] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const [capacityResponse, conflictsResponse, tasksResponse] = await Promise.all([
                api.get('/planner/capacity', { params: { days: 14 } }),
                api.get('/planner/conflicts'),
                api.get('/tasks'),
            ]);
            const nextCapacity = capacityResponse.data;
            setCapacity(nextCapacity);
            setConflicts(conflictsResponse.data.conflicts || []);
            setTasks(tasksResponse.data.tasks || []);
            setSelectedDate((current) => (
                nextCapacity.days?.some((day) => day.date === current)
                    ? current
                    : nextCapacity.today
            ));
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load your planner. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    useEffect(() => {
        if (location.state?.autoPreview) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    const days = capacity?.days || [];
    const selectedDay = days.find((day) => day.date === selectedDate)
        || days.find((day) => day.date === capacity?.today)
        || days[0];
    const summary = capacity?.summary || {};
    const overdueTaskCount = summary.overdueTasks
        ?? conflicts
            .filter((conflict) => conflict.type === 'overdue')
            .reduce((count, conflict) => count + (conflict.taskIds?.length || 0), 0);

    return (
        <div className="min-w-0 space-y-7">
                <PageHeader
                    title="Study planner"
                    subtitle="Your personalised schedule with intelligent re-planning."
                />

                {loadError && (
                    <ErrorState message={loadError} onRetry={reload} />
                )}

                {!loadError && isLoading && !capacity && (
                    <div className="space-y-4" role="status" aria-label="Loading planner">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </div>
                )}

                {!loadError && capacity && (
                    <>
                        <section aria-label="Planner summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                            <MetricCard value={formatHours(summary.freeHoursNext7Days)} label="Free hours, next 7 days" />
                            <MetricCard value={summary.overloadedDays ?? 0} label="Overloaded days" />
                            <MetricCard value={overdueTaskCount} label="Overdue tasks" />
                            <MetricCard value={summary.behindRoadmapDays ?? '—'} label="Roadmap days behind" />
                        </section>

                        {days.length === 0 ? (
                            <EmptyState title="No capacity data yet" body="There are no days available to display." />
                        ) : (
                            <>
                                <section aria-labelledby="workload-heading">
                                    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                                        <div>
                                        <p className="section-label mb-1">Next 14 days</p>
                                        <h2 id="workload-heading" className="font-display text-2xl font-semibold text-text">Workload</h2>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Planner legend">
                                            <span className="inline-flex items-center gap-2 font-mono text-xs text-text-muted"><span className="h-2.5 w-2.5 rounded-sm bg-blue" aria-hidden="true" />Task work</span>
                                            <span className="inline-flex items-center gap-2 font-mono text-xs text-text-muted"><span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" />Roadmap</span>
                                            <span className="inline-flex items-center gap-2 font-mono text-xs text-text-muted"><span className="h-2.5 w-2.5 rounded-sm bg-danger" aria-hidden="true" />Conflict</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2 lg:grid-cols-[repeat(14,minmax(0,1fr))]">
                                        {days.map((day) => {
                                            const load = LOAD_META[day.load] || LOAD_META.light;
                                            const isSelected = selectedDay?.date === day.date;
                                            const isToday = day.date === capacity.today;
                                            const loadStyle = {
                                                light: 'bg-surface text-text',
                                                normal: 'bg-blue/10 text-blue',
                                                heavy: 'bg-warning/10 text-warning',
                                                overloaded: 'bg-danger/10 text-danger',
                                            }[day.load] || 'bg-surface text-text';
                                            return (
                                                <button
                                                    key={day.date}
                                                    type="button"
                                                    title={formatDayKey(day.date)}
                                                    aria-pressed={isSelected}
                                                    onClick={() => setSelectedDate(day.date)}
                                                    className={`relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border border-border px-1 py-2 text-center transition-colors ${loadStyle} ${isSelected ? 'border-accent bg-accent-soft ring-2 ring-accent ring-offset-2 ring-offset-bg' : 'hover:border-border-strong'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                                                >
                                                    {isToday && (
                                                        <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-surface-2 px-1 py-0.5 font-mono text-[8px] leading-none text-text-muted">
                                                            TODAY
                                                        </span>
                                                    )}
                                                    <span className={`font-mono text-[10px] uppercase ${isToday ? 'mt-4' : ''}`}>
                                                        {weekdayShort(day.date)}
                                                    </span>
                                                    <span className="font-display text-xl font-bold leading-none">
                                                        {dayOfMonth(day.date)}
                                                    </span>
                                                    <span className="font-mono text-[9px] leading-tight break-words">
                                                        {load.label}
                                                    </span>
                                                    <span className="font-mono text-[9px] leading-tight">
                                                        {formatHours(day.freeHours)} free
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {selectedDay && (
                                    <section className="card-hard p-4 sm:p-6" aria-labelledby="day-detail-heading">
                                        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="section-label mb-1">Selected day</p>
                                                <h2 id="day-detail-heading" className="font-display text-2xl font-semibold text-text">
                                                    {formatDayKey(selectedDay.date)}
                                                </h2>
                                            </div>
                                            <StatusBadge tone={selectedDay.load === 'overloaded' ? 'danger' : selectedDay.load === 'heavy' ? 'warning' : selectedDay.load === 'normal' ? 'info' : 'success'} label={LOAD_META[selectedDay.load]?.label || LOAD_META.light.label} />
                                        </div>

                                        <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                            {[
                                                ['Available', selectedDay.availableHours],
                                                ['Task work', selectedDay.taskHours],
                                                ['Roadmap', selectedDay.roadmapHours],
                                                ['Free', selectedDay.freeHours],
                                            ].map(([label, hours]) => (
                                                <div key={label} className="rounded-xl border border-border bg-surface-2/50 p-3">
                                                    <dt className="section-label">{label}</dt>
                                                    <dd className="mt-1 font-mono text-xl font-semibold text-text">{formatHours(hours)}</dd>
                                                </div>
                                            ))}
                                        </dl>

                                        <div className="grid min-w-0 gap-6 md:grid-cols-2">
                                            <div>
                                                <h3 className="mb-3 font-display text-lg font-semibold text-text">Task work</h3>
                                                {selectedDay.tasks?.length ? (
                                                    <ul className="space-y-2">
                                                        {selectedDay.tasks.map((task) => (
                                                            <li key={task.taskId} className="flex min-w-0 items-start justify-between gap-3 rounded-lg border-l-2 border-blue bg-blue/5 px-3 py-2">
                                                                <span className="min-w-0 break-words font-body text-sm text-text">{task.title}</span>
                                                                <span className="shrink-0 font-mono text-xs text-text-muted">{formatHours(task.hours)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="font-body text-sm text-text-muted">No task work scheduled.</p>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="mb-3 font-display text-lg font-semibold text-text">Roadmap study</h3>
                                                {selectedDay.roadmapDays?.length ? (
                                                    <ul className="space-y-2">
                                                        {selectedDay.roadmapDays.map((roadmapDay) => (
                                                            <li
                                                                key={`${roadmapDay.roadmapId}-${roadmapDay.dayNumber}`}
                                                                className="flex min-w-0 items-start justify-between gap-3 rounded-lg border-l-2 border-accent bg-accent-soft/50 px-3 py-2"
                                                            >
                                                                <span className="min-w-0 break-words font-body text-sm text-text">
                                                                    {roadmapDay.goal} <span className="text-text-muted">· Day {roadmapDay.dayNumber}</span>
                                                                </span>
                                                                <span className="shrink-0 font-mono text-xs text-text-muted">{formatHours(roadmapDay.hours)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="font-body text-sm text-text-muted">No roadmap study scheduled.</p>
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}

                        <section aria-labelledby="conflicts-heading">
                            <div className="mb-4">
                                <p className="section-label mb-1">30-day outlook</p>
                                <h2 id="conflicts-heading" className="font-display text-2xl font-semibold text-text">Conflicts</h2>
                            </div>
                            {conflicts.length === 0 ? (
                                <EmptyState title="No conflicts" body="No conflicts were found in the next 30 days." />
                            ) : (
                                <ul className="space-y-3">
                                    {conflicts.map((conflict, index) => (
                                        <li key={conflict.id ?? `${conflict.type}-${index}`}>
                                            <Card className="min-w-0 border-l-4 border-l-danger p-4 sm:p-5">
                                            <div className="flex min-w-0 flex-wrap items-start gap-3">
                                                <StatusBadge tone={conflict.severity === 'high' ? 'danger' : 'warning'} label={SEVERITY_LABEL[conflict.severity] ?? 'NOTICE'} />
                                                <p className="min-w-0 flex-1 font-body text-sm leading-relaxed text-text">{conflict.message}</p>
                                            </div>
                                            {conflict.dates?.length > 0 && (
                                                <p className="mt-3 font-mono text-xs text-text-faint">
                                                    {conflict.dates.map(formatDayKey).join(' · ')}
                                                </p>
                                            )}
                                            </Card>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        <div>
                            <ReplanPanel autoPreview={autoPreview} onApplied={reload} />
                        </div>
                        <div>
                            <MonthCalendar tasks={tasks} />
                        </div>
                    </>
                )}
        </div>
    );
}
