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

export default function MentorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    const loadStudents = useCallback(async () => {
        setIsLoading(true);
        setLoadError('');
        try {
            const { data } = await api.get('/mentor/students');
            setStudents(data.students || []);
        } catch (error) {
            setLoadError(error.response?.data?.message || 'Could not load assigned students. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const loadStudentDetail = async (student) => {
        setSelectedStudent(student);
        setStudentDetail(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            const { data } = await api.get(`/mentor/students/${student._id}`);
            setStudentDetail(data.student);
        } catch (error) {
            setDetailError(error.response?.data?.message || 'Could not load student details. Please try again.');
        } finally {
            setDetailLoading(false);
        }
    };

    const summary = useMemo(() => ({
        pending: students.reduce((total, student) => total + (student.pendingTaskCount || 0), 0),
        overdue: students.reduce((total, student) => total + (student.overdueTaskCount || 0), 0),
    }), [students]);

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
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Mentor</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <Link to="/documents" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">Documents</Link>
                    <Link to="/placement/drives" className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2">Placement drives</Link>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
                <div className="mb-10">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Mentor view</p>
                    <h1 className="font-display text-4xl font-bold text-ink">Your batch.</h1>
                    <p className="font-body text-ink-muted mt-2">
                        {user?.department} · Mentoring {students.length} students
                    </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-ink">{students.length}</div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">Students</div>
                    </div>
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-forest">{summary.pending}</div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">Pending tasks</div>
                    </div>
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-signal">{summary.overdue}</div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">Overdue tasks</div>
                    </div>
                </div>

                {/* Student list */}
                <div className="card-hard">
                    <div className="px-4 sm:px-6 py-4 border-b border-ink/10">
                        <h2 className="font-display text-lg font-semibold text-ink">Assigned students</h2>
                    </div>
                    {isLoading ? (
                        <div className="px-6 py-10 flex items-center justify-center gap-3" role="status">
                            <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                            <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading students</span>
                        </div>
                    ) : loadError ? (
                        <div className="px-6 py-10 text-center" role="alert">
                            <p className="font-body text-sm text-signal mb-3">{loadError}</p>
                            <button type="button" onClick={loadStudents} className="btn-secondary text-sm">Try again</button>
                        </div>
                    ) : students.length > 0 ? (
                        <div className="divide-y divide-ink/10">
                            {students.map((student) => (
                                <button
                                    key={student._id}
                                    type="button"
                                    onClick={() => loadStudentDetail(student)}
                                    className="w-full text-left px-4 sm:px-6 py-4 hover:bg-ink/3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-body text-sm font-semibold text-ink">{student.name}</p>
                                            <p className="font-mono text-xs text-ink-faint break-all">{student.email}</p>
                                            <p className="font-body text-xs text-ink-muted mt-1">
                                                {student.department || 'Department not set'} · {student.year ? `Year ${student.year}` : 'Year not set'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="tag-pill-outline">{student.pendingTaskCount || 0} pending</span>
                                            <span className={`tag-pill-outline ${(student.overdueTaskCount || 0) > 0 ? 'border-signal/30 text-signal' : ''}`}>
                                                {student.overdueTaskCount || 0} overdue
                                            </span>
                                        </div>
                                        <span className="font-mono text-xs text-signal sm:ml-2">View →</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-10 text-center">
                            <p className="font-display text-lg font-semibold text-ink">The admin hasn&apos;t assigned any students to you yet.</p>
                            <p className="font-body text-sm text-ink-muted mt-2">Your assigned students will appear here.</p>
                        </div>
                    )}
                </div>

                {selectedStudent && (
                    <div className="fixed inset-0 z-30 bg-ink/40 p-3 sm:p-6 flex items-center justify-center" role="presentation" onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedStudent(null);
                            setStudentDetail(null);
                        }
                    }}>
                        <section
                            className="card-hard w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="student-detail-heading"
                        >
                            <div className="flex items-start justify-between gap-4 mb-5">
                                <div className="min-w-0">
                                    <p className="section-label mb-1">Student details</p>
                                    <h2 id="student-detail-heading" className="font-display text-2xl font-semibold text-ink break-words">
                                        {studentDetail?.name || selectedStudent.name}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setStudentDetail(null);
                                    }}
                                    className="btn-ghost text-sm"
                                >
                                    Close
                                </button>
                            </div>

                            {detailLoading ? (
                                <div className="py-10 flex items-center justify-center gap-3" role="status">
                                    <div className="w-5 h-5 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
                                    <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading student</span>
                                </div>
                            ) : detailError ? (
                                <div className="py-6 text-center" role="alert">
                                    <p className="font-body text-sm text-signal mb-3">{detailError}</p>
                                    <button type="button" onClick={() => loadStudentDetail(selectedStudent)} className="btn-secondary text-sm">Try again</button>
                                </div>
                            ) : studentDetail && (
                                <>
                                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                                        <p className="font-body text-sm text-ink-muted break-all">{studentDetail.email}</p>
                                        <p className="font-body text-sm text-ink-muted">{studentDetail.department || 'Department not set'} · {studentDetail.year ? `Year ${studentDetail.year}` : 'Year not set'}</p>
                                        <p className="font-body text-sm text-ink-muted">Career goal: {studentDetail.careerGoal || 'Not set'}</p>
                                        <p className="font-body text-sm text-ink-muted">Daily study time: {studentDetail.dailyHours ?? 'Not set'}{studentDetail.dailyHours ? 'h' : ''}</p>
                                    </div>

                                    <h3 className="font-display text-lg font-semibold text-ink mb-3">Recent tasks</h3>
                                    {studentDetail.tasks?.length ? (
                                        <div className="space-y-2">
                                            {studentDetail.tasks.map((task) => (
                                                <div key={task._id} className="border border-ink/10 px-3 py-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <p className={`font-body text-sm font-medium ${task.status === 'completed' ? 'line-through text-ink-faint' : 'text-ink'}`}>
                                                            {task.title}
                                                        </p>
                                                        <span className={`tag-pill-outline ${task.status === 'completed' ? 'text-forest border-forest/30' : ''}`}>
                                                            {task.status.replaceAll('_', ' ')}
                                                        </span>
                                                    </div>
                                                    {task.description && <p className="font-body text-xs text-ink-muted mt-1">{task.description}</p>}
                                                    {task.deadline && (
                                                        <p className="font-mono text-xs text-ink-faint mt-2">
                                                            Due {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(task.deadline))}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="font-body text-sm text-ink-muted">No recent tasks for this student.</p>
                                    )}
                                </>
                            )}
                        </section>
                    </div>
                )}

                <div className="mt-6 p-5 border border-signal/30 bg-signal/5">
                    <p className="font-mono text-xs text-signal uppercase tracking-widest mb-1">Coming soon</p>
                    <p className="font-body text-sm text-ink">Announcement publisher, assignment creation, at-risk alerts, and session scheduling.</p>
                </div>
            </div>
        </div>
    );
}
