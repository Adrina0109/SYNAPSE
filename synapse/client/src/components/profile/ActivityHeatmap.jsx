import { useMemo } from 'react';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import { addDaysToKey, formatProfileDate, getIstDayKey, getWeekday } from './profileHelpers.js';

const INTENSITIES = [
    { count: 0, className: 'bg-surface-2' },
    { count: 1, className: 'bg-accent/25' },
    { count: 2, className: 'bg-accent/45' },
    { count: 3, className: 'bg-accent/70' },
    { count: 4, className: 'bg-accent' },
];

const buildWeeks = (completionCounts, weeksToShow) => {
    const todayKey = getIstDayKey(new Date());
    const weekStart = addDaysToKey(todayKey, -getWeekday(todayKey));
    const firstDay = addDaysToKey(weekStart, -(weeksToShow - 1) * 7);
    return Array.from({ length: weeksToShow }, (_, weekIndex) => (
        Array.from({ length: 7 }, (_, dayIndex) => {
            const key = addDaysToKey(firstDay, weekIndex * 7 + dayIndex);
            return { key, count: completionCounts.get(key) || 0, future: key > todayKey };
        })
    ));
};

function HeatmapGrid({ weeks, label }) {
    const monthLabels = weeks.map((week, index) => {
        const month = week[0].key.slice(0, 7);
        return index === 0 || month !== weeks[index - 1][0].key.slice(0, 7)
            ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
            : '';
    });

    return (
        <div className="overflow-x-auto pb-2" aria-label={label}>
            <div className="w-max">
                <div
                    className="mb-2 grid h-4 gap-1 font-mono text-[10px] text-text-faint"
                    style={{ gridTemplateColumns: `repeat(${weeks.length}, 0.75rem)` }}
                    aria-hidden="true"
                >
                    {monthLabels.map((month, index) => (
                        <span key={`${month}-${index}`} className="overflow-visible whitespace-nowrap">
                            {month}
                        </span>
                    ))}
                </div>
                <div className="flex items-start gap-2">
                    <div className="grid grid-rows-7 gap-1 pt-0.5 font-mono text-[9px] leading-3 text-text-faint" aria-hidden="true">
                        <span>Sun</span>
                        <span />
                        <span>Tue</span>
                        <span />
                        <span>Thu</span>
                        <span />
                        <span>Sat</span>
                    </div>
                    <div
                        className="grid grid-flow-col grid-rows-7 gap-1"
                        style={{ gridAutoColumns: '0.75rem' }}
                        role="group"
                        aria-label={label}
                    >
                        {weeks.flat().map(({ key, count, future }) => {
                            const intensity = INTENSITIES[Math.min(4, count)];
                            const date = formatProfileDate(key);
                            return (
                                <span
                                    key={key}
                                    role="img"
                                    title={`${date}: ${count} ${count === 1 ? 'completion' : 'completions'}`}
                                    aria-label={`${date}: ${count} ${count === 1 ? 'completion' : 'completions'}`}
                                    className={`h-3 w-3 rounded-sm ${intensity.className} ${future ? 'opacity-30' : ''}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ActivityHeatmap({ completions, isLoading, error }) {
    const { counts, total } = useMemo(() => {
        const nextCounts = new Map();
        const todayKey = getIstDayKey(new Date());
        const cutoffKey = addDaysToKey(todayKey, -181);
        completions.forEach(({ date }) => {
            if (!date) return;
            const key = getIstDayKey(date);
            if (key < cutoffKey || key > todayKey) return;
            nextCounts.set(key, (nextCounts.get(key) || 0) + 1);
        });
        return {
            counts: nextCounts,
            total: [...nextCounts.values()].reduce((sum, count) => sum + count, 0),
        };
    }, [completions]);

    const fullWeeks = useMemo(() => buildWeeks(counts, 26), [counts]);
    const compactWeeks = useMemo(() => buildWeeks(counts, 12), [counts]);

    return (
        <Card className="min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="section-label mb-1">Consistency</p>
                    <h2 className="font-display text-xl font-semibold text-text">Activity</h2>
                </div>
                <p className="font-mono text-xs text-text-muted">{total} completions · last 26 weeks</p>
            </div>
            {isLoading ? (
                <div className="space-y-3" role="status" aria-label="Loading activity">
                    <div className="h-4 w-40 animate-pulse rounded bg-surface-2" />
                    <div className="h-28 w-full animate-pulse rounded bg-surface-2" />
                </div>
            ) : error ? (
                <ErrorState message={error} />
            ) : total === 0 ? (
                <EmptyState title="No activity yet" body="Completed tasks and roadmap days will appear here." />
            ) : (
                <>
                    <div className="hidden sm:block">
                        <HeatmapGrid weeks={fullWeeks} label="Activity heatmap for the last 26 weeks" />
                    </div>
                    <div className="sm:hidden">
                        <HeatmapGrid weeks={compactWeeks} label="Activity heatmap for the last 12 weeks" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="font-body text-xs text-text-muted">
                            {total} completed tasks and roadmap days in this period
                        </p>
                        <div className="flex items-center gap-1.5" aria-label="Activity intensity: 0 to 4 or more completions per day">
                            <span className="font-mono text-[10px] text-text-faint">Less</span>
                            {INTENSITIES.map((intensity) => (
                                <span key={intensity.count} className={`h-3 w-3 rounded-sm ${intensity.className}`} aria-label={`${intensity.count} completions`} />
                            ))}
                            <span className="font-mono text-[10px] text-text-faint">4+</span>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
}
