export const LEVEL_LABELS = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

export const RESOURCE_LABELS = {
    youtube: 'YouTube',
    docs: 'Documentation',
    course: 'Online course',
    book: 'Book',
    notes: 'In-app notes',
};

export const PATH_LABELS = {
    free_learning: 'Free learning',
    free_certificate: 'Free certificate',
    any_certificate: 'Any certificate',
};

const STATUS_LABELS = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
};

export const formatDay = (date) => new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
});

export const roadmapStatusLabel = (status) => STATUS_LABELS[status] || status;

export const costBadge = (certification = {}) => {
    const matchedBadges = {
        free: { label: 'FREE CERTIFICATE', tone: 'free' },
        free_learning_paid_certificate: { label: 'FREE TO LEARN · CERTIFICATE COSTS MONEY', tone: 'partial' },
        paid: { label: 'PAID CERTIFICATE', tone: 'paid' },
    };
    const statuses = {
        not_found: { label: 'NO VERIFIED FREE CERTIFICATE', tone: 'none' },
        unverified: { label: 'COST NOT VERIFIED', tone: 'none' },
    };
    const badge = certification.status === 'matched'
        ? matchedBadges[certification.costType] || statuses.unverified
        : statuses[certification.status] || statuses.unverified;
    return {
        ...badge,
        detail: certification.costNote || certification.message || '',
    };
};
