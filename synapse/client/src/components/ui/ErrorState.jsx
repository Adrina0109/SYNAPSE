export default function ErrorState({ message, onRetry }) {
    return (
        <div className="card-hard px-5 py-6" role="alert">
            <p className="font-body text-sm leading-relaxed text-danger">{message}</p>
            {onRetry && (
                <button type="button" onClick={onRetry} className="btn-secondary mt-4 px-4 py-2 text-sm">
                    Try again
                </button>
            )}
        </div>
    );
}
