import { Link } from 'react-router-dom';
import { SEVERITY_LABEL } from './plannerHelpers.js';

export default function ConflictBanner({ conflicts, onDismiss, compact = false }) {
    if (!Array.isArray(conflicts) || conflicts.length === 0) return null;

    const visibleConflicts = conflicts.slice(0, 3);
    const remainingCount = conflicts.length - visibleConflicts.length;

    return (
        <section
            className={`card-hard ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
            role="status"
            aria-labelledby="conflict-banner-heading"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="section-label mb-1">Planner notice</p>
                    <h2 id="conflict-banner-heading" className="font-display text-lg font-semibold text-ink">
                        Heads up: your schedule is tight
                    </h2>
                </div>
                {onDismiss && (
                    <button type="button" onClick={onDismiss} className="btn-ghost -mr-2 -mt-2 text-sm">
                        Dismiss
                    </button>
                )}
            </div>

            <ul className={`mt-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
                {visibleConflicts.map((conflict, index) => (
                    <li key={conflict.id ?? `${conflict.type}-${index}`} className="flex items-start gap-2">
                        <span className={`tag-pill shrink-0 ${conflict.severity === 'high' ? 'bg-signal text-paper' : 'bg-forest text-paper'}`}>
                            {SEVERITY_LABEL[conflict.severity] ?? 'NOTICE'}
                        </span>
                        <p className="font-body text-sm leading-relaxed text-ink-muted">{conflict.message}</p>
                    </li>
                ))}
            </ul>

            {remainingCount > 0 && (
                <p className="font-mono text-xs text-ink-faint mt-3">
                    and {remainingCount} more
                </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-5">
                <Link to="/planner" state={{ autoPreview: true }} className="btn-primary text-sm px-4 py-2">
                    Make room
                </Link>
                <Link to="/planner" className="btn-secondary text-sm px-4 py-2">
                    Open planner
                </Link>
            </div>
        </section>
    );
}
