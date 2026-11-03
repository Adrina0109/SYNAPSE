export const getTaskUrgencyClass = (deadline) => {
    if (!deadline) return 'border-ink/20 bg-ink/5 text-ink-faint';
    const hoursRemaining = (new Date(deadline).getTime() - Date.now()) / 3600000;
    if (hoursRemaining <= 24) return 'border-signal/40 bg-signal/10 text-signal';
    if (hoursRemaining <= 72) return 'border-amber-500/40 bg-amber-500/10 text-amber-800';
    return 'border-forest/30 bg-forest/5 text-forest';
};

export const formatTaskDeadline = (deadline) => {
    if (!deadline) return 'No deadline';
    const date = new Date(deadline);
    if (Number.isNaN(date.getTime())) return 'Invalid deadline';
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

export const sortTasksByDeadline = (tasks) => [...tasks].sort((a, b) => {
    if (!a.deadline) return b.deadline ? 1 : 0;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
});

export const labelizeTaskValue = (value) => value.replaceAll('_', ' ');
