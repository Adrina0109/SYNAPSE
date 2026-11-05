import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import CertificationBanner from '../components/roadmaps/CertificationBanner.jsx';
import RoadmapForm from '../components/roadmaps/RoadmapForm.jsx';
import {
    formatDay,
    LEVEL_LABELS,
    PATH_LABELS,
    roadmapStatusLabel,
} from '../components/roadmaps/roadmapHelpers.js';

export default function Roadmaps() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [roadmaps, setRoadmaps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewAlternatives, setPreviewAlternatives] = useState([]);
    const [previewInputs, setPreviewInputs] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState('');

    const loadRoadmaps = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get('/roadmaps');
            setRoadmaps(data.roadmaps || []);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load roadmaps. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoadmaps();
    }, [loadRoadmaps]);

    const generatePreview = async (values = previewInputs) => {
        if (!values || isGenerating) return;
        setIsGenerating(true);
        setActionError('');
        try {
            const { data } = await api.post('/roadmaps/generate', values);
            setPreview(data.roadmap);
            setPreviewAlternatives(data.certificationAlternatives || []);
            setPreviewInputs(values);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not build this roadmap. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const savePreview = async () => {
        if (!preview || isSaving) return;
        setIsSaving(true);
        setActionError('');
        try {
            const { data } = await api.post('/roadmaps', preview);
            navigate(`/roadmaps/${data.roadmap._id}`);
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not save this roadmap. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRoadmap = async (roadmapId) => {
        setIsDeleting(roadmapId);
        setActionError('');
        try {
            await api.delete(`/roadmaps/${roadmapId}`);
            setRoadmaps((current) => current.filter((roadmap) => roadmap._id !== roadmapId));
            setConfirmingDelete('');
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not delete this roadmap. Please try again.');
        } finally {
            setIsDeleting('');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/student" className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</Link>
                    <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Roadmaps</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/student" className="btn-ghost text-sm">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                        <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Build a learning path</p>
                        <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Roadmaps</h1>
                        <p className="font-body text-ink-muted mt-2">A focused plan, shaped around your goal and schedule.</p>
                    </div>
                    {!preview && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreating((current) => !current);
                                setActionError('');
                            }}
                            className="btn-primary w-full sm:w-auto"
                        >
                            {isCreating ? 'Close form' : 'New roadmap'}
                        </button>
                    )}
                </header>

                {actionError && (
                    <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert" aria-live="polite">
                        {actionError}
                    </div>
                )}

                {isCreating && !preview && (
                    <section className="card-hard p-4 sm:p-6 mb-8" aria-labelledby="roadmap-form-heading">
                        <p className="section-label mb-1">Start with your goal</p>
                        <h2 id="roadmap-form-heading" className="font-display text-xl font-semibold text-ink mb-5">Plan your learning</h2>
                        <RoadmapForm
                            user={user}
                            onSubmit={(values) => {
                                setPreviewInputs(values);
                                return generatePreview(values);
                            }}
                            isSubmitting={isGenerating}
                        />
                    </section>
                )}

                {preview && (
                    <section className="card-hard p-4 sm:p-6 mb-10 space-y-5" aria-labelledby="roadmap-preview-heading">
                        <div className="border border-signal/40 bg-signal/5 px-4 py-3">
                            <p className="font-mono text-xs uppercase text-signal">AI-generated preview · not saved yet</p>
                            <p className="font-body text-sm text-ink-muted mt-1">Review the plan before adding it to your roadmaps.</p>
                        </div>
                        <div>
                            <p className="section-label mb-1">Your plan</p>
                            <h2 id="roadmap-preview-heading" className="font-display text-2xl sm:text-3xl font-semibold text-ink break-words">{preview.goal}</h2>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="tag-pill-outline">{LEVEL_LABELS[preview.currentLevel]}</span>
                                <span className="tag-pill-outline">{PATH_LABELS[preview.pathType]}</span>
                                <span className="tag-pill-outline">{preview.hoursPerDay}h per day</span>
                                <span className="tag-pill-outline">{preview.durationDays} days</span>
                            </div>
                        </div>
                        <CertificationBanner certification={preview.certification} alternatives={previewAlternatives} />
                        <div>
                            <h3 className="section-label mb-3">Day-by-day plan</h3>
                            <ol className="divide-y divide-ink/10">
                                {preview.days.map((day) => (
                                    <li key={day.dayNumber} className="py-3 flex items-start gap-3">
                                        <span className="tag-pill flex-shrink-0">DAY {day.dayNumber}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-body text-sm font-medium text-ink break-words">{day.topic}</p>
                                            <p className="font-mono text-xs text-ink-faint mt-1">{formatDay(day.date)} · {day.estimatedHours}h</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                            <button type="button" onClick={savePreview} disabled={isSaving || isGenerating} className="btn-primary w-full sm:w-auto">
                                {isSaving ? 'Saving…' : 'Save roadmap'}
                            </button>
                            <button type="button" onClick={() => generatePreview()} disabled={isSaving || isGenerating} className="btn-secondary w-full sm:w-auto">
                                {isGenerating ? 'Regenerating…' : 'Regenerate'}
                            </button>
                            <button
                                type="button"
                                disabled={isSaving || isGenerating}
                                onClick={() => {
                                    setPreview(null);
                                    setPreviewAlternatives([]);
                                    setPreviewInputs(null);
                                    setIsCreating(false);
                                    setActionError('');
                                }}
                                className="btn-ghost w-full sm:w-auto"
                            >
                                Discard
                            </button>
                        </div>
                    </section>
                )}

                <section aria-labelledby="saved-roadmaps-heading">
                    <div className="mb-4">
                        <p className="section-label mb-1">Your learning plans</p>
                        <h2 id="saved-roadmaps-heading" className="font-display text-2xl font-semibold text-ink">Saved roadmaps</h2>
                    </div>
                    {isLoading ? (
                        <div className="card-hard p-6 font-mono text-xs text-ink-faint" role="status">Loading roadmaps…</div>
                    ) : loadError ? (
                        <div className="card-hard p-6" role="alert">
                            <p className="font-body text-sm text-signal">{loadError}</p>
                            <button type="button" onClick={loadRoadmaps} className="btn-secondary mt-4">Try again</button>
                        </div>
                    ) : roadmaps.length === 0 ? (
                        <div className="card-hard p-6 sm:p-8 text-center">
                            <h3 className="font-display text-xl font-semibold text-ink">No saved roadmaps yet</h3>
                            <p className="font-body text-sm text-ink-muted mt-2">Create a plan to turn your goal into manageable daily steps.</p>
                            {!preview && (
                                <button type="button" onClick={() => setIsCreating(true)} className="btn-primary mt-5">
                                    Create your first roadmap
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {roadmaps.map((roadmap) => (
                                <article key={roadmap._id} className="card-hard p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="font-display text-xl font-semibold text-ink break-words">{roadmap.goal}</h3>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="tag-pill-outline">{LEVEL_LABELS[roadmap.currentLevel]}</span>
                                                <span className="tag-pill-outline">{PATH_LABELS[roadmap.pathType]}</span>
                                                <span className={roadmap.status === 'completed' ? 'tag-pill-outline' : 'tag-pill'}>{roadmapStatusLabel(roadmap.status)}</span>
                                            </div>
                                            <p className="font-mono text-xs text-ink-faint mt-3">{roadmap.hoursPerDay}h per day · {roadmap.durationDays} days</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link to={`/roadmaps/${roadmap._id}`} className="btn-secondary text-sm px-4 py-2">Open</Link>
                                            {confirmingDelete === roadmap._id ? (
                                                <>
                                                    <span className="font-body text-xs text-ink-muted">Delete this roadmap?</span>
                                                    <button type="button" onClick={() => setConfirmingDelete('')} className="btn-ghost text-sm">Cancel</button>
                                                    <button type="button" onClick={() => deleteRoadmap(roadmap._id)} disabled={isDeleting === roadmap._id} className="btn-primary text-sm px-4 py-2">
                                                        {isDeleting === roadmap._id ? 'Deleting…' : 'Confirm delete'}
                                                    </button>
                                                </>
                                            ) : (
                                                <button type="button" onClick={() => setConfirmingDelete(roadmap._id)} className="btn-ghost text-sm text-signal">Delete</button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between gap-3 font-mono text-xs text-ink-faint mb-2">
                                            <span>{roadmap.progress?.completionPercent || 0}% complete</span>
                                            <span>{roadmap.progress?.currentStreak || 0} day streak</span>
                                        </div>
                                        <div className="h-2 bg-ink/10 overflow-hidden" role="progressbar" aria-valuenow={roadmap.progress?.completionPercent || 0} aria-valuemin="0" aria-valuemax="100" aria-label={`${roadmap.goal} progress`}>
                                            <div className="h-full bg-forest transition-all" style={{ width: `${roadmap.progress?.completionPercent || 0}%` }} />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
