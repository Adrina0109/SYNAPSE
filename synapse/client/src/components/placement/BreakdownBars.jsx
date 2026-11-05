import ProgressBar from '../ui/ProgressBar.jsx';

export default function BreakdownBars({ breakdown }) {
    return (
        <div className="card-hard min-w-0 space-y-5 p-4 sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-ink">Score breakdown</h2>
            {breakdown.map((item) => (
                <div key={item.factor} className="space-y-2">
                    <ProgressBar value={item.value} label={`${item.factor} · weight ${item.weight}%`} />
                    <p className="font-mono text-[10px] text-ink-muted">
                        {item.contribution} of {item.weight} points
                    </p>
                    {item.note && <p className="font-body text-xs leading-relaxed text-ink-faint">{item.note}</p>}
                </div>
            ))}
        </div>
    );
}
