import Card from '../ui/Card.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import Ring from '../ui/Ring.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { getInitials } from './profileHelpers.js';

export default function ProfileSummary({ user, readiness, isLoading, error }) {
    return (
        <Card className="mb-5 flex min-w-0 flex-col gap-5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-start gap-4">
                <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft font-display text-xl font-semibold text-accent ring-1 ring-accent/20"
                    aria-label={`${user?.name || 'Student'} avatar`}
                >
                    {getInitials(user?.name)}
                </div>
                <div className="min-w-0 space-y-2">
                    <h2 className="break-words font-display text-2xl font-semibold text-text">
                        {user?.name || 'Student'}
                    </h2>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 font-body text-sm text-text-muted">
                        {user?.department && <span>{user.department}</span>}
                        {user?.year != null && <span>Year {user.year}</span>}
                    </div>
                    {user?.targetRole && (
                        <p className="break-words font-body text-sm text-text">
                            <span className="text-text-muted">Target role:</span> {user.targetRole}
                        </p>
                    )}
                    {user?.careerGoal && (
                        <p className="break-words font-body text-sm text-text">
                            <span className="text-text-muted">Career goal:</span> {user.careerGoal}
                        </p>
                    )}
                    {(user?.cgpa != null || user?.backlogs != null) && (
                        <p className="font-mono text-xs text-text-faint">
                            {user?.cgpa != null && `CGPA ${user.cgpa}`}
                            {user?.cgpa != null && user?.backlogs != null && ' · '}
                            {user?.backlogs != null && `${user.backlogs} backlogs`}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex min-w-0 items-center justify-center sm:justify-end">
                {isLoading ? (
                    <div role="status" aria-label="Loading readiness score">
                        <Skeleton className="h-32 w-32 rounded-full" />
                    </div>
                ) : error ? (
                    <div className="w-full sm:max-w-xs"><ErrorState message={error} /></div>
                ) : readiness ? (
                    <Ring value={readiness.score} label="Readiness" size={128} />
                ) : (
                    <p className="font-body text-sm text-text-muted">Readiness score unavailable.</p>
                )}
            </div>
        </Card>
    );
}
