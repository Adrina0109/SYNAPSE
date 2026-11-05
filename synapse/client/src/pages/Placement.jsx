import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api.js';
import BreakdownBars from '../components/placement/BreakdownBars.jsx';
import NextBestAction from '../components/placement/NextBestAction.jsx';
import ScoreHistory from '../components/placement/ScoreHistory.jsx';
import InterviewChecklist from '../components/placement/InterviewChecklist.jsx';
import MockSessions from '../components/placement/MockSessions.jsx';
import ResumeGap from '../components/placement/ResumeGap.jsx';
import DriveList from '../components/placement/DriveList.jsx';
import ShareCard from '../components/placement/ShareCard.jsx';
import Card from '../components/ui/Card.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Ring from '../components/ui/Ring.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

export default function Placement() {
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
        <div className="mx-auto w-full max-w-6xl">
                <PageHeader
                    title="Placement readiness"
                    subtitle="See your progress and find the next step toward your target role."
                />

                {loadError && (
                    <div className="mb-6"><ErrorState message={loadError} onRetry={reload} /></div>
                )}
                {isLoading && !readiness && (
                    <div role="status" aria-label="Loading placement readiness">
                        <Card className="space-y-4 p-6">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-40 w-full" />
                        </Card>
                    </div>
                )}
                {!loadError && readiness && history && (
                    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
                        <Card
                            className="flex min-w-0 flex-col items-center justify-center gap-4 p-5 sm:p-8"
                            header={<p className="section-label">Current score</p>}
                        >
                            <Ring value={readiness.score} label="Readiness" size={192} strokeWidth={7} />
                        </Card>
                        <BreakdownBars breakdown={readiness.breakdown} />
                        <NextBestAction action={readiness.nextBestAction} />
                        <ScoreHistory history={history} />

                        <Card className="min-w-0 space-y-4 p-4 sm:p-6">
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
                        </Card>

                        {checklist && (
                            <>
                                <InterviewChecklist checklist={checklist} onToggled={handleChecklistToggled} />
                                <MockSessions sessions={checklist.mockSessions || []} />
                            </>
                        )}
                        <ResumeGap onRoadmapPreview={handleResumeRoadmapPreview} />
                        <Card className="min-w-0 space-y-4 p-4 sm:p-6" aria-labelledby="placement-drives-heading">
                            <div>
                                <p className="section-label mb-2">Opportunities</p>
                                <h2 id="placement-drives-heading" className="font-display text-2xl font-semibold text-ink">Placement drives</h2>
                            </div>
                            <DriveList drives={drives} />
                        </Card>
                        <ShareCard />
                    </div>
                )}
        </div>
    );
}
