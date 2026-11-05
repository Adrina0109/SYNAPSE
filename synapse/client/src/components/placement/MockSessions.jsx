import { formatDayKey } from '../planner/plannerHelpers.js';

const istDayKey = (date) => new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});

export default function MockSessions({ sessions }) {
    return (
        <section className="card-hard min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby="mock-sessions-heading">
            <div>
                <p className="section-label mb-2">Practice history</p>
                <h2 id="mock-sessions-heading" className="font-display text-2xl font-semibold text-ink">Mock sessions</h2>
            </div>
            {sessions.length === 0 ? (
                <p className="font-body text-sm leading-relaxed text-ink-muted">
                    No mock interviews yet. Ask your mentor to record one after a practice session.
                </p>
            ) : (
                <ul className="space-y-3">
                    {sessions.map((session) => (
                        <li key={session._id} className="border-t border-ink/10 pt-3 first:border-0 first:pt-0">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="font-mono text-xs text-ink-faint">{formatDayKey(istDayKey(session.date))}</p>
                                <p className="font-mono text-sm text-ink">{session.rating} / 5</p>
                            </div>
                            <p className="mt-2 break-words font-body text-sm leading-relaxed text-ink">
                                {session.notes || 'No notes recorded.'}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
