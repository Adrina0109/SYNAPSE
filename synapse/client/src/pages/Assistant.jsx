import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const SUGGESTED_QUESTIONS = [
    'What is the attendance requirement?',
    'Am I eligible for placements?',
    'When must lab records be submitted?',
];

const requestErrorMessage = (error) => {
    if (error.response?.status === 429) return 'You’ve reached the question limit. Please wait a few minutes and try again.';
    if (error.response?.status === 502) return 'The assistant is temporarily unavailable. Please try again shortly.';
    return error.response?.data?.message || 'We couldn’t get an answer. Please try again.';
};

export default function Assistant() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [error, setError] = useState('');

    const askQuestion = async (value) => {
        const content = value.trim();
        if (!content || isAsking) return;

        const history = messages.slice(-6).map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
        }));
        setMessages((current) => [...current, { role: 'user', content }]);
        setQuestion('');
        setError('');
        setIsAsking(true);

        try {
            const { data } = await api.post('/assistant/ask', { question: content, history });
            setMessages((current) => [...current, {
                role: 'assistant',
                content: data.answer,
                sources: data.sources || [],
            }]);
        } catch (requestError) {
            setError(requestErrorMessage(requestError));
        } finally {
            setIsAsking(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        askQuestion(question);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to="/student" className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</Link>
                    <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Assistant</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    <span className="hidden sm:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/student" className="btn-ghost text-sm">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <header className="mb-6 sm:mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Grounded in your documents</p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Ask the assistant</h1>
                    <p className="font-body text-ink-muted mt-2">Get answers from uploaded course and campus documents.</p>
                </header>

                <section className="card-hard overflow-hidden" aria-label="Assistant conversation">
                    <div className="min-h-72 max-h-[60vh] overflow-y-auto p-4 sm:p-6 space-y-5" aria-live="polite">
                        {messages.length === 0 && !isAsking ? (
                            <div className="py-5 sm:py-8">
                                <div className="max-w-lg mx-auto text-center mb-7">
                                    <p className="font-display text-xl font-semibold text-ink">What would you like to know?</p>
                                    <p className="font-body text-sm text-ink-muted mt-2">
                                        Answers are based on uploaded documents. If they don’t contain the answer, I’ll let you know.
                                    </p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {SUGGESTED_QUESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => askQuestion(suggestion)}
                                            disabled={isAsking}
                                            className="tag-pill-outline text-left whitespace-normal hover:border-ink hover:text-ink disabled:opacity-50"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="py-10 text-center" role="status">
                                <p className="font-body text-sm text-ink-muted">Start a conversation by asking a question.</p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <article
                                    key={`${message.role}-${index}`}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`min-w-0 max-w-[90%] sm:max-w-[80%] ${message.role === 'user'
                                        ? 'bg-ink text-paper px-4 py-3'
                                        : 'bg-white/60 border border-ink/10 px-4 py-3'}`}
                                    >
                                        <p className="font-mono text-[10px] tracking-widest uppercase opacity-60 mb-1">
                                            {message.role === 'user' ? 'You' : 'Assistant'}
                                        </p>
                                        <p className="font-body text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                        {message.role === 'assistant' && message.sources?.length > 0 && (
                                            <details className="mt-4 border-t border-ink/10 pt-3">
                                                <summary className="font-mono text-xs text-ink-muted cursor-pointer hover:text-ink">
                                                    Sources ({message.sources.length})
                                                </summary>
                                                <ul className="mt-3 space-y-3">
                                                    {message.sources.map((source, sourceIndex) => (
                                                        <li key={`${source.documentTitle}-${source.page}-${sourceIndex}`} className="text-xs">
                                                            <p className="font-body font-semibold text-ink break-words">
                                                                {source.documentTitle}
                                                                {source.page != null && <span className="font-normal text-ink-muted"> · Page {source.page}</span>}
                                                            </p>
                                                            <p className="font-body text-ink-muted mt-1 break-words">{source.snippet}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </article>
                            ))
                        )}
                        {isAsking && (
                            <div className="flex justify-start" role="status" aria-label="Assistant is typing">
                                <div className="border border-ink/10 bg-white/60 px-4 py-3">
                                    <p className="font-mono text-[10px] tracking-widest uppercase text-ink-faint mb-2">Assistant</p>
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-ink/40 animate-pulse" />
                                        <span className="w-2 h-2 rounded-full bg-ink/40 animate-pulse [animation-delay:150ms]" />
                                        <span className="w-2 h-2 rounded-full bg-ink/40 animate-pulse [animation-delay:300ms]" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-ink/10 p-4 sm:p-5">
                        {error && (
                            <div className="mb-3 px-3 py-2 border border-signal/30 bg-signal/10 text-signal font-body text-sm" role="alert">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                            <div className="min-w-0 flex-1">
                                <label htmlFor="assistant-question" className="sr-only">Your question</label>
                                <input
                                    id="assistant-question"
                                    type="text"
                                    value={question}
                                    onChange={(event) => setQuestion(event.target.value)}
                                    maxLength={500}
                                    className="input-base"
                                    placeholder="Ask a question about your documents..."
                                    disabled={isAsking}
                                    aria-describedby="assistant-question-count"
                                />
                                <p id="assistant-question-count" className="mt-1 text-right font-mono text-xs text-ink-faint">
                                    {question.length} / 500
                                </p>
                            </div>
                            <button type="submit" disabled={!question.trim() || isAsking} className="btn-primary w-full sm:w-auto self-start sm:self-start">
                                {isAsking ? 'Thinking...' : 'Send'}
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}
