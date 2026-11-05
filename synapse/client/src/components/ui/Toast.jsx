import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

function Toast({ id, message, tone, onDismiss, duration }) {
    useEffect(() => {
        const timeoutId = window.setTimeout(() => onDismiss(id), duration);
        return () => window.clearTimeout(timeoutId);
    }, [duration, id, onDismiss]);

    const toneClasses = tone === 'error'
        ? 'border-l-danger text-danger'
        : 'border-l-mint text-mint';

    return (
        <div className={`flex items-start gap-3 rounded-lg border border-border border-l-4 bg-surface px-4 py-3 shadow-lg ${toneClasses}`} role="status">
            <p className="min-w-0 flex-1 font-body text-sm text-text">{message}</p>
            <button
                type="button"
                onClick={() => onDismiss(id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded px-1 text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                    <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}

export function ToastProvider({ children, duration = 5000 }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message, tone) => {
        const id = nextId.current;
        nextId.current += 1;
        setToasts((current) => [...current, { id, message, tone }]);
    }, []);

    const success = useCallback((message) => addToast(message, 'success'), [addToast]);
    const error = useCallback((message) => addToast(message, 'error'), [addToast]);

    return (
        <ToastContext.Provider value={{ success, error }}>
            {children}
            <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-relevant="additions text">
                {toasts.map((toast) => (
                    <Toast key={toast.id} {...toast} duration={duration} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used inside ToastProvider');
    return context;
}

export default Toast;
