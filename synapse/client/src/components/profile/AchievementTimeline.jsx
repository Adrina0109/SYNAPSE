import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { formatProfileDate } from './profileHelpers.js';

export default function AchievementTimeline({ achievements, isLoading, errors = [] }) {
    if (isLoading) {
        return (
            <Card className="space-y-4 p-5" aria-label="Loading recent achievements">
                <div className="h-5 w-48 animate-pulse rounded bg-surface-2" />
                <div className="h-24 animate-pulse rounded bg-surface-2" />
            </Card>
        );
    }

    if (achievements.length === 0 && errors.length > 0) {
        return <ErrorState message={errors.join(' ')} />;
    }
    if (achievements.length === 0) {
        return <EmptyState title="No achievements yet" body="Completed tasks, roadmap days, and mock interviews will show up here." />;
    }

    return (
        <Card className="min-w-0 p-4 sm:p-6">
            <div className="mb-4">
                <p className="section-label mb-1">Milestones</p>
                <h2 className="font-display text-xl font-semibold text-text">Recent achievements</h2>
            </div>
            {errors.length > 0 && (
                <p className="mb-4 rounded-lg border border-warning/25 bg-warning/10 p-3 font-body text-xs text-warning" role="status">
                    Some achievement sources could not be loaded: {errors.join(' ')}
                </p>
            )}
            <ol className="relative space-y-4 before:absolute before:bottom-3 before:left-[7px] before:top-3 before:w-px before:bg-border-strong">
                {achievements.slice(0, 8).map((achievement) => (
                    <li key={achievement.id} className="relative flex min-w-0 gap-3 pl-1">
                        <span className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-accent bg-surface" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="break-words font-body text-sm font-medium text-text">{achievement.message}</p>
                                <StatusBadge tone={achievement.tone || 'accent'} label={achievement.kind} />
                            </div>
                            <p className="mt-1 font-mono text-[10px] text-text-faint">{formatProfileDate(achievement.date)}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    );
}
