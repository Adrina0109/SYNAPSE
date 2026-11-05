import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api.js';
import { formatDayKey, formatHours } from './plannerHelpers.js';
import Card from '../ui/Card.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';

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
                <div className="rounded-xl border border-mint/25 bg-mint/10 px-4 py-3 font-body text-sm text-mint" role="status" aria-live="polite">
                    {successMessage}
                </div>
            )}

            {mode === 'idle' && (
                <Card className="p-4 sm:p-6">
                    <p className="section-label mb-1">Planner tools</p>
                    <h2 id="replan-heading" className="font-display text-xl font-semibold text-text">Make room</h2>
                    <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-text-muted">
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
                </Card>
            )}

            {mode === 'error' && (
                <Card className="p-4 sm:p-6">
                    <div role="alert">
                        <h2 id="replan-heading" className="font-display text-xl font-semibold text-text">Could not complete re-plan</h2>
                        <p className="mt-2 font-body text-sm text-danger">{errorMessage}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={previewPlan} disabled={isPending} className="btn-primary text-sm px-4 py-2">
                                {isPending ? 'Loading...' : 'Try again'}
                            </button>
                            <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2">
                                Close
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {mode === 'stale' && (
                <Card className="p-4 sm:p-6">
                    <div role="alert">
                        <h2 id="replan-heading" className="font-display text-xl font-semibold text-text">Preview is out of date</h2>
                        <p className="mt-2 font-body text-sm text-danger">{errorMessage}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={previewPlan} disabled={isPending} className="btn-primary text-sm px-4 py-2">
                                {isPending ? 'Loading preview...' : 'Preview again'}
                            </button>
                            <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2">
                                Cancel
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {mode === 'preview' && plan && (
                <Card className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="section-label mb-1">Review before saving</p>
                            <h2 id="replan-heading" className="font-display text-xl font-semibold text-text">Re-plan preview</h2>
                        </div>
                        {!plan.hasChanges && <StatusBadge tone="success" label="Fits" />}
                    </div>

                    {!plan.hasChanges ? (
                        <div className="mt-4">
                            <p className="font-body text-sm text-text-muted">Your plan already fits. Nothing needs to move.</p>
                            <button type="button" onClick={closePreview} disabled={isPending} className="btn-secondary text-sm px-4 py-2 mt-4">
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="mt-3 font-body text-sm leading-relaxed text-text-muted">
                                Moves {formatHours(hoursMoved)} of task work across {changesCount} tasks and shifts {roadmapDaysMoved} roadmap days.
                            </p>

                            {plan.taskChanges?.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="mb-3 font-display text-lg font-semibold text-text">Task changes</h3>
                                    <ul className="space-y-3">
                                        {plan.taskChanges.map((task) => (
                                            <li key={task.taskId} className="rounded-lg border border-border bg-surface-2/40 p-3 sm:p-4">
                                                <h4 className="font-body text-sm font-medium text-text">{task.title}</h4>
                                                <ul className="mt-2 space-y-2">
                                                    {task.moves.map((move, index) => (
                                                        <li key={`${move.from}-${move.to}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            <span className="font-mono text-xs text-text-muted">
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
                                    <h3 className="mb-3 font-display text-lg font-semibold text-text">Roadmap changes</h3>
                                    <ul className="space-y-2">
                                        {plan.roadmapChanges.map((change, index) => (
                                            <li key={`${change.roadmapId}-${change.dayNumber}-${index}`} className="border-b border-border pb-2">
                                                <p className="font-body text-sm text-text">{change.goal}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="font-mono text-xs text-text-muted">
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
                                    <p key={endDate.roadmapId} className="mt-4 rounded-lg border-l-2 border-mint bg-mint/10 px-3 py-2 font-body text-sm text-mint">
                                        Your roadmap now ends on {formatDayKey(endDate.newEnd)} (was {formatDayKey(endDate.oldEnd)}).
                                    </p>
                                ))}

                            {plan.shortfalls?.length > 0 && (
                                <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4" role="status">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-display text-lg font-semibold text-text">Not enough time</h3>
                                        <StatusBadge tone="danger" label="Capacity shortfall" />
                                    </div>
                                    <p className="mt-2 font-body text-sm leading-relaxed text-text">
                                        You are short by {formatHours(plan.summary?.shortfallHours ?? plan.shortfalls.reduce((sum, item) => sum + item.hoursOver, 0))} on {plan.shortfalls.map((item) => formatDayKey(item.date)).join(', ')}. The planner cannot create hours. Consider asking for an extension, trimming a task estimate, or pausing a roadmap.
                                    </p>
                                    <ul className="mt-2 list-disc pl-5 font-body text-sm text-text-muted">
                                        {[...new Set(plan.shortfalls.flatMap((item) => item.titles || []))].map((title) => (
                                            <li key={title}>{title}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {errorMessage && (
                                <p className="mt-4 font-body text-sm text-danger" role="alert">{errorMessage}</p>
                            )}

                            <div className="mt-6 flex flex-wrap gap-2">
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
                </Card>
            )}
        </section>
    );
}
