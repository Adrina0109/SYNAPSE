import { formatDayKey } from '../planner/plannerHelpers.js';

export const getIstDayKey = (value) => new Date(value).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});

export const addDaysToKey = (key, days) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
};

export const getWeekday = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();

export const formatProfileDate = (value) => {
    if (!value) return '';
    const key = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? value
        : getIstDayKey(value);
    return formatDayKey(key);
};

export const normalizeSkill = (skill) => String(skill || '').trim().toLocaleLowerCase();

export const getInitials = (name = '') => name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase())
    .join('') || '?';
