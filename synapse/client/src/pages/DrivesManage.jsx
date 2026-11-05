import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import DriveForm from '../components/placement/DriveForm.jsx';
import { formatDayKey } from '../components/planner/plannerHelpers.js';

const istDayKey = (date) => new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
});

const creatorName = (creator) => (
    typeof creator === 'object' && creator !== null ? creator.name : 'Placement team'
);

export default function DrivesManage() {
    const [drives, setDrives] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [editingDrive, setEditingDrive] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadDrives = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get('/placement/drives');
            setDrives(data.drives || []);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load placement drives. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDrives();
    }, [loadDrives]);

    const saveDrive = async (payload) => {
        setIsSubmitting(true);
        setActionError('');
        try {
            if (editingDrive) {
                await api.patch(`/placement/drives/${editingDrive._id}`, payload);
            } else {
                await api.post('/placement/drives', payload);
            }
            setEditingDrive(null);
            setIsCreating(false);
            await loadDrives();
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not save this drive. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteDrive = async (driveId) => {
        setActionError('');
        try {
            await api.delete(`/placement/drives/${driveId}`);
            setDrives((current) => current.filter((drive) => drive._id !== driveId));
            setConfirmingDelete('');
        } catch (error) {
            setActionError(error.response?.data?.message || 'Could not delete this drive. Please try again.');
        }
    };

    const showForm = isCreating || editingDrive;

    return (
        <div className="min-h-screen bg-paper">
            <div className="mx-auto w-full max-w-5xl">
                <header className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-2 font-mono text-xs tracking-widest uppercase text-signal">Manage opportunities</p>
                        <h1 className="font-display text-4xl font-bold text-ink sm:text-5xl">Placement drives</h1>
                    </div>
                    {!showForm && (
                        <button
                            type="button"
                            onClick={() => { setActionError(''); setIsCreating(true); }}
                            className="btn-primary w-full sm:w-auto"
                        >
                            New drive
                        </button>
                    )}
                </header>

                {actionError && (
                    <div className="mb-6 border border-signal/30 bg-signal/10 px-4 py-3 font-body text-sm text-signal" role="alert">
                        {actionError}
                    </div>
                )}

                {showForm && (
                    <section className="card-hard mb-8 space-y-5 p-4 sm:p-6" aria-labelledby="drive-form-heading">
                        <div>
                            <p className="section-label mb-1">{editingDrive ? 'Update opportunity' : 'Add opportunity'}</p>
                            <h2 id="drive-form-heading" className="font-display text-2xl font-semibold text-ink">
                                {editingDrive ? 'Edit drive' : 'New drive'}
                            </h2>
                        </div>
                        <DriveForm
                            initialValues={editingDrive}
                            onSubmit={saveDrive}
                            isSubmitting={isSubmitting}
                            onCancel={() => { setEditingDrive(null); setIsCreating(false); }}
                        />
                    </section>
                )}

                {loadError && (
                    <div className="card-hard p-5 text-center" role="alert">
                        <p className="mb-3 font-body text-sm text-signal">{loadError}</p>
                        <button type="button" onClick={loadDrives} className="btn-secondary text-sm">Try again</button>
                    </div>
                )}
                {isLoading && (
                    <div className="card-hard flex items-center justify-center gap-3 p-8" role="status">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-ink/20 border-t-signal" />
                        <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">Loading drives</span>
                    </div>
                )}
                {!isLoading && !loadError && drives.length === 0 && (
                    <div className="card-hard p-6 text-center">
                        <p className="font-body text-sm text-ink-muted">No placement drives yet.</p>
                    </div>
                )}
                {!isLoading && !loadError && drives.length > 0 && (
                    <div className="grid min-w-0 gap-4 md:grid-cols-2">
                        {drives.map((drive) => (
                            <article key={drive._id} className="card-hard min-w-0 space-y-3 p-4 sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="break-words font-display text-xl font-semibold text-ink">{drive.company}</h2>
                                        <p className="mt-1 break-words font-body text-sm text-ink-muted">{drive.role}</p>
                                    </div>
                                    <span className={`tag-pill ${drive.status === 'open' ? 'bg-forest text-paper' : 'bg-ink/10 text-ink-muted'}`}>
                                        {drive.status}
                                    </span>
                                </div>
                                <p className="font-mono text-xs text-ink-faint">
                                    {formatDayKey(istDayKey(drive.date))} · Created by {creatorName(drive.createdBy)}
                                </p>
                                <p className="break-words border-t border-ink/10 pt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
                                    Min CGPA {drive.minCgpa} · Backlogs up to {drive.maxBacklogs ?? 'any'} · {drive.branches?.length ? drive.branches.join(', ') : 'All branches'}
                                </p>
                                <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
                                    {confirmingDelete === drive._id ? (
                                        <>
                                            <span className="mr-auto self-center font-body text-sm text-ink-muted">Delete this drive?</span>
                                            <button type="button" onClick={() => setConfirmingDelete('')} className="btn-ghost text-sm">Cancel</button>
                                            <button type="button" onClick={() => deleteDrive(drive._id)} className="btn-primary px-4 py-2 text-sm">Confirm delete</button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => { setActionError(''); setIsCreating(false); setEditingDrive(drive); }}
                                                className="btn-secondary px-4 py-2 text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setActionError(''); setConfirmingDelete(drive._id); }}
                                                className="btn-ghost text-sm text-signal"
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
