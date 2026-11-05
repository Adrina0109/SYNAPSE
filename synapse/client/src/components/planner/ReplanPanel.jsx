import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import { formatDayKey, formatHours } from './plannerHelpers.js';

const TASK_MOVE_REASON = {
    made_room: 'to make room',
    overdue_to_today: 'overdue work moved to today',
};

const ROADMAP_MOVE_REASON = {
    behind_schedule: 'behind schedule',
    not_enough_free_hours: 'not enough free hours that day',
    shifted_to_keep_order: 'kept in order',
};

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

export default function ReplanPanel({ onApplied = () => {}, autoPreview = false }) {
    const [mode, setMode] = useState('idle');
    const [plan, setPlan] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isPending, setIsPending] = useState(false);
    const busyRef = useRef(false);
    const autoPreviewStarted = useRef(false);

    const previewPlan = useCallback(async () => {
        if (busyRef.current) return;
        busyRef.current = true;
        setIsPending(true);
        setErrorMessage('');
        setSuccessMessage('');
        setPlan(null);
        try {
            const { data } = await api.post('/planner/replan/preview');
            setPlan(data.plan);
            setMode('preview');
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Could not preview your plan. Please try again.'));
            setMode('error');
        } finally {
            busyRef.current = false;
            setIsPending(false);
        }
    }, []);

    const applyPlan = async () => {
        if (busyRef.current || !plan?.hasChanges) return;
        busyRef.current = true;
        setIsPending(true);
        setErrorMessage('');
        try {
            const { data } = await api.post('/planner/replan/apply', {
                fingerprint: plan.fingerprint,
            });
            setSuccessMessage(
                `Plan updated: ${data.result.tasksUpdated} tasks and ${data.result.roadmapDaysUpdated} roadmap days moved.`
            );
            setPlan(null);
            setMode('idle');
            await onApplied();
        } catch (error) {
            setErrorMessage(getErrorMessage(error, 'Could not apply these changes. Please try again.'));
            setMode(error.response?.status === 409 ? 'stale' : 'error');
        } finally {
            busyRef.current = false;
            setIsPending(false);
        }
    };

    const closePreview = () => {
        if (busyRef.current) return;
        setPlan(null);
        setErrorMessage('');
        setMode('idle');
    };

    useEffect(() => {
        if (autoPreview && !autoPreviewStarted.current) {
            autoPreviewStarted.current = true;
            previewPlan();
        }
    }, [autoPreview, previewPlan]);

    const changesCount = plan?.summary?.tasksAffected ?? plan?.taskChanges?.length ?? 0;
    const hoursMoved = plan?.summary?.hoursMoved ?? 0;
    const roadmapDaysMoved = plan?.summary?.roadmapDaysMoved ?? plan?.roadmapChanges?.length ?? 0;

    return (
        <section className="space-y-4" aria-labelledby="replan-heading">
            {successMessage && (
                <div className="border border-forest/30 bg-forest/10 px-4 py-3 font-body text-sm text-forest" role="status" aria-live="polite">
                    {successMessage}
                </div>
            )}

            {mode === 'idle' && (
                <div className="card-hard p-4 sm:p-6">
                    <p className="section-label mb-1">Planner tools</p>
                    <h2 id="replan-heading" className="font-display text-xl font-semibold text-ink">Make room</h2>
                    <p className="font-body text-sm leading-relaxed text-ink-muted mt-2 max-w-2xl">
                        Moves flexible work later so urgent deadlines get the free hours. You see every change before anything is saved.
                    </p>
                    <button
                        type="button"
                        onClick={previewPlan}
                        disabled={isPending}
                        className="btn-primary text-sm px-4 py-2 mt-4"
                    >
                        {isPending ? 'Loading preview...' : 'Preview re-plan'}
                    </button>
                </div>
            )}

            {mode === 'error' && (
                <div className="card-hard p-4 sm:p-6" role="alert">
                    <h2 id="replan-heading" className="font-display text-xl font-semibold text-ink">Could not complete re-plan</h2>
                    <p className="font-body text-sm text-signal mt-2">{errorMessage}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button type="button" onClick={previewPlan} disabled={isPending} className="btn-primary text-sm px-4 py-2">
                            {isPending ? 'Loading...' : 'Try again'}
                        </button>
                        <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2">
                            Close
                        </button>
                    </div>
                </div>
            )}

            {mode === 'stale' && (
                <div className="card-hard p-4 sm:p-6" role="alert">
                    <h2 id="replan-heading" className="font-display text-xl font-semibold text-ink">Preview is out of date</h2>
                    <p className="font-body text-sm text-signal mt-2">{errorMessage}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        <button type="button" onClick={previewPlan} disabled={isPending} className="btn-primary text-sm px-4 py-2">
                            {isPending ? 'Loading preview...' : 'Preview again'}
                        </button>
                        <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {mode === 'preview' && plan && (
                <div className="card-hard p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">Review before saving</p>
                            <h2 id="replan-heading" className="font-display text-xl font-semibold text-ink">Re-plan preview</h2>
                        </div>
                        {!plan.hasChanges && <span className="tag-pill bg-forest text-paper">Fits</span>}
                    </div>

                    {!plan.hasChanges ? (
                        <div className="mt-4">
                            <p className="font-body text-sm text-ink-muted">Your plan already fits. Nothing needs to move.</p>
                            <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2 mt-4">
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="font-body text-sm leading-relaxed text-ink-muted mt-3">
                                Moves {formatHours(hoursMoved)} of task work across {changesCount} tasks and shifts {roadmapDaysMoved} roadmap days.
                            </p>

                            {plan.taskChanges?.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-display text-lg font-semibold text-ink mb-3">Task changes</h3>
                                    <ul className="space-y-3">
                                        {plan.taskChanges.map((task) => (
                                            <li key={task.taskId} className="border border-ink/10 p-3 sm:p-4">
                                                <h4 className="font-body text-sm font-medium text-ink">{task.title}</h4>
                                                <ul className="space-y-2 mt-2">
                                                    {task.moves.map((move, index) => (
                                                        <li key={`${move.from}-${move.to}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <span className="font-mono text-xs text-ink-muted">
                                                                {formatDayKey(move.from)} {'->'} {formatDayKey(move.to)} · {formatHours(move.hours)}
                                                            </span>
                                                            <span className="tag-pill-outline">{TASK_MOVE_REASON[move.reason] ?? move.reason}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {plan.roadmapChanges?.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-display text-lg font-semibold text-ink mb-3">Roadmap changes</h3>
                                    <ul className="space-y-2">
                                        {plan.roadmapChanges.map((change, index) => (
                                            <li key={`${change.roadmapId}-${change.dayNumber}-${index}`} className="border-b border-ink/10 pb-2">
                                                <p className="font-body text-sm text-ink">{change.goal}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="font-mono text-xs text-ink-muted">
                                                        Day {change.dayNumber}: {formatDayKey(change.oldDate)} {'->'} {formatDayKey(change.newDate)}
                                                    </span>
                                                    <span className="tag-pill-outline">{ROADMAP_MOVE_REASON[change.reason] ?? change.reason}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {plan.summary?.roadmapEndDates
                                ?.filter((endDate) => endDate.oldEnd !== endDate.newEnd)
                                .map((endDate) => (
                                    <p key={endDate.roadmapId} className="border-l-2 border-forest bg-forest/5 px-3 py-2 font-body text-sm text-forest mt-4">
                                        Your roadmap now ends on {formatDayKey(endDate.newEnd)} (was {formatDayKey(endDate.oldEnd)}).
                                    </p>
                                ))}

                            {plan.shortfalls?.length > 0 && (
                                <div className="border-2 border-signal bg-signal/5 p-4 mt-6" role="status">
                                    <h3 className="font-display text-lg font-semibold text-signal">Not enough time</h3>
                                    <p className="font-body text-sm leading-relaxed text-ink mt-2">
                                        You are short by {formatHours(plan.summary?.shortfallHours ?? plan.shortfalls.reduce((sum, item) => sum + item.hoursOver, 0))} on {plan.shortfalls.map((item) => formatDayKey(item.date)).join(', ')}. The planner cannot create hours. Consider asking for an extension, trimming a task estimate, or pausing a roadmap.
                                    </p>
                                    <ul className="list-disc pl-5 font-body text-sm text-ink-muted mt-2">
                                        {[...new Set(plan.shortfalls.flatMap((item) => item.titles || []))].map((title) => (
                                            <li key={title}>{title}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {errorMessage && (
                                <p className="font-body text-sm text-signal mt-4" role="alert">{errorMessage}</p>
                            )}

                            <div className="flex flex-wrap gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={applyPlan}
                                    disabled={isPending || !plan.hasChanges}
                                    className="btn-primary text-sm px-4 py-2"
                                >
                                    {isPending ? 'Applying changes...' : 'Apply changes'}
                                </button>
                                <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2">
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
