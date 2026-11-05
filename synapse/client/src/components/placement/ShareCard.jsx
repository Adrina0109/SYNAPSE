import { useRef, useState } from 'react';
import api from '../../lib/api.js';

const formatExpiry = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Expiry date unavailable';
    return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
    });
};

export default function ShareCard() {
    const linkInput = useRef(null);
    const [includeAcademics, setIncludeAcademics] = useState(false);
    const [share, setShare] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [error, setError] = useState('');
    const [copyMessage, setCopyMessage] = useState('');

    const createLink = async () => {
        setIsCreating(true);
        setError('');
        setCopyMessage('');
        try {
            const { data } = await api.post('/placement/share', { includeAcademics });
            setShare({
                url: `${window.location.origin}${data.share.url}`,
                expiresAt: data.share.expiresAt,
            });
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not create a share link. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const copyLink = async () => {
        const input = linkInput.current;
        if (!input || !share) return;

        setError('');
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(share.url);
            } else {
                input.select();
                input.setSelectionRange(0, share.url.length);
                if (!document.execCommand('copy')) throw new Error('Clipboard copy was not available.');
            }
            setCopyMessage('Link copied.');
        } catch {
            try {
                input.select();
                input.setSelectionRange(0, share.url.length);
                if (!document.execCommand('copy')) throw new Error('Clipboard copy was not available.');
                setCopyMessage('Link copied.');
            } catch {
                setCopyMessage('Select and copy the link above.');
            }
        }
    };

    const revokeLink = async () => {
        setIsRevoking(true);
        setError('');
        try {
            await api.delete('/placement/share');
            setShare(null);
            setCopyMessage('');
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not revoke the share link. Please try again.');
        } finally {
            setIsRevoking(false);
        }
    };

    return (
        <section className="card-hard min-w-0 space-y-5 p-4 sm:p-6" aria-labelledby="share-readiness-heading">
            <div>
                <p className="section-label mb-2">Share</p>
                <h2 id="share-readiness-heading" className="font-display text-2xl font-semibold text-ink">
                    Share your readiness
                </h2>
            </div>

            <label className="flex items-start gap-3 font-body text-sm leading-relaxed text-ink">
                <input
                    type="checkbox"
                    checked={includeAcademics}
                    onChange={(event) => setIncludeAcademics(event.target.checked)}
                    disabled={isCreating || isRevoking}
                    className="mt-1 h-4 w-4 accent-signal"
                />
                <span>Include CGPA and backlogs (off by default)</span>
            </label>

            {error && <p className="font-body text-sm text-signal" role="alert">{error}</p>}

            {share ? (
                <div className="min-w-0 space-y-4">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                        <input
                            ref={linkInput}
                            type="text"
                            value={share.url}
                            readOnly
                            aria-label="Readiness share link"
                            onFocus={(event) => event.target.select()}
                            className="input-base min-w-0 flex-1"
                        />
                        <button type="button" onClick={copyLink} className="btn-secondary w-full sm:w-auto">
                            Copy link
                        </button>
                    </div>
                    {copyMessage && <p className="font-mono text-xs text-ink-muted" role="status">{copyMessage}</p>}
                    <p className="font-mono text-xs text-ink-muted">
                        Expires {formatExpiry(share.expiresAt)}
                    </p>
                    <p className="border-l-2 border-signal pl-3 font-body text-sm leading-relaxed text-ink-muted">
                        Anyone with this link can see your score, verified skills and verified roadmaps until it expires or you revoke it.
                    </p>
                    <button
                        type="button"
                        onClick={revokeLink}
                        disabled={isRevoking}
                        className="btn-ghost px-0 text-sm text-signal"
                    >
                        {isRevoking ? 'Revoking link…' : 'Revoke link'}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={createLink}
                    disabled={isCreating || isRevoking}
                    className="btn-primary w-full sm:w-auto"
                >
                    {isCreating ? 'Creating link…' : 'Create share link'}
                </button>
            )}
        </section>
    );
}
