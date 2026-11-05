import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api.js';
import DriveForm from '../components/placement/DriveForm.jsx';
import { formatDayKey } from '../components/planner/plannerHelpers.js';
import Card from '../components/ui/Card.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

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
        <div className="mx-auto w-full max-w-5xl">
                <PageHeader
                    title="Placement drives"
                    subtitle="Manage upcoming opportunities for students."
                    actions={!showForm && (
                        <button
                            type="button"
                            onClick={() => { setActionError(''); setIsCreating(true); }}
                            className="btn-primary w-full sm:w-auto"
                        >
                            New drive
                        </button>
                    )}
                />

                {actionError && (
                    <div className="mb-6 border border-signal/30 bg-signal/10 px-4 py-3 font-body text-sm text-signal" role="alert">
                        {actionError}
                    </div>
                )}

                {showForm && (
                    <Card className="mb-8 space-y-5 p-4 sm:p-6">
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
                    </Card>
                )}

                {loadError && (
                    <ErrorState message={loadError} onRetry={loadDrives} />
                )}
                {isLoading && (
                    <div role="status" aria-label="Loading placement drives">
                        <Card className="space-y-4 p-6">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-2/3" />
                        </Card>
                    </div>
                )}
                {!isLoading && !loadError && drives.length === 0 && (
                    <Card className="p-6 text-center">
                        <p className="font-body text-sm text-ink-muted">No placement drives yet.</p>
                    </Card>
                )}
                {!isLoading && !loadError && drives.length > 0 && (
                    <div className="grid min-w-0 gap-3 md:block md:rounded-xl md:border md:border-border md:bg-surface">
                        {drives.map((drive) => (
                            <article key={drive._id} className="card-hard min-w-0 space-y-3 p-4 sm:p-5 md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-b-border md:bg-transparent md:shadow-none md:last:border-b-0">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h2 className="break-words font-display text-xl font-semibold text-ink">{drive.company}</h2>
                                        <p className="mt-1 break-words font-body text-sm text-ink-muted">{drive.role}</p>
                                    </div>
                                    <StatusBadge tone={drive.status === 'open' ? 'success' : 'neutral'} label={drive.status} />
                                </div>
                                <p className="font-mono text-xs text-ink-faint">
                                    {formatDayKey(istDayKey(drive.date))} · Created by {creatorName(drive.createdBy)}
                                </p>
                                <p className="break-words border-t border-ink/10 pt-3 font-mono text-[10px] leading-relaxed text-ink-faint">
                                    Min CGPA {drive.minCgpa} · Backlogs up to {drive.maxBacklogs ?? 'any'} · {drive.branches?.length ? drive.branches.join(', ') : 'All branches'}
                                </p>
                                <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-3">
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
                                        className="btn-ghost text-sm text-danger"
                                    >
                                        Delete
                                    </button>
                                </div>
                                <ConfirmDialog
                                    open={confirmingDelete === drive._id}
                                    title="Delete placement drive?"
                                    body={`Delete the ${drive.company} ${drive.role} drive?`}
                                    confirmLabel="Delete drive"
                                    onConfirm={() => deleteDrive(drive._id)}
                                    onCancel={() => setConfirmingDelete('')}
                                    variant="danger"
                                />
                            </article>
                        ))}
                    </div>
                )}
        </div>
    );
}
