export const LOAD_META = {
    light: { label: 'Light', cellClass: 'bg-surface text-text' },
    normal: { label: 'Normal', cellClass: 'bg-blue/10 text-blue' },
    heavy: { label: 'Heavy', cellClass: 'bg-warning/10 text-warning' },
    overloaded: { label: 'Overloaded', cellClass: 'bg-danger/10 text-danger' },
};

export const SEVERITY_LABEL = {
    high: 'HIGH',
    medium: 'MEDIUM',
};

export const formatHours = (hours) => {
    const value = Number(hours);
    if (!Number.isFinite(value) || value === 0) return '0h';
    return `${Number(value.toFixed(2))}h`;
};

const getDayDate = (key) => new Date(`${key}T00:00:00+05:30`);

export const formatDayKey = (key) => getDayDate(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
});

export const weekdayShort = (key) => getDayDate(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    timeZone: 'Asia/Kolkata',
});

export const dayOfMonth = (key) => getDayDate(key).toLocaleDateString('en-IN', {
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
});
