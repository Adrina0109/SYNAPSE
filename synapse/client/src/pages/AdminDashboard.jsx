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

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-paper">
            <nav className="border-b border-ink/10 px-6 lg:px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SignalLogo />
                    <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
                    <span className="hidden sm:block font-mono text-xs text-ink-faint border-l border-ink/15 pl-3 ml-1">Admin</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hidden md:block font-body text-sm text-ink-muted">{user?.name}</span>
                    <button onClick={handleLogout} className="btn-ghost text-sm">Sign out</button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
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
