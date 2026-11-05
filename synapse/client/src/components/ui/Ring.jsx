const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Ring({ value, label, size = 128, strokeWidth = 8 }) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue)
        ? Math.min(100, Math.max(0, numericValue))
        : 0;
    const progress = (safeValue / 100) * CIRCUMFERENCE;

    return (
        <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
            role="img"
            aria-label={`${label}: ${Math.round(safeValue)}%`}
        >
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke="var(--border-strong)"
                    strokeWidth={strokeWidth}
                />
                <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold leading-none text-text">
                    {Math.round(safeValue)}%
                </span>
                <span className="mt-1 max-w-[80%] truncate font-mono text-[10px] text-text-muted">
                    {label}
                </span>
            </div>
        </div>
    );
}
