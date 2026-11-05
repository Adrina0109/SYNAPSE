import { useMemo, useState } from 'react';
import { formatDayKey, formatHours } from './plannerHelpers.js';

const getTodayKey = () => new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});

const addDaysToKey = (key, amount) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + amount));
    return [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
    ].join('-');
};

const getMonthTitle = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const getMonthGrid = (monthKey) => {
    const [year, month] = monthKey.split('-').map(Number);
    const firstOfMonth = `${monthKey}-01`;
    const firstDate = new Date(Date.UTC(year, month - 1, 1));
    const leadingDays = (firstDate.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
    const gridStart = addDaysToKey(firstOfMonth, -leadingDays);

    return Array.from({ length: cellCount }, (_, index) => {
        const key = addDaysToKey(gridStart, index);
        return { key, inMonth: key.slice(0, 7) === monthKey };
    });
};

const taskDeadlineKey = (deadline) => {
    if (!deadline) return null;
    const parsed = new Date(deadline);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const taskUrgencyClass = (task) => {
    if (task.status === 'completed') return 'bg-surface-2 text-text-faint line-through';
    const remainingHours = (new Date(task.deadline).getTime() - Date.now()) / 3600000;
    if (remainingHours <= 24) return 'bg-danger/10 text-danger';
    if (remainingHours <= 72) return 'bg-warning/10 text-warning';
    return 'bg-mint/10 text-mint';
};

const formatCategory = (category = 'personal') => category.replaceAll('_', ' ');
const formatPriority = (priority = 'medium') => priority.charAt(0).toUpperCase() + priority.slice(1);
const formatStatus = (status = 'pending') => status.replaceAll('_', ' ');

export default function MonthCalendar({ tasks = [] }) {
    const todayKey = getTodayKey();
    const currentMonth = todayKey.slice(0, 7);
    const [month, setMonth] = useState(currentMonth);
    const [selectedDate, setSelectedDate] = useState(todayKey);

    const cells = useMemo(() => getMonthGrid(month), [month]);
    const tasksByDate = useMemo(() => {
        const grouped = new Map();
        tasks.forEach((task) => {
            const key = taskDeadlineKey(task.deadline);
            if (!key) return;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(task);
        });
        grouped.forEach((dayTasks) => {
            dayTasks.sort((taskA, taskB) => (
                new Date(taskA.deadline).getTime() - new Date(taskB.deadline).getTime()
            ));
        });
        return grouped;
    }, [tasks]);

    const selectedTasks = tasksByDate.get(selectedDate) || [];
    const hasDeadlines = tasks.some((task) => taskDeadlineKey(task.deadline));
    const moveMonth = (amount) => {
        const [year, monthNumber] = month.split('-').map(Number);
        const nextMonth = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
        const nextKey = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
        setMonth(nextKey);
        setSelectedDate(`${nextKey}-01`);
    };

    const selectToday = () => {
        setMonth(currentMonth);
        setSelectedDate(todayKey);
    };

    return (
        <section aria-labelledby="deadline-calendar-heading">
            <div className="mb-4">
                <p className="section-label mb-1">Dates to keep in view</p>
                <h2 id="deadline-calendar-heading" className="font-display text-2xl font-semibold text-ink">Deadline calendar</h2>
            </div>

            {!hasDeadlines && (
                <p className="font-body text-sm text-ink-muted mb-3" role="status">
                    No tasks with deadlines yet.
                </p>
            )}

            <div className="card-hard p-3 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="font-display text-lg sm:text-xl font-semibold text-ink" aria-live="polite">
                        {getMonthTitle(month)}
                    </h3>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveMonth(-1)} className="btn-secondary px-2 sm:px-3 py-2 text-xs">
                            Previous
                        </button>
                        <button type="button" onClick={selectToday} className="btn-ghost px-2 py-2 text-xs">
                            Today
                        </button>
                        <button type="button" onClick={() => moveMonth(1)} className="btn-secondary px-2 sm:px-3 py-2 text-xs">
                            Next
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label={`${getMonthTitle(month)} deadlines`}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday) => (
                        <div key={weekday} className="py-1 text-center font-mono text-[9px] sm:text-xs uppercase text-ink-faint">
                            {weekday}
                        </div>
                    ))}
                    {cells.map(({ key, inMonth }) => {
                        const dayTasks = tasksByDate.get(key) || [];
                        const isToday = key === todayKey;
                        const isSelected = key === selectedDate;
                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={isSelected}
                                aria-label={`${key}${isToday ? ', today' : ''}${dayTasks.length ? `, ${dayTasks.length} ${dayTasks.length === 1 ? 'task' : 'tasks'}` : ', no tasks'}`}
                                onClick={() => setSelectedDate(key)}
                                className={`relative flex min-h-[4.25rem] min-w-0 flex-col items-stretch overflow-hidden rounded-lg border px-1 py-1 text-left transition-colors sm:min-h-28 sm:p-2 ${inMonth ? 'border-border bg-surface text-text' : 'border-border/50 bg-surface-2/50 text-text-faint'} ${isSelected ? 'border-accent bg-accent-soft ring-2 ring-accent ring-offset-1 ring-offset-bg' : 'hover:border-border-strong'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
                            >
                                <span className="flex items-center justify-between gap-1">
                                    <span className={`font-mono text-[10px] sm:text-xs ${isToday ? 'font-bold text-accent' : ''}`}>
                                        {Number(key.slice(-2))}
                                    </span>
                                    {isToday && (
                                        <span className="hidden sm:inline font-mono text-[8px] tracking-wide text-accent">TODAY</span>
                                    )}
                                    {dayTasks.length > 0 && (
                                        <span className="ml-auto rounded-sm bg-accent px-1 py-0.5 font-mono text-[8px] leading-none text-accent-foreground sm:hidden">
                                            {dayTasks.length}
                                        </span>
                                    )}
                                </span>
                                {isToday && (
                                    <span className="mt-1 font-mono text-[7px] leading-none text-accent sm:hidden">TODAY</span>
                                )}
                                <span className="hidden sm:block min-w-0 space-y-1 mt-1">
                                    {dayTasks.slice(0, 2).map((task) => (
                                        <span
                                            key={task._id}
                                            title={task.title}
                                            className={`block truncate px-1 py-0.5 font-body text-[10px] leading-tight ${taskUrgencyClass(task)} ${!inMonth ? 'opacity-50' : ''}`}
                                        >
                                            {task.title}
                                        </span>
                                    ))}
                                    {dayTasks.length > 2 && (
                                        <span className="block font-mono text-[9px] text-text-muted">+{dayTasks.length - 2} more</span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="card-hard mt-4 p-4 sm:p-5" aria-live="polite">
                <p className="section-label mb-1">Selected day</p>
                <h3 className="mb-3 font-display text-lg font-semibold text-text">{formatDayKey(selectedDate)}</h3>
                {selectedTasks.length === 0 ? (
                    <p className="font-body text-sm text-text-muted">No task deadlines on this day.</p>
                ) : (
                    <ul className="space-y-3">
                        {selectedTasks.map((task) => (
                            <li key={task._id} className={`rounded-lg border border-border bg-surface-2/40 p-3 sm:p-4 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <p className={`font-body text-sm font-medium text-text ${task.status === 'completed' ? 'line-through' : ''}`}>
                                        {task.title}
                                    </p>
                                    <span className="shrink-0 font-mono text-xs text-text-muted">{formatHours(task.estimatedHours)}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="tag-pill-outline">{formatCategory(task.category)}</span>
                                    <span className="tag-pill-outline">{formatPriority(task.priority)}</span>
                                    <span className={`tag-pill ${task.status === 'completed' ? 'bg-surface-2 text-text-faint' : 'bg-mint/10 text-mint'}`}>
                                        {formatStatus(task.status)}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
