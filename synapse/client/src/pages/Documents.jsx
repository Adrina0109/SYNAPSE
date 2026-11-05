import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api.js';
import Card from '../components/ui/Card.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

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
    const [confirmingDocument, setConfirmingDocument] = useState(null);

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
        setDeletingId(document.id || document._id);
        setActionError('');
        setFeedback('');
        try {
            await api.delete(`/documents/${document.id || document._id}`);
            setDocuments((current) => current.filter((item) => (item.id || item._id) !== (document.id || document._id)));
            setFeedback('Document and its indexed content deleted.');
            setConfirmingDocument(null);
        } catch (error) {
            setActionError(getErrorMessage(error, 'Could not delete this document. Please try again.'));
        } finally {
            setDeletingId('');
        }
    };

    return (
        <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    title="Documents"
                    subtitle="Upload reference materials for the assistant to use."
                />

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

                <Card className="mb-8 p-4 sm:p-6">
                <form ref={formRef} onSubmit={handleUpload} className="space-y-4">
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
                </Card>

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
                        <div role="status" aria-label="Loading documents">
                            <Card className="space-y-4 p-6">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-2/3" />
                            </Card>
                        </div>
                    ) : loadError ? (
                        <ErrorState message={loadError} onRetry={loadDocuments} />
                    ) : documents.length === 0 ? (
                        <Card className="p-6 text-center">
                            <p className="font-display text-lg font-semibold text-ink">No documents yet</p>
                            <p className="font-body text-sm text-ink-muted mt-1">Upload a PDF or TXT file to add it to the assistant’s library.</p>
                        </Card>
                    ) : (
                        <>
                            <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
                                <table className="w-full table-fixed text-left">
                                    <caption className="sr-only">Uploaded documents available to the assistant</caption>
                                    <thead className="border-b border-border bg-surface-2">
                                        <tr className="font-mono text-[10px] uppercase tracking-wider text-text-faint">
                                            <th scope="col" className="px-4 py-3">Document</th>
                                            <th scope="col" className="w-36 px-4 py-3">Access</th>
                                            <th scope="col" className="w-40 px-4 py-3">Indexed content</th>
                                            <th scope="col" className="w-24 px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {documents.map((document) => {
                                            const id = document.id || document._id;
                                            const categoryLabel = CATEGORIES.find((item) => item.value === document.category)?.label || document.category;
                                            const isMentorOnly = document.accessLevel === 'mentor_only';
                                            return (
                                                <tr key={id} className="align-top">
                                                    <td className="min-w-0 px-4 py-4">
                                                        <p className="break-words font-display font-semibold text-text">{document.title}</p>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <StatusBadge tone="neutral" label={categoryLabel} />
                                                            <span className="font-mono text-[10px] text-text-faint">
                                                                {document.pageCount ?? 0} {document.pageCount === 1 ? 'page' : 'pages'}
                                                                {document.createdAt && ` · Added ${new Date(document.createdAt).toLocaleDateString()}`}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <StatusBadge tone={isMentorOnly ? 'accent' : 'success'} label={isMentorOnly ? 'Mentors only' : 'All students'} />
                                                    </td>
                                                    <td className="px-4 py-4 font-mono text-xs text-text-muted">
                                                        {document.chunkCount ?? 0} chunks
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmingDocument(document)}
                                                            disabled={deletingId === id}
                                                            className="btn-secondary px-3 py-2 text-sm"
                                                        >
                                                            {deletingId === id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-3 md:hidden">
                                {documents.map((document) => {
                                    const id = document.id || document._id;
                                    const categoryLabel = CATEGORIES.find((item) => item.value === document.category)?.label || document.category;
                                    const isMentorOnly = document.accessLevel === 'mentor_only';
                                    return (
                                        <article key={id} className="card-hard min-w-0 p-4">
                                            <div className="flex flex-col gap-4">
                                                <div className="min-w-0">
                                                    <h3 className="break-words font-display text-lg font-semibold text-text">{document.title}</h3>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <StatusBadge tone="neutral" label={categoryLabel} />
                                                        <StatusBadge tone={isMentorOnly ? 'accent' : 'success'} label={isMentorOnly ? 'Mentors only' : 'All students'} />
                                                        <StatusBadge tone="neutral" label={`${document.chunkCount ?? 0} chunks`} />
                                                    </div>
                                                    <p className="mt-3 font-mono text-xs text-text-faint">
                                                        {document.pageCount ?? 0} {document.pageCount === 1 ? 'page' : 'pages'}
                                                        {document.createdAt && ` · Added ${new Date(document.createdAt).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingDocument(document)}
                                                    disabled={deletingId === id}
                                                    className="btn-secondary w-full text-sm"
                                                >
                                                    {deletingId === id ? 'Deleting…' : 'Delete'}
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
                <ConfirmDialog
                    open={!!confirmingDocument}
                    title="Delete document?"
                    body={confirmingDocument
                        ? `Delete "${confirmingDocument.title}" and all of its indexed content?`
                        : ''}
                    confirmLabel="Delete document"
                    onConfirm={() => {
                        if (!confirmingDocument) return;
                        const documentToDelete = confirmingDocument;
                        setConfirmingDocument(null);
                        handleDelete(documentToDelete);
                    }}
                    onCancel={() => setConfirmingDocument(null)}
                    variant="danger"
                />
        </div>
    );
}
