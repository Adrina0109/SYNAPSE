import { useMemo, useState } from 'react';

export default function RecipientSelector({
    recipients,
    loading,
    error,
    onRetry,
    isAdmin,
    recipientMode,
    setRecipientMode,
    selectedStudentIds,
    setSelectedStudentIds,
}) {
    const [search, setSearch] = useState('');
    const allStudentIds = recipients.map((student) => student._id);
    const normalizedSearch = search.trim().toLowerCase();
    const filteredRecipients = useMemo(() => recipients.filter((student) => (
        [student.name, student.email, student.department]
            .some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch))
    )), [normalizedSearch, recipients]);

    const toggleStudent = (studentId) => {
        setSelectedStudentIds((current) => current.includes(studentId)
            ? current.filter((id) => id !== studentId)
            : current.length < 200 ? [...current, studentId] : current);
    };

    const selectAllVisible = () => {
        setSelectedStudentIds((current) => [...new Set([
            ...current,
            ...filteredRecipients.map((student) => student._id),
        ])].slice(0, 200));
    };

    return (
        <fieldset className="space-y-3 sm:col-span-2">
            <legend className="mb-2 font-body text-sm font-medium text-ink">Send to</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-w-0 items-center gap-2 border border-ink/15 p-3 font-body text-sm text-ink">
                    <input
                        type="radio"
                        name="recipient-mode"
                        value="all"
                        checked={recipientMode === 'all'}
                        onChange={() => setRecipientMode('all')}
                        disabled={loading || Boolean(error) || allStudentIds.length === 0}
                        className="accent-signal"
                    />
                    <span>{isAdmin ? 'All students' : `All my students (${allStudentIds.length})`}</span>
                </label>
                <label className="flex min-w-0 items-center gap-2 border border-ink/15 p-3 font-body text-sm text-ink">
                    <input
                        type="radio"
                        name="recipient-mode"
                        value="selected"
                        checked={recipientMode === 'selected'}
                        onChange={() => setRecipientMode('selected')}
                        disabled={loading || Boolean(error) || allStudentIds.length === 0}
                        className="accent-signal"
                    />
                    <span>Selected students</span>
                </label>
            </div>

            {loading && <p className="font-body text-sm text-ink-muted" role="status">Loading students...</p>}
            {!loading && error && (
                <div className="flex flex-wrap items-center gap-3" role="alert">
                    <p className="font-body text-sm text-signal">{error}</p>
                    <button type="button" onClick={onRetry} className="btn-secondary px-3 py-1.5 text-sm">Try again</button>
                </div>
            )}
            {!loading && !error && allStudentIds.length === 0 && (
                <p className="font-body text-sm text-ink-muted">
                    {isAdmin ? 'No students available.' : 'No students assigned to you yet.'}
                </p>
            )}

            {recipientMode === 'selected' && !loading && !error && allStudentIds.length > 0 && (
                <div className="space-y-3 border border-ink/10 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-xs text-ink-muted">{selectedStudentIds.length} selected (max 200)</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={selectAllVisible} className="btn-ghost px-2 py-1 text-xs">Select all</button>
                            <button type="button" onClick={() => setSelectedStudentIds([])} className="btn-ghost px-2 py-1 text-xs">Clear</button>
                        </div>
                    </div>
                    <label htmlFor="recipient-search" className="sr-only">Search students</label>
                    <input
                        id="recipient-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name, email, or department"
                        className="input-base"
                    />
                    <div className="max-h-64 space-y-1 overflow-y-auto" aria-label="Students">
                        {filteredRecipients.length === 0 ? (
                            <p className="py-3 text-center font-body text-sm text-ink-muted">No students match this search.</p>
                        ) : filteredRecipients.map((student) => (
                            <label key={student._id} className="flex min-w-0 items-start gap-3 border-b border-ink/5 px-2 py-2.5 last:border-0">
                                <input
                                    type="checkbox"
                                    checked={selectedStudentIds.includes(student._id)}
                                    onChange={() => toggleStudent(student._id)}
                                    disabled={!selectedStudentIds.includes(student._id) && selectedStudentIds.length >= 200}
                                    className="mt-1 shrink-0 accent-signal"
                                />
                                <span className="min-w-0 break-words font-body text-sm text-ink">
                                    <span className="block font-medium">{student.name}</span>
                                    <span className="block text-xs text-ink-muted">{student.email}</span>
                                    {student.department && <span className="block text-xs text-ink-faint">{student.department}</span>}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </fieldset>
    );
}
