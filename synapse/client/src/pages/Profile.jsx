import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';
import AchievementTimeline from '../components/profile/AchievementTimeline.jsx';
import ActivityHeatmap from '../components/profile/ActivityHeatmap.jsx';
import ProfileSummary from '../components/profile/ProfileSummary.jsx';
import ReadinessTrend from '../components/profile/ReadinessTrend.jsx';
import SkillBreakdown from '../components/profile/SkillBreakdown.jsx';
import TaskBreakdown from '../components/profile/TaskBreakdown.jsx';
import MetricCard from '../components/ui/MetricCard.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

const initialSection = () => ({ data: null, isLoading: true, error: '' });

const errorMessage = (error, fallback) => error.response?.data?.message || fallback;

export default function Profile() {
    const { user } = useAuth();
    const [tasksSection, setTasksSection] = useState(initialSection);
    const [roadmapsSection, setRoadmapsSection] = useState(initialSection);
    const [readinessSection, setReadinessSection] = useState(initialSection);
    const [historySection, setHistorySection] = useState(initialSection);
    const [checklistSection, setChecklistSection] = useState(initialSection);

    useEffect(() => {
        let isCurrent = true;
        const loadSection = async (setter, request, fallback) => {
            try {
                const data = await request();
                if (isCurrent) setter({ data, isLoading: false, error: '' });
            } catch (error) {
                if (isCurrent) setter({
                    data: null,
                    isLoading: false,
                    error: errorMessage(error, fallback),
                });
            }
        };

        const loadRoadmaps = async () => {
            try {
                const { data } = await api.get('/roadmaps');
                const roadmaps = data.roadmaps || [];
                const details = await Promise.all(roadmaps.map(async (roadmap) => {
                    try {
                        const response = await api.get(`/roadmaps/${roadmap._id}`);
                        return { ...roadmap, ...(response.data.roadmap || {}) };
                    } catch {
                        return { ...roadmap, detailLoadFailed: true };
                    }
                }));
                const hasDetailErrors = details.some((roadmap) => roadmap.detailLoadFailed);
                if (isCurrent) {
                    setRoadmapsSection({
                        data: details,
                        isLoading: false,
                        error: hasDetailErrors ? 'Some roadmap details could not be loaded.' : '',
                    });
                }
            } catch (error) {
                if (isCurrent) {
                    setRoadmapsSection({
                        data: null,
                        isLoading: false,
                        error: errorMessage(error, 'Could not load roadmaps.'),
                    });
                }
            }
        };

        Promise.all([
            loadSection(
                setTasksSection,
                async () => {
                    const { data } = await api.get('/tasks');
                    return data.tasks || [];
                },
                'Could not load tasks.'
            ),
            loadRoadmaps(),
            loadSection(
                setReadinessSection,
                async () => {
                    const { data } = await api.get('/placement/readiness');
                    return data.readiness;
                },
                'Could not load readiness.'
            ),
            loadSection(
                setHistorySection,
                async () => {
                    const { data } = await api.get('/placement/readiness/history');
                    return data.history;
                },
                'Could not load readiness history.'
            ),
            loadSection(
                setChecklistSection,
                async () => {
                    const { data } = await api.get('/placement/checklist');
                    return data.checklist;
                },
                'Could not load interview activity.'
            ),
        ]);

        return () => {
            isCurrent = false;
        };
    }, []);

    const tasks = tasksSection.data || [];
    const roadmaps = roadmapsSection.data || [];
    const readiness = readinessSection.data;
    const checklist = checklistSection.data;
    const verifiedSkills = readiness?.skills?.verified;
    const checklistItems = checklist?.items || [];
    const checklistTickedCount = checklistItems.filter((item) => item.ticked).length;
    const activitySourceErrors = [tasksSection.error, roadmapsSection.error].filter(Boolean);

    const completions = useMemo(() => [
        ...tasks.filter((task) => task.completedAt).map((task) => ({ date: task.completedAt })),
        ...roadmaps.flatMap((roadmap) => (roadmap.days || [])
            .filter((day) => day.completed && day.completedAt)
            .map((day) => ({ date: day.completedAt }))),
    ], [tasks, roadmaps]);

    const achievements = useMemo(() => {
        const taskAchievements = tasks
            .filter((task) => task.status === 'completed' && task.completedAt)
            .map((task) => ({
                id: `task-${task._id}`,
                date: task.completedAt,
                kind: 'Task',
                tone: 'success',
                message: `Completed ${task.title}`,
            }));
        const roadmapAchievements = roadmaps.flatMap((roadmap) => (roadmap.days || [])
            .filter((day) => day.completed && day.completedAt)
            .map((day) => ({
                id: `roadmap-${roadmap._id}-${day.dayNumber}`,
                date: day.completedAt,
                kind: 'Roadmap',
                tone: 'accent',
                message: `Finished day ${day.dayNumber}: ${day.topic}`,
            })));
        const mockAchievements = (checklist?.mockSessions || []).map((session) => ({
            id: `mock-${session._id || `${session.date}-${session.rating}`}`,
            date: session.date,
            kind: 'Mock interview',
            tone: 'info',
            message: `Completed a mock interview · ${session.rating}/5`,
        }));

        return [...taskAchievements, ...roadmapAchievements, ...mockAchievements]
            .filter((achievement) => achievement.date && Number.isFinite(new Date(achievement.date).getTime()))
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
            .slice(0, 8);
    }, [checklist, roadmaps, tasks]);

    const taskMetrics = useMemo(() => {
        const completed = tasks.filter((task) => task.status === 'completed');
        const onTime = completed.filter((task) => (
            task.completedAt
            && task.deadline
            && new Date(task.completedAt).getTime() <= new Date(task.deadline).getTime()
        )).length;
        return { completed: completed.length, onTime };
    }, [tasks]);

    const roadmapMetrics = useMemo(() => ({
        daysCompleted: roadmaps.reduce(
            (total, roadmap) => total + (roadmap.days || []).filter((day) => day.completed).length,
            0
        ),
        active: roadmaps.filter((roadmap) => roadmap.status === 'active').length,
        completed: roadmaps.filter((roadmap) => roadmap.status === 'completed').length,
    }), [roadmaps]);

    const loadingMetrics = tasksSection.isLoading || roadmapsSection.isLoading;
    const readinessMetricsLoading = readinessSection.isLoading;
    const mockMetricsLoading = checklistSection.isLoading;

    return (
        <div className="mx-auto w-full max-w-6xl">
            <PageHeader title="Profile analysis" subtitle="Your progress, activity, and learning profile in one place." />

            <ProfileSummary
                user={user}
                readiness={readiness}
                isLoading={readinessSection.isLoading}
                error={readinessSection.error}
            />

            <section aria-label="Profile summary statistics" className="mb-5 grid min-w-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <MetricCard
                    label="Tasks completed"
                    value={tasksSection.error ? '—' : loadingMetrics ? '…' : taskMetrics.completed}
                    hint={tasksSection.error || (loadingMetrics ? 'Loading tasks' : `${taskMetrics.onTime} completed by deadline`)}
                />
                <MetricCard
                    label="Roadmap days"
                    value={roadmapsSection.error && !roadmaps.length ? '—' : roadmapsSection.isLoading ? '…' : roadmapMetrics.daysCompleted}
                    hint={roadmapsSection.error || `${roadmapMetrics.active} active · ${roadmapMetrics.completed} completed`}
                />
                <MetricCard
                    label="Active roadmaps"
                    value={roadmapsSection.isLoading ? '…' : roadmapsSection.error && !roadmaps.length ? '—' : roadmapMetrics.active}
                    hint={roadmapsSection.error || 'Currently in progress'}
                />
                <MetricCard
                    label="Completed roadmaps"
                    value={roadmapsSection.isLoading ? '…' : roadmapsSection.error && !roadmaps.length ? '—' : roadmapMetrics.completed}
                    hint={roadmapsSection.error || 'Finished learning plans'}
                />
                {Array.isArray(verifiedSkills) && (
                    <MetricCard
                        label="Verified skills"
                        value={readinessMetricsLoading ? '…' : verifiedSkills.length}
                        hint={readinessSection.error || 'Verified in placement data'}
                    />
                )}
                <MetricCard
                    label="Mock interviews"
                    value={mockMetricsLoading ? '…' : checklistSection.error ? '—' : checklist?.mockSessions?.length || 0}
                    hint={mockMetricsLoading
                        ? 'Loading interview activity'
                        : checklistSection.error || `${checklistTickedCount} of ${checklistItems.length} interview checklist items ticked`}
                />
            </section>

            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <ActivityHeatmap
                    completions={completions}
                    isLoading={tasksSection.isLoading || roadmapsSection.isLoading}
                    error={activitySourceErrors.length ? `Activity is partial: ${activitySourceErrors.join(' ')}` : ''}
                />
                <TaskBreakdown
                    tasks={tasks}
                    isLoading={tasksSection.isLoading}
                    error={tasksSection.error}
                />
                <SkillBreakdown
                    declaredSkills={user?.skills || []}
                    roadmaps={roadmaps}
                    verifiedSkills={verifiedSkills || []}
                    isLoading={roadmapsSection.isLoading}
                    error={roadmapsSection.error}
                />
                <ReadinessTrend
                    history={historySection.data}
                    isLoading={historySection.isLoading}
                    error={historySection.error}
                />
                <div className="lg:col-span-2">
                    <AchievementTimeline
                        achievements={achievements}
                        isLoading={tasksSection.isLoading || roadmapsSection.isLoading || checklistSection.isLoading}
                        errors={[tasksSection.error, roadmapsSection.error, checklistSection.error].filter(Boolean)}
                    />
                </div>
            </div>
        </div>
    );
}
