export default function PageHeader({ title, subtitle, actions }) {
    return (
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                    {title}
                </h1>
                {subtitle && <p className="mt-2 max-w-3xl font-body text-sm leading-relaxed text-text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
