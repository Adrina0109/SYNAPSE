import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../lib/api.js';
import CertificationBanner from '../components/roadmaps/CertificationBanner.jsx';
import {
    formatDay,
    LEVEL_LABELS,
    PATH_LABELS,
    RESOURCE_LABELS,
    roadmapStatusLabel,
} from '../components/roadmaps/roadmapHelpers.js';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Ring from '../components/ui/Ring.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

export default function RoadmapDetail() {
    const { id } = useParams();
    const [roadmap, setRoadmap] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [pendingDay, setPendingDay] = useState(null);
    const [pendingNotesDay, setPendingNotesDay] = useState(null);
    const [notesErrors, setNotesErrors] = useState({});
    const todayRef = useRef(null);
    const didScrollToday = useRef(false);

    const loadRoadmap = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get(`/roadmaps/${id}`);
            setRoadmap(data.roadmap);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load this roadmap. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setRoadmap(null);
        didScrollToday.current = false;
        loadRoadmap();
    }, [loadRoadmap]);

    useEffect(() => {
        if (!isLoading && roadmap?.progress?.todayDayNumber && todayRef.current && !didScrollToday.current) {
            todayRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
            didScrollToday.current = true;
        }
    }, [isLoading, roadmap]);

    const updateDay = async (dayNumber) => {
        if (pendingDay) return;
        setPendingDay(dayNumber);
        setActionError('');
        try {
            const { data } = await api.patch(`/roadmaps/${id}/days/${dayNumber}/toggle`);
            setRoadmap(data.roadmap);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not update this day. Please try again.');
        } finally {
            setPendingDay(null);
        }
    };

    const loadDayNotes = async (dayNumber, regenerate = false) => {
        if (pendingNotesDay) return;
        setPendingNotesDay(dayNumber);
        setNotesErrors((current) => ({ ...current, [dayNumber]: '' }));
        try {
            const { data } = await api.post(`/roadmaps/${id}/days/${dayNumber}/notes`, regenerate ? { regenerate: true } : {});
            setRoadmap(data.roadmap);
        } catch (error) {
            setNotesErrors((current) => ({
                ...current,
                [dayNumber]: error.response?.data?.message || 'Could not load study notes. Please try again.',
            }));
        } finally {
            setPendingNotesDay(null);
        }
    };

    return (
        <div className="mx-auto w-full max-w-5xl">
                {isLoading ? (
                    <div role="status" aria-label="Loading roadmap">
                        <Card className="space-y-4 p-6">
                            <Skeleton className="h-7 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-40 w-full" />
                        </Card>
                    </div>
                ) : loadError ? (
                    <div className="space-y-4">
                        <Link to="/roadmaps" className="font-body text-sm text-accent underline underline-offset-2">Back to roadmaps</Link>
                        <ErrorState message={loadError} onRetry={loadRoadmap} />
                    </div>
                ) : roadmap ? (
                    <>
                        <PageHeader
                            title={roadmap.goal}
                            subtitle="Your learning plan"
                            actions={<Link to="/roadmaps" className="btn-secondary">Back to roadmaps</Link>}
                        />

                        <div className="mb-8 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <CertificationBanner certification={roadmap.certification} alternatives={[]} />
                            <Card className="flex min-w-0 flex-col items-center gap-5 p-4 sm:flex-row sm:p-5">
                                <Ring value={roadmap.progress?.completionPercent || 0} label="Progress" />
                                <div className="min-w-0 flex-1 space-y-4">
                                    <div className="flex flex-wrap gap-2">
                                        <StatusBadge tone="neutral" label={LEVEL_LABELS[roadmap.currentLevel]} />
                                        <StatusBadge
                                            tone={roadmap.status === 'completed' ? 'success' : roadmap.status === 'active' ? 'accent' : 'neutral'}
                                            label={roadmapStatusLabel(roadmap.status)}
                                        />
                                        <StatusBadge tone="accent" label={PATH_LABELS[roadmap.pathType]} />
                                        <StatusBadge tone="neutral" label={`${roadmap.hoursPerDay}h per day`} />
                                    </div>
                                    <ProgressBar
                                        value={roadmap.progress?.completionPercent || 0}
                                        label={`${roadmap.progress?.completedDays || 0} of ${roadmap.progress?.totalDays || 0} days complete`}
                                    />
                                    <StatusBadge
                                        tone={roadmap.progress?.currentStreak ? 'success' : 'neutral'}
                                        label={roadmap.progress?.currentStreak
                                            ? `STREAK ${roadmap.progress.currentStreak} DAYS`
                                            : 'NO STREAK YET'}
                                    />
                                </div>
                            </Card>
                        </div>

                        {actionError && (
                            <div className="mb-5 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert" aria-live="polite">
                                {actionError}
                            </div>
                        )}

                        {roadmap.days.length === 0 ? (
                            <div className="card-hard p-6 font-body text-sm text-ink-muted">This roadmap has no study days yet.</div>
                        ) : (
                            <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-px before:bg-ink/15">
                                {roadmap.days.map((day) => {
                                    const isToday = roadmap.progress?.todayDayNumber === day.dayNumber;
                                    const isBehind = !isToday && day.dayNumber < (roadmap.progress?.todayDayNumber || 0) && !day.completed;
                                    return (
                                        <li key={day.dayNumber} ref={isToday ? todayRef : null} className="relative pl-9">
                                            <span className={`absolute left-2 top-5 z-10 h-3.5 w-3.5 border ${day.completed ? 'bg-forest border-forest' : isToday ? 'bg-signal border-signal' : 'bg-paper border-ink/30'}`} aria-hidden="true">
                                                {day.completed && <span className="block text-[9px] leading-3 text-paper text-center">✓</span>}
                                            </span>
                                            <article className={`card-hard p-4 sm:p-5 ${day.completed ? 'opacity-65' : ''} ${isToday ? 'border-accent ring-1 ring-accent/30' : ''}`}>
                                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                                            <StatusBadge tone={day.completed ? 'success' : 'neutral'} label={`DAY ${day.dayNumber}`} />
                                                            {day.completed && <StatusBadge tone="success" label="✓ Completed" />}
                                                            {isToday && <StatusBadge tone="accent" label="TODAY" />}
                                                            {isBehind && <StatusBadge tone="warning" label="Behind schedule" />}
                                                            <span className="font-mono text-xs text-ink-faint">{formatDay(day.date)}</span>
                                                        </div>
                                                        <h2 className={`font-display text-xl font-semibold break-words ${day.completed ? 'line-through text-ink-faint' : 'text-ink'}`}>{day.topic}</h2>
                                                        {day.description && <p className="font-body text-sm text-ink-muted mt-2 whitespace-pre-wrap break-words">{day.description}</p>}
                                                        <p className="font-mono text-xs text-ink-faint mt-3">{day.estimatedHours}h estimated</p>
                                                    </div>
                                                    <label className="inline-flex flex-shrink-0 cursor-pointer items-center gap-2 font-body text-sm text-text">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!day.completed}
                                                            disabled={pendingDay === day.dayNumber}
                                                            onChange={() => updateDay(day.dayNumber)}
                                                            aria-label={`${day.completed ? 'Mark incomplete' : 'Mark complete'}: ${day.topic}`}
                                                            className="h-4 w-4 accent-mint"
                                                        />
                                                        {pendingDay === day.dayNumber ? 'Updating…' : day.completed ? 'Completed' : 'Complete'}
                                                    </label>
                                                </div>

                                                {day.practiceTask && (
                                                    <div className="mt-4 border-l-2 border-signal/60 bg-ink/[0.03] p-3">
                                                        <p className="section-label mb-1">Practice task</p>
                                                        <p className="font-body text-sm text-ink-muted whitespace-pre-wrap break-words">{day.practiceTask}</p>
                                                    </div>
                                                )}

                                                {day.resources?.length > 0 && (
                                                    <div className="mt-4">
                                                        <p className="section-label mb-2">Learning resources</p>
                                                        <ul className="space-y-2">
                                                            {day.resources.map((resource, index) => {
                                                                const isOfficialPage = resource.title.toLowerCase().endsWith('official page');
                                                                return (
                                                                    <li key={`${resource.url}-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                        <span className="tag-pill-outline w-fit">{RESOURCE_LABELS[resource.type] || resource.type}</span>
                                                                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-forest underline underline-offset-2 break-all">
                                                                            {resource.title}
                                                                        </a>
                                                                        {!isOfficialPage && (
                                                                            <span className="font-mono text-[10px] text-ink-faint">opens search results</span>
                                                                        )}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                )}

                                                {roadmap.preferredResources?.includes('notes') && (
                                                    <section className="mt-5 border-t border-ink/10 pt-4" aria-label={`Study notes for day ${day.dayNumber}`}>
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                            <h3 className="font-display text-lg font-semibold text-ink">Study notes</h3>
                                                            {!day.notes && (
                                                                <button type="button" onClick={() => loadDayNotes(day.dayNumber)} disabled={pendingNotesDay === day.dayNumber} className="btn-secondary text-sm px-4 py-2">
                                                                    {pendingNotesDay === day.dayNumber ? 'Generating…' : 'Generate notes'}
                                                                </button>
                                                            )}
                                                        </div>
                                                        {notesErrors[day.dayNumber] && (
                                                            <p className="font-body text-sm text-signal mb-3" role="alert">{notesErrors[day.dayNumber]}</p>
                                                        )}
                                                        {day.notes && (
                                                            <details open className="card-hard rounded-xl p-3 sm:p-4">
                                                                <summary className="cursor-pointer font-body text-sm font-medium text-ink">Revision notes</summary>
                                                                <div className="space-y-4 mt-4">
                                                                    <div>
                                                                        <p className="section-label mb-1">Summary</p>
                                                                        <p className="font-body text-sm text-ink-muted whitespace-pre-wrap">{day.notes.summary}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="section-label mb-1">Key points</p>
                                                                        <ul className="list-disc pl-5 font-body text-sm text-ink-muted space-y-1">
                                                                            {day.notes.keyPoints.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <p className="section-label mb-1">Example</p>
                                                                        <pre className="font-mono text-xs text-ink bg-mono border border-ink/10 p-3 whitespace-pre-wrap break-words overflow-x-auto">{day.notes.example}</pre>
                                                                    </div>
                                                                    <div>
                                                                        <p className="section-label mb-1">Common mistakes</p>
                                                                        <ul className="list-disc pl-5 font-body text-sm text-ink-muted space-y-1">
                                                                            {day.notes.commonMistakes.map((mistake, index) => <li key={`${index}-${mistake}`}>{mistake}</li>)}
                                                                        </ul>
                                                                    </div>
                                                                    <div>
                                                                        <p className="section-label mb-1">Quick recap</p>
                                                                        <p className="font-body text-sm text-ink-muted whitespace-pre-wrap">{day.notes.quickRecap}</p>
                                                                    </div>
                                                                    <button type="button" onClick={() => loadDayNotes(day.dayNumber, true)} disabled={pendingNotesDay === day.dayNumber} className="btn-ghost text-sm text-signal">
                                                                        {pendingNotesDay === day.dayNumber ? 'Regenerating…' : 'Regenerate'}
                                                                    </button>
                                                                </div>
                                                            </details>
                                                        )}
                                                    </section>
                                                )}
                                            </article>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </>
                ) : (
                    <div role="alert">
                        <Card className="p-6">
                            <p className="font-body text-sm text-text-muted">Roadmap not found.</p>
                            <Link to="/roadmaps" className="btn-secondary mt-4">Back to roadmaps</Link>
                        </Card>
                    </div>
                )}
        </div>
    );
}
