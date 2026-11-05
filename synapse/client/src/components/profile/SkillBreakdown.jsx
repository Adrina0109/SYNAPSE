import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { normalizeSkill } from './profileHelpers.js';

const roadmapMatchesSkill = (roadmap, skill) => {
    const goal = normalizeSkill(roadmap.goal);
    const normalized = normalizeSkill(skill);
    return goal === normalized || (normalized.length >= 3 && goal.includes(normalized));
};

export default function SkillBreakdown({
    declaredSkills,
    roadmaps,
    verifiedSkills,
    isLoading,
    error,
}) {
    if (isLoading) {
        return (
            <Card className="space-y-4 p-5" aria-label="Loading skill breakdown">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
                <div className="h-24 animate-pulse rounded bg-surface-2" />
            </Card>
        );
    }

    if (error) return <ErrorState message={error} />;

    const declared = (declaredSkills || []).filter(Boolean);
    const roadmapSkills = (roadmaps || [])
        .filter((roadmap) => roadmap.goal && !declared.some((skill) => roadmapMatchesSkill(roadmap, skill)))
        .map((roadmap) => roadmap.goal);
    const skills = [...new Map(
        [...declared, ...roadmapSkills].map((skill) => [normalizeSkill(skill), skill])
    ).values()];

    if (skills.length === 0) {
        return <EmptyState title="No skills to show" body="Add declared skills or create a roadmap to see skill progress." />;
    }

    const verified = new Set((verifiedSkills || []).map(normalizeSkill));

    return (
        <Card className="min-w-0 space-y-5 p-4 sm:p-6">
            <div>
                <p className="section-label mb-1">Learning</p>
                <h2 className="font-display text-xl font-semibold text-text">Skill breakdown</h2>
            </div>
            {skills.map((skill) => {
                const linkedRoadmaps = (roadmaps || []).filter((roadmap) => roadmapMatchesSkill(roadmap, skill));
                const completed = linkedRoadmaps.reduce(
                    (total, roadmap) => total + (roadmap.days || []).filter((day) => day.completed).length,
                    0
                );
                const total = linkedRoadmaps.reduce((sum, roadmap) => sum + (roadmap.days || []).length, 0);
                return (
                    <div key={normalizeSkill(skill)} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-body text-sm font-medium text-text">{skill}</h3>
                            {verified.has(normalizeSkill(skill)) && <StatusBadge tone="success" label="Verified" />}
                        </div>
                        {total > 0 ? (
                            <>
                                <ProgressBar
                                    value={(completed / total) * 100}
                                    label={`${completed} of ${total} roadmap days`}
                                />
                                <p className="font-mono text-[10px] text-text-faint">
                                    {linkedRoadmaps.map((roadmap) => roadmap.goal).join(' · ')}
                                </p>
                            </>
                        ) : (
                            <p className="font-body text-xs text-text-muted">No linked roadmap progress yet.</p>
                        )}
                    </div>
                );
            })}
            <p className="font-body text-xs text-text-faint">
                Declared skills are not treated as verified unless placement data explicitly marks them verified.
            </p>
        </Card>
    );
}
