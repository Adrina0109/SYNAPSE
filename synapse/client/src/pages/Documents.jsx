import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../lib/api.js';

const CATEGORIES = [
    { value: 'syllabus', label: 'Syllabus' },
    { value: 'rules', label: 'Rules' },
    { value: 'placement', label: 'Placement' },
    { value: 'exam', label: 'Exam' },
    { value: 'other', label: 'Other' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getErrorMessage = (error, fallback) => {
    if (error.response?.status === 413) return 'The file must be 10 MB or smaller.';
    return error.response?.data?.message || fallback;
};

export default function Documents() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const formRef = useRef(null);
    const [documents, setDocuments] = useState([]);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('other');
    const [accessLevel, setAccessLevel] = useState('all');
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState('');

    const loadDocuments = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get('/documents');
            setDocuments(Array.isArray(data.documents) ? data.documents : []);
        } catch (error) {
            setLoadError(getErrorMessage(error, 'Could not load documents. Please try again.'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0] || null;
        setActionError('');
        setFile(null);
        if (selectedFile && selectedFile.size > MAX_FILE_SIZE) {
            setActionError('The file must be 10 MB or smaller.');
            event.target.value = '';
            return;
        }
        setFile(selectedFile);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        if (!file || isUploading) return;
        if (file.size > MAX_FILE_SIZE) {
            setActionError('The file must be 10 MB or smaller.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        formData.append('category', category);
        formData.append('accessLevel', accessLevel);

        setIsUploading(true);
        setActionError('');
        setFeedback('');
        try {
            await api.post('/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setTitle('');
            setCategory('other');
            setAccessLevel('all');
            setFile(null);
            formRef.current?.reset();
            setFeedback('Document uploaded and indexed successfully.');
            await loadDocuments();
        } catch (error) {
            setActionError(getErrorMessage(error, 'Could not upload this document. Please try again.'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (document) => {
        if (!window.confirm(`Delete "${document.title}" and all of its indexed content?`)) return;
        setDeletingId(document.id || document._id);
        setActionError('');
        setFeedback('');
        try {
            await api.delete(`/documents/${document.id || document._id}`);
            setDocuments((current) => current.filter((item) => (item.id || item._id) !== (document.id || document._id)));
            setFeedback('Document and its indexed content deleted.');
        } catch (error) {
            setActionError(getErrorMessage(error, 'Could not delete this document. Please try again.'));
        } finally {
            setDeletingId('');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link to={user?.role === 'admin' ? '/admin' : '/mentor'} className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</Link>
                    <span className="font-mono text-xs text-ink-faint border-l border-ink/15 pl-3">Documents</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    <span className="hidden sm:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to={user?.role === 'admin' ? '/admin' : '/mentor'} className="btn-ghost text-sm">Dashboard</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <header className="mb-8">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Knowledge library</p>
                    <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">Documents</h1>
                    <p className="font-body text-ink-muted mt-2">Upload reference materials for the assistant to use.</p>
                </header>

                {feedback && (
                    <div className="mb-6 px-4 py-3 bg-forest/10 border border-forest/30 text-forest font-body text-sm" role="status">
                        {feedback}
                    </div>
                )}
                {actionError && (
                    <div className="mb-6 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm break-words" role="alert">
                        {actionError}
                    </div>
                )}

                <form ref={formRef} onSubmit={handleUpload} className="card-hard p-4 sm:p-6 mb-8 space-y-4">
                    <h2 className="font-display text-xl font-semibold text-ink">Upload a document</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="document-title" className="block font-body text-sm font-medium text-ink mb-2">Title</label>
                            <input
                                id="document-title"
                                type="text"
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                maxLength={200}
                                required
                                className="input-base"
                                placeholder="e.g. Attendance policy"
                            />
                        </div>
                        <div>
                            <label htmlFor="document-category" className="block font-body text-sm font-medium text-ink mb-2">Category</label>
                            <select
                                id="document-category"
                                value={category}
                                onChange={(event) => setCategory(event.target.value)}
                                className="input-base"
                            >
                                {CATEGORIES.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="document-access" className="block font-body text-sm font-medium text-ink mb-2">Access level</label>
                            <select
                                id="document-access"
                                value={accessLevel}
                                onChange={(event) => setAccessLevel(event.target.value)}
                                className="input-base"
                            >
                                <option value="all">All students</option>
                                <option value="mentor_only">Mentors and admins only</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="document-file" className="block font-body text-sm font-medium text-ink mb-2">File (PDF or TXT, up to 10 MB)</label>
                            <input
                                id="document-file"
                                type="file"
                                accept=".pdf,.txt,application/pdf,text/plain"
                                onChange={handleFileChange}
                                required
                                className="input-base file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1 file:font-mono file:text-xs file:text-paper"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={!title.trim() || !file || isUploading} className="btn-primary w-full sm:w-auto">
                        {isUploading ? 'Uploading and indexing...' : 'Upload document'}
                    </button>
                    {isUploading && (
                        <div className="flex items-center gap-3 text-ink-muted" role="status">
                            <div className="w-4 h-4 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                            <span className="font-mono text-xs tracking-widest uppercase">This may take a moment</span>
                        </div>
                    )}
                </form>

                <section aria-labelledby="documents-list-heading">
                    <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                        <div>
                            <p className="section-label mb-1">Available to the assistant</p>
                            <h2 id="documents-list-heading" className="font-display text-2xl font-semibold text-ink">Uploaded documents</h2>
                        </div>
                        {!isLoading && !loadError && (
                            <span className="tag-pill-outline">{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="card-hard p-8 flex items-center justify-center gap-3" role="status">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                            <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading documents</span>
                        </div>
                    ) : loadError ? (
                        <div className="card-hard p-6 text-center" role="alert">
                            <p className="font-body text-sm text-signal mb-3">{loadError}</p>
                            <button type="button" onClick={loadDocuments} className="btn-secondary text-sm">Try again</button>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="card-hard p-6 text-center">
                            <p className="font-display text-lg font-semibold text-ink">No documents yet</p>
                            <p className="font-body text-sm text-ink-muted mt-1">Upload a PDF or TXT file to add it to the assistant’s library.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {documents.map((document) => {
                                const id = document.id || document._id;
                                const categoryLabel = CATEGORIES.find((item) => item.value === document.category)?.label || document.category;
                                const isMentorOnly = document.accessLevel === 'mentor_only';
                                return (
                                    <article key={id} className="card-hard p-4 sm:p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-display text-lg font-semibold text-ink break-words">{document.title}</h3>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="tag-pill-outline">{categoryLabel}</span>
                                                    <span className={isMentorOnly ? 'tag-pill bg-forest' : 'tag-pill'}>
                                                        {isMentorOnly ? 'Mentors only' : 'All students'}
                                                    </span>
                                                    <span className="tag-pill-outline">{document.chunkCount ?? 0} chunks</span>
                                                </div>
                                                <p className="font-mono text-xs text-ink-faint mt-3">
                                                    {document.pageCount ?? 0} {document.pageCount === 1 ? 'page' : 'pages'}
                                                    {document.createdAt && ` · Added ${new Date(document.createdAt).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(document)}
                                                disabled={deletingId === id}
                                                className="btn-secondary w-full sm:w-auto text-sm"
                                            >
                                                {deletingId === id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
