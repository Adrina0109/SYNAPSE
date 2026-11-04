import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

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

const StudentRow = ({ name, dept, goal, progress, atRisk }) => (
    <div className="flex items-center gap-4 px-6 py-3.5 border-b border-ink/8 last:border-0 hover:bg-ink/3 transition-colors">
        <div className="w-8 h-8 bg-ink text-paper font-display text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ borderRadius: '2px' }}>
            {name[0]}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-medium text-ink">{name}</p>
            <p className="font-mono text-xs text-ink-faint">{dept}</p>
        </div>
        <div className="hidden md:block w-32 text-right">
            <p className="font-body text-xs text-ink-muted">{goal}</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-16 h-1 bg-ink/10 rounded-full overflow-hidden">
                <div className="h-full bg-forest rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-xs text-ink-faint w-8">{progress}%</span>
        </div>
        {atRisk && (
            <span className="font-mono text-xs text-signal bg-signal/10 px-2 py-0.5 flex-shrink-0">At risk</span>
        )}
    </div>
);

export default function MentorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const students = [];

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-6 lg:px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SignalLogo />
                    <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Mentor</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
                <div className="mb-10">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Mentor view</p>
                    <h1 className="font-display text-4xl font-bold text-ink">Your batch.</h1>
                    <p className="font-body text-ink-muted mt-2">
                        {user?.department} · Mentoring {students.length} students
                    </p>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 mb-10">
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-ink">{students.length}</div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">Students</div>
                    </div>
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-signal">{students.filter((student) => student.atRisk).length}</div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">At risk</div>
                    </div>
                    <div className="card-hard p-6 text-center">
                        <div className="font-display text-4xl font-bold text-forest">
                            {students.length ? `${Math.round(students.reduce((total, student) => total + student.progress, 0) / students.length)}%` : '—'}
                        </div>
                        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase mt-1">Avg. progress</div>
                    </div>
                </div>

                {/* Student list */}
                <div className="card-hard">
                    <div className="px-6 py-4 border-b border-ink/10">
                        <h2 className="font-display text-lg font-semibold text-ink">Student progress</h2>
                    </div>
                    {students.length > 0 ? students.map((student) => <StudentRow key={student.name} {...student} />) : (
                        <div className="px-6 py-10 text-center">
                            <p className="font-display text-lg font-semibold text-ink">The admin hasn&apos;t assigned any students to you yet.</p>
                            <p className="font-body text-sm text-ink-muted mt-2">Your assigned students will appear here.</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 p-5 border border-signal/30 bg-signal/5">
                    <p className="font-mono text-xs text-signal uppercase tracking-widest mb-1">Coming soon</p>
                    <p className="font-body text-sm text-ink">Announcement publisher, assignment creation, at-risk alerts, and session scheduling.</p>
                </div>
            </div>
        </div>
    );
}
