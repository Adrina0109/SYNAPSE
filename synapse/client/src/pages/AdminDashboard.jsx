import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api.js';

function SignalLogo() {
    return (
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <circle cx="4" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="6" r="2.5" fill="#E8401C" />
            <circle cx="24" cy="14" r="2.5" fill="#E8401C" />
            <circle cx="14" cy="22" r="2.5" fill="#E8401C" />
            <line x1="4" y1="14" x2="14" y2="6" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="6" x2="24" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="24" y1="14" x2="14" y2="22" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="14" y1="22" x2="4" y2="14" stroke="#16140F" strokeWidth="1.5" strokeOpacity="0.4" />
        </svg>
    );
}

const MetricCard = ({ num, label, sub, highlight }) => (
    <div className="card-hard p-6">
        <div className={`font-display text-5xl font-bold mb-1 ${highlight ? 'text-signal' : 'text-ink'}`}>{num}</div>
        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase">{label}</div>
        {sub && <div className="font-body text-xs text-ink-muted mt-1">{sub}</div>}
    </div>
);

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-4 sm:px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <SignalLogo />
                    <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Admin</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/documents" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">Documents</Link>
                    <Link to="/placement/drives" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">Placement drives</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <div className="mb-10">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Admin control</p>
                    <h1 className="font-display text-4xl font-bold text-ink">Batch overview.</h1>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <MetricCard num="10" label="Students" sub="8 onboarded" />
                    <MetricCard num="2" label="Mentors" />
                    <MetricCard num="3" label="At risk" highlight />
                    <MetricCard num="6" label="Announcements" sub="this week" />
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

                {/* Admin action sections */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Announcements */}
                    <div className="card-hard">
                        <div className="px-6 py-4 border-b border-ink/10">
                            <h2 className="font-display text-base font-semibold text-ink">Announcements</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            {[
                                { text: 'Resume workshop — Fri 2pm, Room 301', time: '2 hrs ago' },
                                { text: 'DSA test rescheduled to next Monday', time: 'Yesterday' },
                                { text: 'Placement drive: XYZ Corp — Nov 12', time: '2 days ago' },
                            ].map((a, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className="w-1.5 h-1.5 rounded-full bg-signal mt-1.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-body text-sm text-ink">{a.text}</p>
                                        <p className="font-mono text-xs text-ink-faint">{a.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Batch health */}
                    <div className="card-hard">
                        <div className="px-6 py-4 border-b border-ink/10">
                            <h2 className="font-display text-base font-semibold text-ink">Batch health</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { label: 'Onboarding complete', val: 80 },
                                { label: 'Avg. roadmap progress', val: 54 },
                                { label: 'Placement readiness', val: 38 },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-body text-sm text-ink">{item.label}</span>
                                        <span className="font-mono text-xs text-ink-faint">{item.val}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-ink/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-forest rounded-full transition-all" style={{ width: `${item.val}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-5 border border-signal/30 bg-signal/5">
                    <p className="font-mono text-xs text-signal uppercase tracking-widest mb-1">Coming soon</p>
                    <p className="font-body text-sm text-ink">AI announcement-to-task parsing, deadline conflict detection, department analytics, and mentor assignment.</p>
                </div>
            </div>
        </div>
    );
}
