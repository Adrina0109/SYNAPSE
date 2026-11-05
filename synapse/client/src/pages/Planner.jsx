import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import { dayOfMonth, formatDayKey, formatHours, LOAD_META, SEVERITY_LABEL, weekdayShort } from '../components/planner/plannerHelpers.js';
import ReplanPanel from '../components/planner/ReplanPanel.jsx';
import MonthCalendar from '../components/planner/MonthCalendar.jsx';

const SummaryCard = ({ value, label }) => (
    <div className="card-hard min-w-0 p-4">
        <p className="font-display text-2xl sm:text-3xl font-bold text-ink">{value}</p>
        <p className="font-mono text-[10px] sm:text-xs leading-relaxed tracking-widest uppercase text-ink-faint mt-1">
            {label}
        </p>
    </div>
);

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
        <div className="min-h-screen bg-paper">
            <div className="mx-auto w-full max-w-6xl">
                <header className="mb-7 sm:mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Plan with clarity</p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Planner</h1>
                    <p className="font-body text-ink-muted mt-2">
                        See how your tasks and roadmap fit into the time you have.
                    </p>
                </header>

                {loadError && (
                    <div className="card-hard p-5 text-center mb-6" role="alert">
                        <p className="font-body text-sm text-signal mb-3">{loadError}</p>
                        <button type="button" onClick={reload} className="btn-secondary text-sm">Try again</button>
                    </div>
                )}

                {!loadError && isLoading && !capacity && (
                    <div className="card-hard p-8 flex items-center justify-center gap-3" role="status">
                        <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                        <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading planner</span>
                    </div>
                )}

                {!loadError && capacity && (
                    <>
                        <section aria-label="Planner summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                            <SummaryCard value={formatHours(summary.freeHoursNext7Days)} label="Free hours, next 7 days" />
                            <SummaryCard value={summary.overloadedDays ?? 0} label="Overloaded days" />
                            <SummaryCard value={overdueTaskCount} label="Overdue tasks" />
                            <SummaryCard value={summary.behindRoadmapDays ?? '—'} label="Roadmap days behind" />
                        </section>

                        {days.length === 0 ? (
                            <div className="card-hard p-6 text-center mb-8">
                                <h2 className="font-display text-lg font-semibold text-ink mb-1">No capacity data yet</h2>
                                <p className="font-body text-sm text-ink-muted">There are no days available to display.</p>
                            </div>
                        ) : (
                            <>
                                <section className="mb-8" aria-labelledby="workload-heading">
                                    <div className="mb-4">
                                        <p className="section-label mb-1">Next 14 days</p>
                                        <h2 id="workload-heading" className="font-display text-2xl font-semibold text-ink">Workload</h2>
                                    </div>
                                    <div className="grid grid-cols-7 lg:grid-cols-[repeat(14,minmax(0,1fr))] gap-2">
                                        {days.map((day) => {
                                            const load = LOAD_META[day.load] || LOAD_META.light;
                                            const isSelected = selectedDay?.date === day.date;
                                            const isToday = day.date === capacity.today;
                                            return (
                                                <button
                                                    key={day.date}
                                                    type="button"
                                                    title={formatDayKey(day.date)}
                                                    aria-pressed={isSelected}
                                                    onClick={() => setSelectedDate(day.date)}
                                                    className={`relative flex min-h-28 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition-shadow ${load.cellClass} ${isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : ''} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
                                                >
                                                    {isToday && (
                                                        <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-ink px-1 py-0.5 font-mono text-[8px] leading-none text-paper">
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
                                    <section className="card-hard p-4 sm:p-6 mb-8" aria-labelledby="day-detail-heading">
                                        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                                            <div>
                                                <p className="section-label mb-1">Selected day</p>
                                                <h2 id="day-detail-heading" className="font-display text-2xl font-semibold text-ink">
                                                    {formatDayKey(selectedDay.date)}
                                                </h2>
                                            </div>
                                            <span className={`tag-pill ${LOAD_META[selectedDay.load]?.cellClass || LOAD_META.light.cellClass}`}>
                                                {LOAD_META[selectedDay.load]?.label || LOAD_META.light.label}
                                            </span>
                                        </div>

                                        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                            {[
                                                ['Available', selectedDay.availableHours],
                                                ['Task work', selectedDay.taskHours],
                                                ['Roadmap', selectedDay.roadmapHours],
                                                ['Free', selectedDay.freeHours],
                                            ].map(([label, hours]) => (
                                                <div key={label} className="border border-ink/10 p-3">
                                                    <dt className="section-label">{label}</dt>
                                                    <dd className="font-display text-xl font-semibold text-ink mt-1">{formatHours(hours)}</dd>
                                                </div>
                                            ))}
                                        </dl>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="font-display text-lg font-semibold text-ink mb-3">Task work</h3>
                                                {selectedDay.tasks?.length ? (
                                                    <ul className="space-y-2">
                                                        {selectedDay.tasks.map((task) => (
                                                            <li key={task.taskId} className="flex items-start justify-between gap-3 border-b border-ink/10 pb-2">
                                                                <span className="font-body text-sm text-ink">{task.title}</span>
                                                                <span className="font-mono text-xs text-ink-muted shrink-0">{formatHours(task.hours)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="font-body text-sm text-ink-muted">No task work scheduled.</p>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-display text-lg font-semibold text-ink mb-3">Roadmap study</h3>
                                                {selectedDay.roadmapDays?.length ? (
                                                    <ul className="space-y-2">
                                                        {selectedDay.roadmapDays.map((roadmapDay) => (
                                                            <li
                                                                key={`${roadmapDay.roadmapId}-${roadmapDay.dayNumber}`}
                                                                className="flex items-start justify-between gap-3 border-b border-ink/10 pb-2"
                                                            >
                                                                <span className="font-body text-sm text-ink">
                                                                    {roadmapDay.goal} <span className="text-ink-muted">· Day {roadmapDay.dayNumber}</span>
                                                                </span>
                                                                <span className="font-mono text-xs text-ink-muted shrink-0">{formatHours(roadmapDay.hours)}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="font-body text-sm text-ink-muted">No roadmap study scheduled.</p>
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
                                <h2 id="conflicts-heading" className="font-display text-2xl font-semibold text-ink">Conflicts</h2>
                            </div>
                            {conflicts.length === 0 ? (
                                <div className="card-hard p-5 text-center">
                                    <p className="font-display text-lg font-semibold text-ink">No conflicts in the next 30 days.</p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {conflicts.map((conflict, index) => (
                                        <li key={conflict.id ?? `${conflict.type}-${index}`} className="card-hard p-4 sm:p-5">
                                            <div className="flex flex-wrap items-start gap-2">
                                                <span className={`tag-pill shrink-0 ${conflict.severity === 'high' ? 'bg-signal text-paper' : 'bg-forest text-paper'}`}>
                                                    {SEVERITY_LABEL[conflict.severity] ?? 'NOTICE'}
                                                </span>
                                                <p className="font-body text-sm leading-relaxed text-ink">{conflict.message}</p>
                                            </div>
                                            {conflict.dates?.length > 0 && (
                                                <p className="font-mono text-xs text-ink-faint mt-3">
                                                    {conflict.dates.map(formatDayKey).join(' · ')}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        <div className="mt-8">
                            <ReplanPanel autoPreview={autoPreview} onApplied={reload} />
                        </div>
                        <div className="mt-8">
                            <MonthCalendar tasks={tasks} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
