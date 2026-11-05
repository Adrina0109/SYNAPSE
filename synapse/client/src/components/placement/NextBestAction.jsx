export default function NextBestAction({ action }) {
    return (
        <section className="card-hard min-w-0 p-4 sm:p-6" aria-labelledby="next-best-move-heading">
            <p className="section-label mb-3">Next best move</p>
            <h2 id="next-best-move-heading" className="sr-only">Next best move</h2>
            {action ? (
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-body text-sm leading-relaxed text-ink">{action.text}</p>
                    <span className="tag-pill shrink-0">+{action.gain} pts</span>
                </div>
            ) : (
                <p className="font-body text-sm leading-relaxed text-ink-muted">
                    No single change would raise your score right now. Keep going.
                </p>
            )}
        </section>
    );
}
