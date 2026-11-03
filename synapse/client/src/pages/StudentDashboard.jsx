import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ num, label }) => (
    <div className="card-hard p-6">
        <div className="font-display text-5xl font-bold text-ink mb-1">{num}</div>
        <div className="font-mono text-xs text-ink-faint tracking-widest uppercase">{label}</div>
    </div>
);

const TaskItem = ({ task, due, done }) => (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-ink/8 last:border-0 ${done ? 'opacity-50' : ''}`}>
        <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${done ? 'bg-forest border-forest' : 'border-ink/30'}`} style={{ borderRadius: '2px' }}>
            {done && <span className="text-paper text-xs">✓</span>}
        </div>
        <div className="flex-1 min-w-0">
            <p className={`font-body text-sm ${done ? 'line-through text-ink-faint' : 'text-ink'}`}>{task}</p>
        </div>
        <span className="font-mono text-xs text-ink-faint flex-shrink-0">{due}</span>
    </div>
);

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            {/* Nav */}
            <nav className="border-b border-ink/10 px-6 lg:px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SignalLogo />
                    <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Student</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
                {/* Welcome */}
                <div className="mb-10">
                    <p className="font-mono text-xs tracking-widest uppercase text-signal mb-2">Dashboard</p>
                    <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink">
                        Morning, {user?.name?.split(' ')[0]}.
                    </h1>
                    <p className="font-body text-ink-muted mt-2">
                        {user?.department} · Year {user?.year} ·{' '}
                        <span className="text-forest font-medium">{user?.careerGoal || 'path not set'}</span>
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard num="7" label="Tasks this week" />
                    <StatCard num="3" label="Completed" />
                    <StatCard num="68%" label="Roadmap progress" />
                    <StatCard num={`${user?.dailyHours || 0}h`} label="Daily target" />
                </div>

                {/* Main grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Tasks */}
                    <div className="lg:col-span-2 card-hard">
                        <div className="px-6 py-4 border-b border-ink/10 flex items-center justify-between">
                            <h2 className="font-display text-lg font-semibold text-ink">This week's tasks</h2>
                            <span className="font-mono text-xs text-signal bg-signal/10 px-2 py-0.5">4 pending</span>
                        </div>
                        <div className="py-1">
                            <TaskItem task="Submit Data Structures assignment" due="Nov 4" done={true} />
                            <TaskItem task="Revise resume (Project section)" due="Nov 5" done={false} />
                            <TaskItem task="Complete React — Hooks module" due="Nov 6" done={false} />
                            <TaskItem task="Mock interview with Mentor Suresh" due="Nov 7" done={false} />
                            <TaskItem task="Update LinkedIn profile" due="Nov 9" done={false} />
                        </div>
                    </div>

                    {/* Right column */}
                    <div className="space-y-4">
                        {/* Skills */}
                        <div className="card-hard p-5">
                            <h2 className="font-display text-base font-semibold text-ink mb-3">Skills</h2>
                            <div className="flex flex-wrap gap-2">
                                {(user?.skills || []).map((s) => (
                                    <span key={s} className="tag-pill-outline">{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* Roadmap preview */}
                        <div className="card-hard p-5">
                            <h2 className="font-display text-base font-semibold text-ink mb-3">Roadmap</h2>
                            <div className="space-y-2">
                                {['Foundations', 'Data Structures', 'System Design', 'Projects', 'Placement Prep'].map((phase, i) => (
                                    <div key={phase} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i < 2 ? 'bg-forest' : i === 2 ? 'bg-signal' : 'bg-ink/15'}`} />
                                        <span className={`font-body text-xs ${i < 2 ? 'text-forest font-medium' : i === 2 ? 'text-signal font-medium' : 'text-ink-faint'}`}>
                                            {phase}
                                        </span>
                                        {i < 2 && <span className="font-mono text-xs text-ink-faint ml-auto">Done</span>}
                                        {i === 2 && <span className="font-mono text-xs text-signal ml-auto">In progress</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="p-5 border border-signal/30 bg-signal/5">
                            <p className="font-mono text-xs text-signal uppercase tracking-widest mb-1">Coming soon</p>
                            <p className="font-body text-sm text-ink">RAG assistant, placement readiness score, and conflict detection are being built.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
