export default function Card({ children, header, className = '' }) {
    return (
        <section className={`card-hard ${className}`.trim()}>
            {header && (
                <header className="border-b border-border px-5 py-4 sm:px-6">
                    {header}
                </header>
            )}
            {children}
        </section>
    );
}
