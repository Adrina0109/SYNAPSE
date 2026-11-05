export default function Skeleton({ className = '' }) {
    return (
        <div
            aria-hidden="true"
            className={`skeleton-shimmer rounded-lg ${className}`.trim()}
        />
    );
}
