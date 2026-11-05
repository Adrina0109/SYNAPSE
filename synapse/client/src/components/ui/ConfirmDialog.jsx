import { useEffect, useId, useRef } from 'react';

export default function ConfirmDialog({
    open,
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'default',
}) {
    const dialogRef = useRef(null);
    const cancelButtonRef = useRef(null);
    const onCancelRef = useRef(onCancel);
    const titleId = useId();
    const bodyId = useId();
    onCancelRef.current = onCancel;

    useEffect(() => {
        if (!open) return undefined;

        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        cancelButtonRef.current?.focus();

        const getFocusableElements = () => [...(dialogRef.current?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? [])];

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancelRef.current();
                return;
            }
            if (event.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (!dialogRef.current?.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        };
    }, [open]);

    if (!open) return null;

    const isDanger = variant === 'danger';

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-scrim/55 p-4">
            <div
                ref={dialogRef}
                role={isDanger ? 'alertdialog' : 'dialog'}
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={body ? bodyId : undefined}
                className="card-hard w-full max-w-md p-5 shadow-2xl sm:p-6"
            >
                <h2 id={titleId} className="font-display text-xl font-semibold text-text">{title}</h2>
                {body && <p id={bodyId} className="mt-2 font-body text-sm leading-relaxed text-text-muted">{body}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        onClick={onCancel}
                        className="btn-secondary px-4 py-2 text-sm"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="btn-primary px-4 py-2 text-sm"
                        style={isDanger ? { backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
