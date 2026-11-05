import { formatDayKey } from '../planner/plannerHelpers.js';
import StatusBadge from '../ui/StatusBadge.jsx';

const istDayKey = (date) => new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});

export default function DriveList({ drives }) {
    if (drives.length === 0) {
        return (
            <div className="card-hard p-5 text-center">
                <p className="font-body text-sm text-ink-muted">No upcoming drives yet.</p>
            </div>
        );
    }

    return (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {drives.map((drive) => (
                <article key={drive._id} className="card-hard min-w-0 space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="break-words font-display text-xl font-semibold text-ink">{drive.company}</h3>
                            <p className="mt-1 break-words font-body text-sm text-ink-muted">{drive.role}</p>
                        </div>
                        {drive.eligibility && (
                            <StatusBadge
                                tone={drive.eligibility.eligible ? 'success' : 'danger'}
                                label={drive.eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                            />
                        )}
                    </div>
                    <p className="font-mono text-xs text-ink-faint">{formatDayKey(istDayKey(drive.date))}</p>
                    {drive.eligibility?.reasons?.length > 0 && (
                        <ul className="space-y-1 border-l-2 border-signal/50 pl-3 font-body text-xs leading-relaxed text-ink-muted">
                            {drive.eligibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                        </ul>
                    )}
                    <p className="break-words border-t border-ink/10 pt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
                        Min CGPA {drive.minCgpa} · Backlogs up to {drive.maxBacklogs ?? 'any'} · {drive.branches?.length ? drive.branches.join(', ') : 'All branches'}
                    </p>
                </article>
            ))}
        </div>
    );
}
