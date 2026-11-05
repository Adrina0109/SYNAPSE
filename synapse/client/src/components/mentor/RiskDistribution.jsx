import Card from '../ui/Card.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

const LEVELS = [
    { key: 'high', label: 'High risk', tone: 'danger', color: 'bg-danger' },
    { key: 'medium', label: 'Medium risk', tone: 'warning', color: 'bg-warning' },
    { key: 'low', label: 'Low risk', tone: 'success', color: 'bg-mint' },
];

export default function RiskDistribution({ distribution }) {
    const total = LEVELS.reduce((sum, level) => sum + (distribution?.[level.key] || 0), 0);

    return (
        <Card className="min-w-0 p-4 sm:p-5">
            <div className="mb-4">
                <p className="section-label mb-1">Class overview</p>
                <h2 className="font-display text-xl font-semibold text-text">Risk distribution</h2>
            </div>
            {total === 0 ? (
                <p className="font-body text-sm text-text-muted">Risk data is not available yet.</p>
            ) : (
                <>
                    <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${total} assigned students by risk level`}>
                        {LEVELS.map((level) => {
                            const count = distribution[level.key] || 0;
                            return count > 0 ? (
                                <span
                                    key={level.key}
                                    className={level.color}
                                    style={{ width: `${(count / total) * 100}%` }}
                                    title={`${level.label}: ${count}`}
                                />
                            ) : null;
                        })}
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                        {LEVELS.map((level) => (
                            <li key={level.key} className="flex min-w-0 items-center justify-between gap-2">
                                <StatusBadge tone={level.tone} label={level.label} />
                                <span className="font-mono text-sm text-text">{distribution[level.key] || 0}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Card>
    );
}
