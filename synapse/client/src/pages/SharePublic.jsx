import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api.js';
import BreakdownBars from '../components/placement/BreakdownBars.jsx';
import ScoreGauge from '../components/placement/ScoreGauge.jsx';
import { formatDayKey } from '../components/planner/plannerHelpers.js';

const formatDate = (value) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    const dayKey = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return formatDayKey(dayKey);
};

const SkillList = ({ title, skills, outlined = false, emptyMessage }) => (
    <section className="min-w-0 space-y-3">
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {skills.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                    <li key={skill} className={outlined ? 'tag-pill-outline' : 'tag-pill'}>{skill}</li>
                ))}
            </ul>
        ) : (
            <p className="font-body text-sm text-ink-faint">{emptyMessage}</p>
        )}
    </section>
);

export default function SharePublic() {
    const { token } = useParams();
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnavailable, setIsUnavailable] = useState(false);
    const [error, setError] = useState('');

    const loadSummary = useCallback(async () => {
        setIsLoading(true);
        setIsUnavailable(false);
        setError('');
        try {
            const { data } = await api.get(`/public/readiness/${token}`);
            setSummary(data);
        } catch (requestError) {
            setSummary(null);
            if (requestError.response?.status === 404) {
                setIsUnavailable(true);
            } else {
                setError(requestError.response?.data?.message || 'Could not load this readiness summary. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    return (
        <main className="share-public-page min-h-screen bg-paper px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-4xl">
                {isLoading && (
                    <div className="card-hard flex items-center justify-center gap-3 p-8" role="status">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
                        <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">Loading readiness</span>
                    </div>
                )}

                {!isLoading && isUnavailable && (
                    <section className="card-hard space-y-3 p-6 text-center sm:p-10" role="status">
                        <h1 className="font-display text-2xl font-semibold text-ink">This link is no longer available.</h1>
                        <p className="font-body text-sm leading-relaxed text-ink-muted">
                            The student can create a new one to share their readiness.
                        </p>
                    </section>
                )}

                {!isLoading && error && (
                    <section className="card-hard space-y-4 p-6 text-center sm:p-10" role="alert">
                        <p className="font-body text-sm leading-relaxed text-signal">{error}</p>
                        <button type="button" onClick={loadSummary} className="btn-secondary text-sm">Try again</button>
                    </section>
                )}

                {!isLoading && summary && (
                    <>
                        <article className="share-public-card card-hard space-y-6 p-4 sm:space-y-8 sm:p-8">
                            <header className="border-b border-ink/10 pb-5">
                                <p className="section-label mb-2">Placement readiness</p>
                                <h1 className="break-words font-display text-3xl font-bold text-ink sm:text-4xl">{summary.name}</h1>
                                <p className="mt-2 break-words font-body text-sm text-ink-muted">
                                    {[summary.department, summary.targetRole].filter(Boolean).join(' · ') || 'Student'}
                                </p>
                            </header>

                            <section className="share-score-grid grid min-w-0 gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)]" aria-label="Readiness score and breakdown">
                                <div className="card-hard flex min-w-0 flex-col items-center justify-center p-4 sm:p-6">
                                    <p className="section-label mb-2">Readiness score</p>
                                    <ScoreGauge score={summary.score} />
                                </div>
                                <BreakdownBars
                                    breakdown={(summary.breakdown || []).map(({ factor, weight, value, contribution }) => ({
                                        factor,
                                        weight,
                                        value,
                                        contribution,
                                        note: '',
                                    }))}
                                />
                            </section>

                            <section className="grid min-w-0 gap-6 border-t border-ink/10 pt-5 sm:grid-cols-2" aria-label="Skills">
                                <SkillList
                                    title="Verified skills"
                                    skills={summary.skills?.verified || []}
                                    emptyMessage="No verified skills yet."
                                />
                                <SkillList
                                    title="Declared skills"
                                    skills={summary.skills?.declared || []}
                                    outlined
                                    emptyMessage="No declared skills yet."
                                />
                            </section>

                            <section className="space-y-3 border-t border-ink/10 pt-5" aria-labelledby="verified-roadmaps-heading">
                                <h2 id="verified-roadmaps-heading" className="font-display text-lg font-semibold text-ink">Verified roadmaps</h2>
                                {summary.verifiedRoadmaps?.length > 0 ? (
                                    <ul className="grid gap-3 sm:grid-cols-2">
                                        {summary.verifiedRoadmaps.map((roadmap, index) => (
                                            <li key={`${roadmap.goal}-${index}`} className="border border-ink/10 p-3">
                                                <p className="break-words font-body text-sm font-medium text-ink">{roadmap.goal}</p>
                                                <p className="mt-1 font-mono text-xs text-ink-faint">Completed {formatDate(roadmap.completedAt)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="font-body text-sm text-ink-faint">No verified roadmaps yet.</p>
                                )}
                            </section>

                            {summary.academics && (
                                <section className="space-y-3 border-t border-ink/10 pt-5" aria-labelledby="academics-heading">
                                    <h2 id="academics-heading" className="font-display text-lg font-semibold text-ink">Academics</h2>
                                    <dl className="grid grid-cols-2 gap-3">
                                        <div className="border border-ink/10 p-3">
                                            <dt className="font-mono text-xs text-ink-faint">CGPA</dt>
                                            <dd className="mt-1 font-display text-xl font-semibold text-ink">{summary.academics.cgpa ?? 'Not provided'}</dd>
                                        </div>
                                        <div className="border border-ink/10 p-3">
                                            <dt className="font-mono text-xs text-ink-faint">Backlogs</dt>
                                            <dd className="mt-1 font-display text-xl font-semibold text-ink">{summary.academics.backlogs ?? 'Not provided'}</dd>
                                        </div>
                                    </dl>
                                </section>
                            )}

                            <footer className="border-t border-ink/10 pt-4">
                                <p className="font-mono text-xs text-ink-faint">Generated {formatDate(summary.generatedAt)}</p>
                            </footer>
                        </article>
                        <div className="no-print mt-5 flex justify-end">
                            <button type="button" onClick={() => window.print()} className="btn-primary w-full sm:w-auto">
                                Print or save as PDF
                            </button>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}
