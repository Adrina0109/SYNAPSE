const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreGauge({ score }) {
    const safeScore = Number.isFinite(Number(score))
        ? Math.min(100, Math.max(0, Number(score)))
        : 0;
    const progress = (safeScore / 100) * CIRCUMFERENCE;

    return (
        <div
            className="relative mx-auto h-52 w-52"
            role="img"
            aria-label={`Readiness score ${score} out of 100`}
        >
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke="rgb(var(--text-rgb) / 0.12)"
                    strokeWidth="10"
                />
                <circle
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    className="text-signal"
                    strokeWidth="10"
                    strokeLinecap="butt"
                    strokeDasharray={`${progress} ${CIRCUMFERENCE}`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-5xl font-bold leading-none text-ink">{score}</span>
                <span className="mt-2 font-mono text-xs tracking-widest text-ink-faint">/100</span>
            </div>
        </div>
    );
}
