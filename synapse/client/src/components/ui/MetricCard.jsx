export default function MetricCard({ label, value, hint, icon, trend }) {
    return (
        <section className="card-hard min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="section-label">{label}</p>
                {icon && <span className="shrink-0 text-accent">{icon}</span>}
            </div>
            <p className="mt-3 break-words font-display text-3xl font-semibold tracking-tight text-text">
                {value}
            </p>
            {(hint || trend) && (
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                    {hint && <p className="font-body text-sm text-text-muted">{hint}</p>}
                    {trend && <p className="font-mono text-xs text-text-faint">{trend}</p>}
                </div>
            )}
        </section>
    );
}
