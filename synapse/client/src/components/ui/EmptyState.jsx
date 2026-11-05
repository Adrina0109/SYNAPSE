export default function EmptyState({ title, body, action }) {
    return (
        <div className="card-hard px-5 py-8 text-center sm:px-8">
            <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
            <p className="mx-auto mt-2 max-w-prose font-body text-sm leading-relaxed text-text-muted">{body}</p>
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}
