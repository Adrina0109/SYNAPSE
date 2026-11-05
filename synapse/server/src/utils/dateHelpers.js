export const DAY_MS = 86400000;

const IST_OFFSET_MS = 330 * 60000;

export const startOfISTDay = (date = new Date()) => (
    new Date(Math.floor((date.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS)
);

export const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

export const istDayKey = (date) => (
    new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
);
