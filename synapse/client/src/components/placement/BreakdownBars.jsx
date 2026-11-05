export default function BreakdownBars({ breakdown }) {
    return (
        <div className="card-hard min-w-0 space-y-5 p-4 sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Score breakdown</h2>
            {breakdown.map((item) => (
                <div key={item.factor} className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <h3 className="font-body text-sm font-medium text-ink">{item.factor}</h3>
                        <span className="font-mono text-[10px] text-ink-faint">weight {item.weight}%</span>
                    </div>
                    <div
                        className="h-2 w-full overflow-hidden bg-ink/10"
                        role="progressbar"
                        aria-label={`${item.factor} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.value}
                    >
                        <div
                            className="h-full bg-signal transition-[width]"
                            style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                        />
                    </div>
                    <p className="font-mono text-[10px] text-ink-muted">
                        {item.contribution} of {item.weight} points
                    </p>
                    {item.note && <p className="font-body text-xs leading-relaxed text-ink-faint">{item.note}</p>}
                </div>
            ))}
        </div>
    );
}
