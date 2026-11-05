export default function ProgressBar({ value, label }) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue)
        ? Math.min(100, Math.max(0, numericValue))
        : 0;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <span className="font-body text-sm text-text-muted">{label}</span>
                <span className="font-mono text-xs text-text-faint">{Math.round(safeValue)}%</span>
            </div>
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={safeValue}
            >
                <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${safeValue}%` }}
                />
            </div>
        </div>
    );
}
