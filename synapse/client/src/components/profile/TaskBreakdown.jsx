import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import ErrorState from '../ui/ErrorState.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';
import { formatProfileDate } from './profileHelpers.js';

const CATEGORIES = ['assessment', 'assignment', 'placement', 'event', 'personal'];

export default function TaskBreakdown({ tasks, isLoading, error }) {
    if (isLoading) {
        return (
            <Card className="space-y-4 p-5" aria-label="Loading task breakdown">
                <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
                <div className="h-24 animate-pulse rounded bg-surface-2" />
            </Card>
        );
    }

    if (error) return <ErrorState message={error} />;
    if (tasks.length === 0) {
        return <EmptyState title="No tasks yet" body="Your task categories and completion progress will show here." />;
    }

    const now = Date.now();
    const categoryStats = CATEGORIES.map((category) => {
        const categoryTasks = tasks.filter((task) => task.category === category);
        const completed = categoryTasks.filter((task) => task.status === 'completed').length;
        const pending = categoryTasks.filter((task) => task.status === 'pending').length;
        const overdue = categoryTasks.filter((task) => (
            task.status !== 'completed'
            && task.deadline
            && new Date(task.deadline).getTime() < now
        )).length;
        const percent = categoryTasks.length ? Math.round((completed / categoryTasks.length) * 100) : 0;
        return { category, completed, pending, overdue, percent, total: categoryTasks.length };
    });

    return (
        <Card className="min-w-0 space-y-5 p-4 sm:p-6">
            <div>
                <p className="section-label mb-1">Tasks</p>
                <h2 className="font-display text-xl font-semibold text-text">Category breakdown</h2>
            </div>
            {categoryStats.map((item) => (
                <div key={item.category} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
                    <ProgressBar value={item.percent} label={item.category} />
                    <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-text-muted">
                        <span>{item.completed} completed</span>
                        <span>{item.pending} pending</span>
                        <span className={item.overdue ? 'text-danger' : ''}>{item.overdue} overdue</span>
                        <span>{item.total} total</span>
                    </div>
                </div>
            ))}
            <p className="font-body text-xs text-text-faint">
                Overdue tasks are incomplete tasks with a deadline before {formatProfileDate(new Date())}.
            </p>
        </Card>
    );
}
