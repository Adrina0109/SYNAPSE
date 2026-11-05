export const DAY_MS = 86400000;

const IST_OFFSET_MS = 330 * 60000;

export const startOfISTDay = (date = new Date()) => (
    new Date(Math.floor((date.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS)
);

export const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

export const istDayKey = (date) => (
    new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
);

export const dayKeyToDate = (key) => new Date(`${key}T00:00:00+05:30`);

export const addDaysToKey = (key, n) => istDayKey(addDays(dayKeyToDate(key), n));

export const diffDays = (keyA, keyB) => Math.round(
    (dayKeyToDate(keyB).getTime() - dayKeyToDate(keyA).getTime()) / DAY_MS
);

export const formatDayKey = (key) => dayKeyToDate(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
});
