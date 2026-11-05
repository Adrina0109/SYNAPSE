export const ROLE_SKILLS = {
    'Full Stack Developer': [
        'javascript',
        'react',
        'node',
        'express',
        'mongodb',
        'sql',
        'git',
        'rest apis',
    ],
    'Data Analyst': [
        'sql',
        'python',
        'excel',
        'power bi',
        'statistics',
        'data visualization',
    ],
    'Data Scientist': [
        'python',
        'machine learning',
        'statistics',
        'pandas',
        'sql',
        'data visualization',
    ],
    'Backend Developer': [
        'node',
        'express',
        'sql',
        'postgresql',
        'rest apis',
        'git',
    ],
    'ML Engineer': [
        'python',
        'machine learning',
        'deep learning',
        'tensorflow',
        'pytorch',
        'docker',
    ],
    'QA Engineer': [
        'software testing',
        'selenium',
        'javascript',
        'sql',
        'git',
        'api testing',
    ],
};

export const SKILL_ALIASES = {
    reactjs: 'react',
    'react.js': 'react',
    nodejs: 'node',
    'node.js': 'node',
    expressjs: 'express',
    'express.js': 'express',
    mongo: 'mongodb',
    postgres: 'postgresql',
    js: 'javascript',
    ml: 'machine learning',
    dl: 'deep learning',
    rest: 'rest apis',
    'rest api': 'rest apis',
    'restful api': 'rest apis',
    'restful apis': 'rest apis',
    powerbi: 'power bi',
    'power-bi': 'power bi',
    tf: 'tensorflow',
    torch: 'pytorch',
    'manual testing': 'software testing',
    'selenium webdriver': 'selenium',
};

export const ALL_CANONICAL_SKILLS = [...new Set(Object.values(ROLE_SKILLS).flat())].sort();

export const normalizeSkill = (text) => {
    if (typeof text !== 'string') return '';
    const cleaned = text.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!cleaned) return '';
    return SKILL_ALIASES[cleaned] ?? cleaned.slice(0, 60);
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SKILL_TERMS = [
    ...ALL_CANONICAL_SKILLS.map((skill) => [skill, skill]),
    ...Object.entries(SKILL_ALIASES),
].sort(([termA], [termB]) => termA.localeCompare(termB));

export const findSkillsInText = (text) => {
    if (typeof text !== 'string' || !text) return [];
    const lowerText = text.toLowerCase();
    const found = new Set();

    SKILL_TERMS.forEach(([term, canonical]) => {
        const pattern = new RegExp(
            `(^|[^a-z0-9+#])${escapeRegex(term)}($|[^a-z0-9+#])`
        );
        if (pattern.test(lowerText)) found.add(canonical);
    });

    return [...found].sort();
};

export const getRoleSkills = (role) => ROLE_SKILLS[role] ?? [];
