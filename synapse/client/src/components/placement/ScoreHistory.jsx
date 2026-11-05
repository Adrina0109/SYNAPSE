import { formatDayKey } from '../planner/plannerHelpers.js';

export default function ScoreHistory({ history }) {
    const month = history.sinceLabel?.split(/\s+/)[0] || '';
    let headline = 'Your history starts this week. Check back next week to see your change.';
    if (history.changeSinceFirst > 0) headline = `Up ${history.changeSinceFirst} points since ${month}`;
    if (history.changeSinceFirst < 0) headline = `Down ${Math.abs(history.changeSinceFirst)} points since ${month}`;
    if (history.changeSinceFirst === 0) headline = `Unchanged since ${month}`;

    const snapshots = history.snapshots || [];
    const showHistory = snapshots.length >= 2;

    return (
        <section className="card-hard min-w-0 p-4 sm:p-6" aria-labelledby="score-history-heading">
            <p className="section-label mb-3">Progress over time</p>
            <h2 id="score-history-heading" className="font-display text-4xl font-bold text-ink">
                {history.currentScore}
            </h2>
            <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">{headline}</p>
            {showHistory && (
                <div className="mt-6 grid grid-flow-col auto-cols-fr items-end gap-2">
                    {snapshots.map((snapshot) => (
                        <div key={snapshot.weekKey} className="flex min-w-0 flex-col items-center gap-2">
                            <span className="font-mono text-[10px] text-ink-muted">{snapshot.score}</span>
                            <div
                                className="w-full max-w-10 bg-olive"
                                style={{ height: `${Math.max(4, Math.min(100, snapshot.score))}px` }}
                                role="img"
                                aria-label={`${snapshot.score} points on ${formatDayKey(snapshot.weekKey)}`}
                            />
                            <span className="truncate font-mono text-[9px] text-ink-faint">
                                {formatDayKey(snapshot.weekKey)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
