import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import BreakdownBars from '../components/placement/BreakdownBars.jsx';
import NextBestAction from '../components/placement/NextBestAction.jsx';
import ScoreGauge from '../components/placement/ScoreGauge.jsx';
import ScoreHistory from '../components/placement/ScoreHistory.jsx';
import InterviewChecklist from '../components/placement/InterviewChecklist.jsx';
import MockSessions from '../components/placement/MockSessions.jsx';
import ResumeGap from '../components/placement/ResumeGap.jsx';
import DriveList from '../components/placement/DriveList.jsx';
import ShareCard from '../components/placement/ShareCard.jsx';

const PageNav = ({ user, onSignOut }) => (
    <nav className="border-b border-ink/10 px-4 py-4 flex flex-wrap items-center justify-between gap-3 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
            <Link to="/student" className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</Link>
            <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Placement</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
            <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
            <Link to="/student" className="btn-ghost text-sm">Dashboard</Link>
            <button type="button" onClick={onSignOut} className="btn-ghost text-sm">Sign out</button>
        </div>
    </nav>
);

export default function Placement() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [readiness, setReadiness] = useState(null);
    const [history, setHistory] = useState(null);
    const [roadmaps, setRoadmaps] = useState([]);
    const [checklist, setChecklist] = useState(null);
    const [drives, setDrives] = useState([]);
    const [selectedRoadmapId, setSelectedRoadmapId] = useState('');
    const [whatIf, setWhatIf] = useState(null);
    const [whatIfLoading, setWhatIfLoading] = useState(false);
    const [whatIfError, setWhatIfError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const reload = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const [readinessResponse, historyResponse, roadmapsResponse, checklistResponse, drivesResponse] = await Promise.all([
                api.get('/placement/readiness'),
                api.get('/placement/readiness/history'),
                api.get('/roadmaps'),
                api.get('/placement/checklist'),
                api.get('/placement/drives'),
            ]);
            const availableRoadmaps = (roadmapsResponse.data.roadmaps || [])
                .filter((roadmap) => ['active', 'completed'].includes(roadmap.status));
            setReadiness(readinessResponse.data.readiness);
            setHistory(historyResponse.data.history);
            setRoadmaps(availableRoadmaps);
            setChecklist(checklistResponse.data.checklist);
            setDrives(drivesResponse.data.drives || []);
            setSelectedRoadmapId((current) => (
                availableRoadmaps.some((roadmap) => roadmap._id === current)
                    ? current
                    : availableRoadmaps.find((roadmap) => roadmap.status === 'active')?._id
                        || availableRoadmaps[0]?._id
                        || ''
            ));
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load placement readiness. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    useEffect(() => {
        if (!selectedRoadmapId) {
            setWhatIf(null);
            setWhatIfError('');
            return undefined;
        }

        let isCurrent = true;
        setWhatIfLoading(true);
        setWhatIfError('');
        api.get(`/placement/readiness/whatif/${selectedRoadmapId}`)
            .then(({ data }) => {
                if (isCurrent) setWhatIf(data.whatIf);
            })
            .catch((error) => {
                if (isCurrent) {
                    setWhatIf(null);
                    setWhatIfError(error.response?.data?.message || 'Could not calculate this projection.');
                }
            })
            .finally(() => {
                if (isCurrent) setWhatIfLoading(false);
            });
        return () => {
            isCurrent = false;
        };
    }, [selectedRoadmapId]);

    const handleSignOut = async () => {
        await logout();
        navigate('/');
    };

    const handleResumeRoadmapPreview = async (missingSkills) => {
        const { data } = await api.post('/placement/resume-gap/to-roadmap', { missingSkills });
        navigate('/roadmaps', {
            state: {
                preview: data.roadmap,
                certificationAlternatives: data.certificationAlternatives,
            },
        });
    };

    const handleChecklistToggled = (updatedChecklist) => {
        setChecklist((current) => {
            if (!current) return current;
            const tickedKeys = new Set((updatedChecklist.ticks || []).map((tick) => tick.key));
            const updatedItems = new Map((updatedChecklist.items || []).map((item) => [item.key, item]));
            return {
                ...current,
                ...updatedChecklist,
                items: current.items.map((item) => ({
                    ...item,
                    ticked: updatedItems.get(item.key)?.ticked ?? tickedKeys.has(item.key),
                })),
                mockSessions: updatedChecklist.mockSessions ?? current.mockSessions,
            };
        });
    };

    const selectedRoadmap = useMemo(
        () => roadmaps.find((roadmap) => roadmap._id === selectedRoadmapId),
        [roadmaps, selectedRoadmapId]
    );

    return (
        <div className="min-h-screen bg-paper">
            <PageNav user={user} onSignOut={handleSignOut} />
            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
                <header className="mb-7 sm:mb-8">
                    <p className="mb-2 font-mono text-xs tracking-widest uppercase text-signal">Your placement path</p>
                    <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Placement readiness</h1>
                    <p className="mt-2 font-body text-ink-muted">See your progress and find the next step toward your target role.</p>
                </header>

                {loadError && (
                    <div className="card-hard mb-6 p-5 text-center" role="alert">
                        <p className="mb-3 font-body text-sm text-signal">{loadError}</p>
                        <button type="button" onClick={reload} className="btn-secondary text-sm">Try again</button>
                    </div>
                )}
                {isLoading && !readiness && (
                    <div className="card-hard flex items-center justify-center gap-3 p-8" role="status">
                        <div className="h-5 w-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                        <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">Loading readiness</span>
                    </div>
                )}
                {!loadError && readiness && history && (
                    <div className="space-y-6">
                        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]" aria-label="Readiness score details">
                            <div className="card-hard flex min-w-0 flex-col items-center justify-center p-5 sm:p-8">
                                <p className="section-label mb-4">Current score</p>
                                <ScoreGauge score={readiness.score} />
                            </div>
                            <BreakdownBars breakdown={readiness.breakdown} />
                        </section>

                        <section className="grid min-w-0 gap-6 md:grid-cols-2" aria-label="Readiness recommendations and history">
                            <NextBestAction action={readiness.nextBestAction} />
                            <ScoreHistory history={history} />
                        </section>

                        <section className="card-hard min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby="what-if-heading">
                            <div>
                                <p className="section-label mb-2">Projection</p>
                                <h2 id="what-if-heading" className="font-display text-2xl font-semibold text-ink">What-if</h2>
                            </div>
                            {roadmaps.length === 0 ? (
                                <div className="space-y-3">
                                    <p className="font-body text-sm text-ink-muted">Create a roadmap to see how it changes your score.</p>
                                    <Link to="/roadmaps" className="btn-secondary text-sm">Create a roadmap</Link>
                                </div>
                            ) : (
                                <>
                                    <label htmlFor="what-if-roadmap" className="block font-body text-sm text-ink">Choose a roadmap</label>
                                    <select
                                        id="what-if-roadmap"
                                        className="input-base"
                                        value={selectedRoadmapId}
                                        onChange={(event) => setSelectedRoadmapId(event.target.value)}
                                    >
                                        {roadmaps.map((roadmap) => (
                                            <option key={roadmap._id} value={roadmap._id}>
                                                {roadmap.goal} ({roadmap.status})
                                            </option>
                                        ))}
                                    </select>
                                    {whatIfLoading && (
                                        <p className="font-mono text-xs text-ink-faint" role="status">Calculating projection…</p>
                                    )}
                                    {whatIfError && <p className="font-body text-sm text-signal" role="alert">{whatIfError}</p>}
                                    {whatIf && selectedRoadmap && (
                                        <div className="space-y-2">
                                            <p className="font-display text-xl font-semibold text-ink">
                                                Now {whatIf.current.score} <span aria-hidden="true">-&gt;</span> {whatIf.projected.score} if you finish this roadmap
                                            </p>
                                            <p className="font-mono text-sm text-forest">
                                                {whatIf.delta > 0 ? '+' : ''}{whatIf.delta} points
                                            </p>
                                            <p className="font-body text-xs leading-relaxed text-ink-faint">
                                                Finishing a roadmap does not verify a skill until its final quiz is passed.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        {checklist && (
                            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
                                <InterviewChecklist checklist={checklist} onToggled={handleChecklistToggled} />
                                <MockSessions sessions={checklist.mockSessions || []} />
                            </div>
                        )}
                        <ResumeGap onRoadmapPreview={handleResumeRoadmapPreview} />
                        <section className="space-y-4" aria-labelledby="placement-drives-heading">
                            <div>
                                <p className="section-label mb-2">Opportunities</p>
                                <h2 id="placement-drives-heading" className="font-display text-2xl font-semibold text-ink">Placement drives</h2>
                            </div>
                            <DriveList drives={drives} />
                        </section>
                        <ShareCard />
                    </div>
                )}
            </main>
        </div>
    );
}
