import { useEffect, useRef, useState } from 'react';
import AssistantChat from './AssistantChat.jsx';

const ChatIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
);

const CloseIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

export default function AssistantWidget() {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        panelRef.current?.querySelector('input')?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    const closePanel = () => {
        setOpen(false);
        buttonRef.current?.focus();
    };

    return (
        <>
            <div
                ref={panelRef}
                id="ask-synapse-panel"
                role="dialog"
                aria-label="Ask SYNAPSE"
                className={open
                    ? 'fixed bottom-24 right-4 z-50 flex h-[min(560px,70vh)] w-[calc(100vw-2rem)] max-w-[400px] flex-col sm:right-6'
                    : 'hidden'}
            >
                <div className="mb-2 flex items-center justify-between px-1">
                    <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Ask SYNAPSE</p>
                    <button
                        type="button"
                        onClick={closePanel}
                        aria-label="Close assistant"
                        className="btn-ghost h-9 w-9 p-0"
                    >
                        <CloseIcon />
                    </button>
                </div>
                <AssistantChat variant="panel" />
            </div>

            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-controls="ask-synapse-panel"
                aria-label={open ? 'Close assistant' : 'Ask SYNAPSE'}
                className="btn-primary fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full p-0 shadow-lg sm:right-6"
            >
                {open ? <CloseIcon /> : <ChatIcon />}
            </button>
        </>
    );
}