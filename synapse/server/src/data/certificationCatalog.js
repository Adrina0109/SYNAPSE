// Verify entries against the provider's official page; update lastVerified whenever an entry is edited. The AI must never decide cost.
export const CERTIFICATION_CATALOG = [
    {
        id: 'freecodecamp',
        name: 'freeCodeCamp certifications',
        provider: 'freeCodeCamp',
        skills: ['html', 'css', 'javascript', 'web development', 'responsive web design', 'react', 'node.js', 'python', 'sql', 'data analysis', 'machine learning', 'apis'],
        costType: 'free',
        costNote: 'Learning content and certificates are free.',
        url: 'https://www.freecodecamp.org/learn',
        lastVerified: '2026-11-05',
    },
    {
        id: 'nptel',
        name: 'NPTEL certification courses (IITs and IISc)',
        provider: 'NPTEL / SWAYAM',
        skills: ['python', 'data science', 'machine learning', 'database', 'dbms', 'algorithms', 'data structures', 'java', 'programming', 'operating systems', 'computer networks', 'cloud computing', 'electronics'],
        costType: 'free_learning_paid_certificate',
        costNote: 'Enrolling and learning are free. The optional proctored certification exam costs about Rs 1,000 per course.',
        url: 'https://nptel.ac.in',
        lastVerified: '2026-11-05',
    },
];

export const getCatalogEntry = (id) => CERTIFICATION_CATALOG.find((entry) => entry.id === id) || null;
