const toneClasses = {
    success: 'border-mint/25 bg-mint/10 text-mint',
    warning: 'border-warning/25 bg-warning/10 text-warning',
    danger: 'border-danger/25 bg-danger/10 text-danger',
    info: 'border-blue/25 bg-blue/10 text-blue',
    neutral: 'border-border-strong bg-surface-2 text-text-muted',
    accent: 'border-accent/25 bg-accent-soft text-accent',
};

export default function StatusBadge({ tone = 'neutral', label = 'Status' }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${toneClasses[tone] || toneClasses.neutral}`}>
            {label}
        </span>
    );
}
