import { useState } from 'react';
import api from '../lib/api.js';
import Card from '../components/ui/Card.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

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

    return (
        <div className="mx-auto w-full max-w-4xl">
                <PageHeader
                    title="AI Assistant"
                    subtitle="Answers from your uploaded documents, with sources."
                />

                <section className="card-hard flex h-[min(68vh,760px)] min-h-[30rem] flex-col overflow-hidden" aria-label="Assistant conversation">
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
                        {messages.length === 0 && !isAsking ? (
                            <div className="py-5 sm:py-8">
                                <div className="max-w-lg mx-auto text-center mb-7">
                                    <p className="font-display text-xl font-semibold text-ink">What would you like to know?</p>
                                    <p className="font-body text-sm text-ink-muted mt-2">
                                        Answers are based on uploaded documents. If they don’t contain the answer, I’ll let you know.
                                    </p>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="py-10 text-center" role="status">
                                <p className="font-body text-sm text-ink-muted">Start a conversation by asking a question.</p>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div key={`${message.role}-${index}`} className="space-y-2">
                                    <article className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`min-w-0 max-w-[90%] sm:max-w-[80%] ${message.role === 'user'
                                            ? 'rounded-2xl rounded-br-sm border border-accent/20 bg-accent-soft px-4 py-3 text-text'
                                            : 'rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-text'}`}
                                        >
                                            <p className="mb-1 font-mono text-[10px] tracking-widest uppercase opacity-60">
                                                {message.role === 'user' ? 'You' : 'Assistant'}
                                            </p>
                                            <p className="whitespace-pre-wrap break-words font-body text-sm">{message.content}</p>
                                        </div>
                                    </article>
                                    {message.role === 'assistant' && message.sources?.length > 0 && (
                                        <Card className="ml-0 w-full max-w-[90%] p-3 sm:ml-0 sm:max-w-[80%]">
                                            <details>
                                                <summary className="cursor-pointer font-mono text-xs text-text-muted hover:text-text">
                                                    Sources ({message.sources.length})
                                                </summary>
                                                <ul className="mt-3 space-y-3 border-t border-border pt-3">
                                                    {message.sources.map((source, sourceIndex) => (
                                                        <li key={`${source.documentTitle}-${source.page}-${sourceIndex}`} className="text-xs">
                                                            <p className="break-words font-body font-semibold text-text">
                                                                {source.documentTitle}
                                                                {source.page != null && <span className="font-normal text-text-muted"> · Page {source.page}</span>}
                                                            </p>
                                                            <p className="mt-1 break-words font-body text-text-muted">{source.snippet}</p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </details>
                                        </Card>
                                    )}
                                </div>
                            ))
                        )}
                        {isAsking && (
                            <div className="flex justify-start" role="status" aria-label="Assistant is typing">
                                <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3">
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

                    <div className="shrink-0 border-t border-border bg-bg-elevated p-4 sm:p-5">
                        {error && (
                            <div className="mb-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 font-body text-sm text-danger" role="alert">
                                {error}
                            </div>
                        )}
                        <div className="mb-3 flex flex-wrap gap-2" aria-label="Suggested questions">
                            {SUGGESTED_QUESTIONS.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => askQuestion(suggestion)}
                                    disabled={isAsking}
                                    className="tag-pill-outline whitespace-normal text-left hover:border-accent hover:text-accent disabled:opacity-50"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
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
        </div>
    );
}
