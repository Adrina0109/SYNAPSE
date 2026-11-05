export const COMMON_ITEMS = [
    { key: 'projects_two', label: 'Explain two of your projects end to end', group: 'projects' },
    { key: 'projects_impact', label: "Explain one project's impact with a number", group: 'projects' },
    { key: 'hr_intro', label: 'Introduce yourself in 60 seconds', group: 'behavioral' },
    { key: 'hr_conflict', label: 'Describe a conflict and how you handled it', group: 'behavioral' },
    { key: 'hr_failure', label: 'Describe a failure and what you learned', group: 'behavioral' },
    { key: 'hr_company', label: 'Explain why you want to join this company', group: 'behavioral' },
];

export const ROLE_ITEMS = {
    'Full Stack Developer': [
        { key: 'fs_react', label: 'Explain React state and effects', group: 'technical' },
        { key: 'fs_rest', label: 'Design a REST API with authentication', group: 'technical' },
        { key: 'fs_db', label: 'Explain indexing and joins in your database', group: 'technical' },
        { key: 'fs_deploy', label: 'Explain how you deployed an app', group: 'technical' },
    ],
    'Data Analyst': [
        { key: 'da_sql', label: 'Write joins, GROUP BY and window functions', group: 'technical' },
        { key: 'da_stats', label: 'Explain mean, median, variance and correlation', group: 'technical' },
        { key: 'da_viz', label: 'Build a dashboard and explain its story', group: 'technical' },
        { key: 'da_excel', label: 'Use pivot tables and lookups', group: 'technical' },
    ],
    'Data Scientist': [
        { key: 'ds_ml', label: 'Explain bias, variance and overfitting', group: 'technical' },
        { key: 'ds_pandas', label: 'Clean and transform data with pandas', group: 'technical' },
        { key: 'ds_eval', label: 'Choose metrics for a classification problem', group: 'technical' },
        { key: 'ds_stats', label: 'Explain hypothesis testing', group: 'technical' },
    ],
    'Backend Developer': [
        { key: 'be_api', label: 'Design a REST API with authentication', group: 'technical' },
        { key: 'be_db', label: 'Explain indexing, joins and transactions', group: 'technical' },
        { key: 'be_cache', label: 'Explain caching and rate limiting', group: 'technical' },
        { key: 'be_async', label: 'Explain processes, threads and async I/O', group: 'technical' },
    ],
    'ML Engineer': [
        { key: 'ml_train', label: 'Explain gradient descent and regularisation', group: 'technical' },
        { key: 'ml_nn', label: 'Explain a neural network training loop', group: 'technical' },
        { key: 'ml_serve', label: 'Explain how a model is served and monitored', group: 'technical' },
        { key: 'ml_pipeline', label: 'Write a feature pipeline in Python', group: 'technical' },
    ],
    'QA Engineer': [
        { key: 'qa_plan', label: 'Write a test plan for a feature', group: 'technical' },
        { key: 'qa_auto', label: 'Explain how you automate UI tests', group: 'technical' },
        { key: 'qa_api', label: 'Test an API for status codes and edge cases', group: 'technical' },
        { key: 'qa_bug', label: 'Write a clear bug report', group: 'technical' },
    ],
};

export const getChecklistItems = (role) => [
    ...COMMON_ITEMS,
    ...(ROLE_ITEMS[role] ?? []),
];

export const ALL_ITEM_KEYS = [
    ...new Set([
        ...COMMON_ITEMS.map((item) => item.key),
        ...Object.values(ROLE_ITEMS).flatMap((items) => items.map((item) => item.key)),
    ]),
];

const itemKeys = new Set(ALL_ITEM_KEYS);

export const isValidItemKey = (key) => itemKeys.has(key);
