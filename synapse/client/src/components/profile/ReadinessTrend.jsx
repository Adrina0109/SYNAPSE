import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import { formatProfileDate } from './profileHelpers.js';

export default function ReadinessTrend({ history, isLoading, error }) {
    if (isLoading) {
        return (
            <Card className="space-y-4 p-5" aria-label="Loading readiness trend">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
                <div className="h-32 animate-pulse rounded bg-surface-2" />
            </Card>
        );
    }

    if (error) return <ErrorState message={error} />;

    const snapshots = history?.snapshots || [];
    if (snapshots.length === 0) {
        return <EmptyState title="No readiness history yet" body="Your weekly readiness scores will appear here as snapshots are recorded." />;
    }

    const scores = snapshots.map(({ score }) => Number(score) || 0);
    const summary = `Readiness score trend across ${snapshots.length} weekly snapshots, from ${scores[0]} to ${scores[scores.length - 1]} out of 100.`;

    return (
        <Card className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="section-label mb-1">Weekly snapshots</p>
                    <h2 className="font-display text-xl font-semibold text-text">Readiness trend</h2>
                </div>
                {history.changeSinceFirst != null && (
                    <span className={`font-mono text-sm ${history.changeSinceFirst >= 0 ? 'text-mint' : 'text-danger'}`}>
                        {history.changeSinceFirst > 0 ? '+' : ''}{history.changeSinceFirst} since first
                    </span>
                )}
            </div>
            <p className="sr-only">{summary}</p>
            <div
                className="grid min-h-36 grid-flow-col auto-cols-fr items-end gap-2 border-b border-border pb-2"
                role="img"
                aria-label={summary}
            >
                {snapshots.map((snapshot) => (
                    <div key={snapshot.weekKey} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                        <span className="font-mono text-[10px] text-text-muted">{snapshot.score}</span>
                        <span
                            className="w-full max-w-10 rounded-t bg-accent"
                            style={{ height: `${Math.max(4, Number(snapshot.score) || 0)}px` }}
                            title={`${formatProfileDate(snapshot.weekKey)}: ${snapshot.score} readiness`}
                        />
                        <span className="max-w-full truncate font-mono text-[9px] text-text-faint">
                            {formatProfileDate(snapshot.weekKey)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
