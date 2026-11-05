import { costBadge } from './roadmapHelpers.js';

const badgeClasses = {
    free: 'bg-forest text-paper border border-forest',
    partial: 'border border-amber-600 text-amber-800',
    paid: 'border border-ink/30 text-ink',
    none: 'border border-ink/30 text-ink',
};

export default function CertificationBanner({ certification = {}, alternatives = [] }) {
    if (!certification.status || certification.status === 'none') return null;

    const badge = costBadge(certification);

    return (
        <section className="card-hard p-4 sm:p-5 space-y-3" aria-label="Certification information">
            <span className={`tag-pill ${badgeClasses[badge.tone]}`}>{badge.label}</span>
            {certification.status === 'matched' && (
                <div>
                    <h2 className="font-display text-xl font-semibold text-ink break-words">{certification.name}</h2>
                    <p className="font-body text-sm text-ink-muted mt-1">{certification.provider}</p>
                </div>
            )}
            {badge.detail && <p className="font-body text-sm text-ink-muted break-words">{badge.detail}</p>}
            {certification.status === 'matched' && (
                <p className="font-mono text-xs text-ink-faint">
                    Verified {certification.lastVerified}
                </p>
            )}
            {certification.url && (
                <a
                    href={certification.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex font-body text-sm text-forest underline underline-offset-2 break-all"
                >
                    Open official page
                </a>
            )}
            {certification.status === 'matched' && (
                <p className="font-mono text-[10px] text-ink-faint">
                    Topic outline is AI-estimated, not the official syllabus
                </p>
            )}
            {alternatives.length > 0 && (
                <div className="border-t border-ink/10 pt-3">
                    <p className="section-label mb-2">Other verified options</p>
                    <ul className="space-y-3">
                        {alternatives.map((alternative) => (
                            <li key={alternative.catalogId || alternative.name} className="text-sm">
                                <p className="font-medium text-ink">{alternative.name}</p>
                                {alternative.costType === 'free_learning_paid_certificate' && (
                                    <p className="font-mono text-[10px] uppercase text-amber-800">
                                        Free to learn, certificate costs money
                                    </p>
                                )}
                                <p className="font-body text-xs text-ink-muted">
                                    {alternative.costNote || alternative.provider}
                                </p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <p className="font-body text-xs text-ink-faint border-t border-ink/10 pt-3">
                Costs change. Please confirm on the official page.
            </p>
        </section>
    );
}
