import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api.js';

const MetricCard = ({ num, label, highlight = false }) => (
    <div className="card-hard min-w-0 p-4 sm:p-5">
        <div className={`mb-1 break-words font-display text-3xl font-bold sm:text-4xl ${highlight ? 'text-signal' : 'text-ink'}`}>{num}</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-ink-faint sm:text-xs">{label}</div>
    </div>
);

export default function AdminDashboard() {
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedMentor, setSelectedMentor] = useState('');
    const [search, setSearch] = useState('');
    const [unassignedOnly, setUnassignedOnly] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState('');

    const loadAssignments = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [studentsResponse, mentorsResponse] = await Promise.all([
                api.get('/admin/users', {
                    params: { role: 'student', ...(unassignedOnly ? { unassigned: 'true' } : {}) },
                }),
                api.get('/admin/mentors'),
            ]);
            setStudents(studentsResponse.data.users || []);
            setMentors(mentorsResponse.data.mentors || []);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not load mentor assignments. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [unassignedOnly]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        setStatsError('');
        try {
            const { data } = await api.get('/admin/stats');
            setStats(data.stats ?? null);
        } catch (requestError) {
            setStatsError(requestError.response?.data?.message || 'Could not load admin stats. Please try again.');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const filteredStudents = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) return students;
        return students.filter((student) => [
            student.name,
            student.email,
            student.department,
            student.year,
        ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)));
    }, [search, students]);

    const visibleStudentIds = filteredStudents.map((student) => student._id);
    const allVisibleSelected = visibleStudentIds.length > 0
        && visibleStudentIds.every((studentId) => selectedStudents.includes(studentId));

    const toggleStudentSelection = (studentId) => {
        setSelectedStudents((current) => current.includes(studentId)
            ? current.filter((id) => id !== studentId)
            : [...current, studentId]);
    };

    const toggleVisibleSelection = () => {
        setSelectedStudents((current) => allVisibleSelected
            ? current.filter((id) => !visibleStudentIds.includes(id))
            : [...new Set([...current, ...visibleStudentIds])]);
    };

    const assignSelected = async () => {
        if (!selectedMentor || selectedStudents.length === 0) return;
        setIsSaving(true);
        setError('');
        setFeedback('');
        try {
            const { data } = await api.patch('/admin/assign', {
                studentIds: selectedStudents,
                mentorId: selectedMentor,
            });
            setFeedback(`Mentor assigned to ${data.updatedCount} student${data.updatedCount === 1 ? '' : 's'}.`);
            setSelectedStudents([]);
            await loadAssignments();
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not assign mentor. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const unassignMentor = async (student, mentor) => {
        setIsSaving(true);
        setError('');
        setFeedback('');
        try {
            const { data } = await api.patch('/admin/unassign', {
                studentIds: [student._id],
                mentorId: mentor._id,
            });
            setFeedback(`${mentor.name} removed from ${student.name}.`);
            await loadAssignments();
            if (data.updatedCount === 0) setFeedback(`${mentor.name} was already unassigned from ${student.name}.`);
        } catch (requestError) {
            setError(requestError.response?.data?.message || 'Could not remove mentor assignment. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-paper">

            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Admin control</p>
                    <div className="w-full">
                        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Batch overview.</h1>
                    </div>
                    <Link to="/admin/documents" className="btn-secondary px-4 py-2 text-sm">Open Documents →</Link>
                </div>

                <div className="mb-8">
                    {statsLoading ? (
                        <div className="card-hard p-5" role="status">
                            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Loading admin stats…</p>
                        </div>
                    ) : statsError ? (
                        <div className="card-hard flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
                            <p className="font-body text-sm text-signal">{statsError}</p>
                            <button type="button" onClick={loadStats} className="btn-secondary px-4 py-2 text-sm">Retry</button>
                        </div>
                    ) : stats ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4">
                            <MetricCard num={stats.usersByRole?.student ?? 0} label="Students" />
                            <MetricCard num={stats.usersByRole?.mentor ?? 0} label="Mentors" />
                            <MetricCard num={stats.usersByRole?.admin ?? 0} label="Admins" />
                            <MetricCard num={stats.documentCount ?? 0} label="Documents" />
                            <MetricCard num={stats.announcementCount ?? 0} label="Announcements" />
                            <MetricCard num={stats.unassignedStudentCount ?? 0} label="Unassigned students" highlight />
                        </div>
                    ) : (
                        <div className="card-hard p-5">
                            <p className="font-body text-sm text-ink-muted">Admin stats are not available yet.</p>
                            <button type="button" onClick={loadStats} className="btn-secondary mt-3 px-4 py-2 text-sm">Retry</button>
                        </div>
                    )}
                </div>

                <section className="card-hard mb-8" aria-labelledby="mentor-assignment-heading">
                    <div className="px-4 sm:px-6 py-4 border-b border-ink/10">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="section-label mb-1">People & support</p>
                                <h2 id="mentor-assignment-heading" className="font-display text-xl font-semibold text-ink">Mentor assignment</h2>
                            </div>
                            <label className="inline-flex items-center gap-2 font-body text-sm text-ink-muted">
                                <input
                                    type="checkbox"
                                    checked={unassignedOnly}
                                    onChange={(event) => {
                                        setUnassignedOnly(event.target.checked);
                                        setSelectedStudents([]);
                                    }}
                                    className="h-4 w-4 accent-forest"
                                />
                                Unassigned only
                            </label>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6">
                        {feedback && (
                            <div className="mb-4 px-4 py-3 bg-forest/10 border border-forest/30 text-forest font-body text-sm" role="status">
                                {feedback}
                            </div>
                        )}
                        {error && (
                            <div className="mb-4 px-4 py-3 bg-signal/10 border border-signal/30 text-signal font-body text-sm" role="alert">
                                {error}
                                <button type="button" onClick={loadAssignments} className="ml-3 underline">Try again</button>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                            <label className="sr-only" htmlFor="studentSearch">Search students</label>
                            <input
                                id="studentSearch"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name, email or department"
                                className="input-base min-w-0 flex-1"
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <label className="sr-only" htmlFor="mentorSelect">Select a mentor</label>
                                <select
                                    id="mentorSelect"
                                    value={selectedMentor}
                                    onChange={(event) => setSelectedMentor(event.target.value)}
                                    className="input-base min-w-0 sm:min-w-48"
                                    disabled={mentors.length === 0 || isSaving}
                                >
                                    <option value="">Choose mentor</option>
                                    {mentors.map((mentor) => (
                                        <option key={mentor._id} value={mentor._id}>{mentor.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={assignSelected}
                                    disabled={isSaving || !selectedMentor || selectedStudents.length === 0}
                                    className="btn-primary whitespace-nowrap"
                                >
                                    {isSaving ? 'Saving…' : `Assign selected${selectedStudents.length ? ` (${selectedStudents.length})` : ''}`}
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            {isLoading ? (
                                <div className="py-8 flex items-center justify-center gap-3" role="status">
                                    <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                                    <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading students</span>
                                </div>
                            ) : error && students.length === 0 ? null : filteredStudents.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="font-display text-lg font-semibold text-ink">No students found</p>
                                    <p className="font-body text-sm text-ink-muted mt-1">
                                        {search ? 'Try another search.' : unassignedOnly ? 'All students have at least one mentor.' : 'Students will appear here when available.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left">
                                        <thead>
                                            <tr className="border-b border-ink/10 font-mono text-xs tracking-wide uppercase text-ink-faint">
                                                <th className="py-3 pr-3 font-normal">
                                                    <input
                                                        type="checkbox"
                                                        checked={allVisibleSelected}
                                                        onChange={toggleVisibleSelection}
                                                        aria-label="Select all visible students"
                                                        className="h-4 w-4 accent-forest"
                                                    />
                                                </th>
                                                <th className="py-3 pr-4 font-normal">Student</th>
                                                <th className="py-3 pr-4 font-normal">Department / year</th>
                                                <th className="py-3 font-normal">Assigned mentors</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map((student) => (
                                                <tr key={student._id} className="border-b border-ink/8 last:border-0 align-top">
                                                    <td className="py-4 pr-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedStudents.includes(student._id)}
                                                            onChange={() => toggleStudentSelection(student._id)}
                                                            aria-label={`Select ${student.name}`}
                                                            className="h-4 w-4 accent-forest"
                                                        />
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="font-body text-sm font-medium text-ink">{student.name}</p>
                                                        <p className="font-mono text-xs text-ink-faint break-all">{student.email}</p>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="font-body text-sm text-ink">{student.department || '—'}</p>
                                                        <p className="font-mono text-xs text-ink-faint">{student.year ? `Year ${student.year}` : 'Year not set'}</p>
                                                    </td>
                                                    <td className="py-4">
                                                        {student.mentors?.length ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {student.mentors.map((mentor) => (
                                                                    <span key={mentor._id} className="tag-pill-outline inline-flex items-center gap-1">
                                                                        {mentor.name}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => unassignMentor(student, mentor)}
                                                                            disabled={isSaving}
                                                                            aria-label={`Remove ${mentor.name} from ${student.name}`}
                                                                            className="ml-1 text-signal hover:text-signal-dark disabled:opacity-50"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="tag-pill-outline text-ink-faint">Unassigned</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-ink/10 pt-5">
                            <h3 className="font-display text-base font-semibold text-ink mb-3">Mentors</h3>
                            {isLoading ? (
                                <p className="font-mono text-xs text-ink-faint">Loading mentor summary…</p>
                            ) : mentors.length === 0 ? (
                                <p className="font-body text-sm text-ink-muted">No mentors available.</p>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {mentors.map((mentor) => (
                                        <div key={mentor._id} className="flex items-center justify-between gap-3 border border-ink/10 px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="font-body text-sm font-medium text-ink truncate">{mentor.name}</p>
                                                <p className="font-mono text-xs text-ink-faint truncate">{mentor.email}</p>
                                            </div>
                                            <span className="tag-pill-outline whitespace-nowrap">
                                                {mentor.assignedStudentCount} student{mentor.assignedStudentCount === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
