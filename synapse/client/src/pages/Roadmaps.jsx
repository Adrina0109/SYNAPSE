import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import CertificationBanner from '../components/roadmaps/CertificationBanner.jsx';
import RoadmapForm from '../components/roadmaps/RoadmapForm.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import {
    formatDay,
    LEVEL_LABELS,
    PATH_LABELS,
    roadmapStatusLabel,
} from '../components/roadmaps/roadmapHelpers.js';

export default function Roadmaps() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
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

    useEffect(() => {
        if (location.state?.preview) {
            setPreview(location.state.preview);
            setPreviewAlternatives(location.state.certificationAlternatives || []);
            setPreviewInputs(null);
            setIsCreating(false);
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

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

    return (
        <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    title="Roadmaps"
                    subtitle="AI-generated paths to a skill, with daily tasks and progress."
                    actions={!preview && (
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
                />

                {actionError && (
                    <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert" aria-live="polite">
                        {actionError}
                    </div>
                )}

                {isCreating && !preview && (
                    <Card className="mb-8 p-4 sm:p-6">
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
                    </Card>
                )}

                {preview && (
                    <Card className="mb-10 space-y-5 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3">
                            <div>
                                <p className="font-mono text-xs uppercase text-accent">AI-generated preview · not saved yet</p>
                                <p className="mt-1 font-body text-sm text-text-muted">Review the plan before adding it to your roadmaps.</p>
                            </div>
                            <StatusBadge tone="accent" label="Preview" />
                        </div>
                        <div>
                            <p className="section-label mb-1">Your plan</p>
                            <h2 id="roadmap-preview-heading" className="font-display text-2xl sm:text-3xl font-semibold text-ink break-words">{preview.goal}</h2>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <StatusBadge tone="neutral" label={LEVEL_LABELS[preview.currentLevel]} />
                                <StatusBadge tone="accent" label={PATH_LABELS[preview.pathType]} />
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
                    </Card>
                )}

                <section aria-labelledby="saved-roadmaps-heading">
                    <div className="mb-4">
                        <p className="section-label mb-1">Your learning plans</p>
                        <h2 id="saved-roadmaps-heading" className="font-display text-2xl font-semibold text-ink">Saved roadmaps</h2>
                    </div>
                    {isLoading ? (
                        <div role="status" aria-label="Loading roadmaps">
                            <Card className="space-y-4 p-6">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-2 w-full" />
                            </Card>
                        </div>
                    ) : loadError ? (
                        <ErrorState message={loadError} onRetry={loadRoadmaps} />
                    ) : roadmaps.length === 0 ? (
                        <Card className="p-6 text-center sm:p-8">
                            <h3 className="font-display text-xl font-semibold text-ink">No saved roadmaps yet</h3>
                            <p className="font-body text-sm text-ink-muted mt-2">Create a plan to turn your goal into manageable daily steps.</p>
                            {!preview && (
                                <button type="button" onClick={() => setIsCreating(true)} className="btn-primary mt-5">
                                    Create your first roadmap
                                </button>
                            )}
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {roadmaps.map((roadmap) => (
                                <Card key={roadmap._id} className="space-y-4 p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="font-display text-xl font-semibold text-ink break-words">{roadmap.goal}</h3>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <StatusBadge tone="neutral" label={LEVEL_LABELS[roadmap.currentLevel]} />
                                                <StatusBadge tone="accent" label={PATH_LABELS[roadmap.pathType]} />
                                                <StatusBadge
                                                    tone={roadmap.status === 'completed' ? 'success' : roadmap.status === 'active' ? 'accent' : 'neutral'}
                                                    label={roadmapStatusLabel(roadmap.status)}
                                                />
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
                                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                        <ProgressBar value={roadmap.progress?.completionPercent || 0} label="Progress" />
                                        <StatusBadge tone="neutral" label={`${roadmap.progress?.currentStreak || 0} day streak`} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
        </div>
    );
}
