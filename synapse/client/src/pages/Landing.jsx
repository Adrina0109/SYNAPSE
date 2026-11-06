import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─── SVG Logo ────────────────────────────────────────────────────────────────
const Logo = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="4" cy="14" r="2.5" fill="var(--accent)" />
        <circle cx="14" cy="6" r="2.5" fill="var(--accent)" />
        <circle cx="24" cy="14" r="2.5" fill="var(--accent)" />
        <circle cx="14" cy="22" r="2.5" fill="var(--accent)" />
        <line x1="4" y1="14" x2="14" y2="6" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.35" />
        <line x1="14" y1="6" x2="24" y2="14" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.35" />
        <line x1="24" y1="14" x2="14" y2="22" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.35" />
        <line x1="14" y1="22" x2="4" y2="14" stroke="var(--text)" strokeWidth="1.5" strokeOpacity="0.35" />
    </svg>
);

// ─── Animated Hero Signal Network ────────────────────────────────────────────
const HeroSignalSVG = () => {
    const [drawn, setDrawn] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDrawn(true), 100);
        return () => clearTimeout(t);
    }, []);

    const nodes = [
        { id: 'n1', cx: 80, cy: 60, label: 'WhatsApp msg', sub: 'Resume workshop?' },
        { id: 'n2', cx: 260, cy: 40, label: 'Email notice', sub: 'Subject: Circular 4' },
        { id: 'n3', cx: 420, cy: 80, label: 'PDF circular', sub: 'Exam schedule.pdf' },
        { id: 'n4', cx: 160, cy: 160, label: 'Mentor note', sub: '"Push DSA first"' },
        { id: 'n5', cx: 340, cy: 190, label: 'Google Form', sub: 'Attendance — due today' },
        { id: 'n6', cx: 500, cy: 150, label: 'Noticeboard', sub: 'Internship listing' },
        { id: 'center', cx: 290, cy: 300, label: '✦ SYNAPSE', sub: 'One path', isCenter: true },
    ];

    const edges = [
        ['n1', 'center'], ['n2', 'center'], ['n3', 'center'],
        ['n4', 'center'], ['n5', 'center'], ['n6', 'center'],
    ];

    const getNode = (id) => nodes.find((n) => n.id === id);

    return (
        <svg
            viewBox="0 0 580 380"
            className="w-full h-auto"
            aria-label="Signal network diagram showing scattered sources converging into SYNAPSE"
        >
            <defs>
                <style>{`
          @keyframes dash { to { stroke-dashoffset: 0; } }
          @keyframes pop { 0% { opacity:0; transform:scale(0.7); } 100% { opacity:1; transform:scale(1); } }
        `}</style>
            </defs>

            {/* Connection lines */}
            {edges.map(([aId, bId], i) => {
                const a = getNode(aId);
                const b = getNode(bId);
                return (
                    <line
                        key={i}
                        x1={a.cx} y1={a.cy}
                        x2={b.cx} y2={b.cy}
                        stroke="var(--accent)"
                        strokeWidth="1.5"
                        strokeOpacity="0.3"
                        strokeDasharray="320"
                        strokeDashoffset={drawn ? 0 : 320}
                        style={{
                            transition: `stroke-dashoffset 1.1s ease ${i * 0.15}s`,
                        }}
                    />
                );
            })}

            {/* Source nodes */}
            {nodes.filter((n) => !n.isCenter).map((n, i) => (
                <g
                    key={n.id}
                    style={{
                        opacity: drawn ? 1 : 0,
                        transition: `opacity 0.4s ease ${0.1 + i * 0.1}s`,
                    }}
                >
                    {/* Card bg */}
                    <rect
                        x={n.cx - 52} y={n.cy - 20}
                        width="104" height="40"
                        fill="var(--surface)"
                        stroke="var(--text)"
                        strokeOpacity="0.15"
                        strokeWidth="1"
                        rx="2"
                    />
                    {/* Dot */}
                    <circle cx={n.cx} cy={n.cy - 24} r="3.5" fill="var(--text)" fillOpacity="0.25" />
                    {/* Label */}
                    <text x={n.cx} y={n.cy - 5} textAnchor="middle" fill="var(--text)" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="500" fillOpacity="0.7">
                        {n.label}
                    </text>
                    <text x={n.cx} y={n.cy + 9} textAnchor="middle" fill="var(--text)" fontSize="8" fontFamily="JetBrains Mono, monospace" fillOpacity="0.45">
                        {n.sub}
                    </text>
                </g>
            ))}

            {/* Center SYNAPSE node */}
            {(() => {
                const c = getNode('center');
                return (
                    <g style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.5s ease 0.9s' }}>
                        <rect
                            x={c.cx - 64} y={c.cy - 28}
                            width="128" height="56"
                            fill="var(--accent)"
                            rx="2"
                        />
                        <text x={c.cx} y={c.cy - 4} textAnchor="middle" fill="var(--accent-foreground)" fontSize="13" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700">
                            {c.label}
                        </text>
                        <text x={c.cx} y={c.cy + 13} textAnchor="middle" fill="var(--accent-foreground)" fontSize="9" fontFamily="JetBrains Mono, monospace" fillOpacity="0.8">
                            {c.sub}
                        </text>
                    </g>
                );
            })()}
        </svg>
    );
};

// ─── Scattered paper snippets (Problem section) ───────────────────────────────
const PaperSnippet = ({ text, from, rotate, className }) => (
    <div
        className={`absolute w-48 border border-border bg-surface px-3 py-2 ${className}`}
        style={{
            transform: `rotate(${rotate}deg)`,
            boxShadow: '2px 2px 0 rgb(var(--text-rgb) / 0.08)',
            borderRadius: '1px',
        }}
    >
        <p className="font-mono text-xs text-ink-faint mb-1 uppercase tracking-wider">{from}</p>
        <p className="font-body text-xs text-ink leading-snug">{text}</p>
    </div>
);

// ─── Nav ──────────────────────────────────────────────────────────────────────
const Nav = ({ scrolled }) => (
    <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-paper/95 backdrop-blur-sm border-b border-ink/10' : 'bg-transparent'}`}
    >
        <nav className="max-w-6xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
                <Logo />
                <span className="font-display font-bold text-lg tracking-tight text-ink">SYNAPSE</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
                {[
                    { label: 'How it works', href: '#how' },
                    { label: 'For students', href: '#roles' },
                    { label: 'Features', href: '#features' },
                ].map((link) => (
                    <a
                        key={link.label}
                        href={link.href}
                        className="font-body text-sm text-ink-muted hover:text-ink transition-colors"
                    >
                        {link.label}
                    </a>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Link to="/login" className="btn-ghost hidden sm:inline-flex text-sm">Sign in</Link>
                <Link to="/signup" className="btn-primary text-sm px-5 py-2.5">Get started</Link>
            </div>
        </nav>
    </header>
);

// ─── How It Works Step ────────────────────────────────────────────────────────
const Step = ({ num, title, desc, isLast }) => (
    <div className="relative flex gap-6">
        {/* Vertical line */}
        {!isLast && (
            <div className="absolute left-5 top-10 w-px bg-ink/15" style={{ height: 'calc(100% + 32px)' }} />
        )}
        <div className="flex-shrink-0 w-10 h-10 bg-ink text-paper font-mono text-xs font-medium flex items-center justify-center" style={{ borderRadius: '2px' }}>
            {num}
        </div>
        <div className="pb-8">
            <h3 className="font-display text-xl font-semibold text-ink mb-1">{title}</h3>
            <p className="font-body text-sm text-ink-muted leading-relaxed">{desc}</p>
        </div>
    </div>
);

// ─── Feature Card ─────────────────────────────────────────────────────────────
const FeatCard = ({ title, desc, tag, accent, wide, tall }) => (
    <div
        className={`card-hard p-6 flex flex-col ${wide ? 'col-span-2' : ''} ${tall ? 'row-span-2' : ''}`}
        style={{ boxShadow: '0 1px 3px rgb(var(--text-rgb) / 0.08)' }}
    >
        {tag && <span className={`mb-4 self-start rounded-full px-2 py-0.5 font-mono text-xs ${accent ? 'bg-signal text-accent-foreground' : 'bg-ink/8 text-ink-faint'}`}>{tag}</span>}
        <h3 className="font-display text-lg font-semibold text-ink mb-2">{title}</h3>
        <p className="font-body text-sm text-ink-muted leading-relaxed">{desc}</p>
    </div>
);

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="bg-paper min-h-screen overflow-x-hidden">
            {/* 1 ── NAV */}
            <Nav scrolled={scrolled} />

            {/* 2 ── HERO */}
            <section className="min-h-screen pt-24 pb-16 px-6 lg:px-10 flex flex-col lg:flex-row items-center max-w-6xl mx-auto gap-12">
                {/* Copy */}
                <div className="flex-1 pt-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-6 h-px bg-signal" />
                        <span className="font-mono text-xs tracking-widest uppercase text-signal">Academic coordination layer</span>
                    </div>

                    <h1 className="font-display font-bold text-ink leading-[0.95] tracking-tight mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}>
                        Every message.<br />
                        One<br />
                        <span className="text-accent">clear path.</span>
                    </h1>

                    <p className="font-body text-ink-muted text-lg leading-relaxed mb-10 max-w-lg">
                        Your batch runs on WhatsApp forwards, circular PDFs, and scattered mentor notes.
                        SYNAPSE reads all of it and turns the noise into tasks, roadmaps, and deadlines — for every student in the room.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <Link to="/signup" className="btn-primary px-7 py-3.5 text-base" style={{ boxShadow: '4px 4px 0 var(--accent-strong)' }}>
                            Join your batch →
                        </Link>
                        <a href="#how" className="btn-secondary text-base px-7 py-3.5">
                            See how it works
                        </a>
                    </div>

                </div>

                {/* Signal SVG */}
                <div className="flex-1 w-full max-w-xl">
                    <HeroSignalSVG />
                </div>
            </section>

            {/* Hairline divider */}
            <div className="border-t border-ink/8 mx-6 lg:mx-10" />

            {/* 3 ── THE PROBLEM */}
            <section className="py-24 px-6 lg:px-10 max-w-6xl mx-auto">
                <div className="mb-16">
                    <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">01 — The problem</span>
                    <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink mt-3 leading-tight max-w-2xl">
                        Your batch's information is a mess. On purpose.
                    </h2>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Scattered snippets */}
                    <div className="relative h-80">
                        <PaperSnippet from="WhatsApp · 11:42pm" text="Resume workshop is happening today — Room 301 or 302 ?" rotate={-4} className="top-4 left-2" />
                        <PaperSnippet from="Email · Subject: Circular 4" text="IMPORTANT: Exam schedule changed. Refer attached PDF for new dates." rotate={2.5} className="top-2 right-4 w-52" />
                        <PaperSnippet from="Google Form" text="Internal assessment attendance — fill before 5pm or marked absent" rotate={-2} className="top-32 left-14" />
                        <PaperSnippet from="Notice board" text="XYZ Corp campus drive — apply via college portal (link TBA)" rotate={3} className="bottom-4 right-0 w-44" />
                        <PaperSnippet from="Mentor · Telegram" text={"\"DSA first, then system design. Don't touch placements until Oct.\""} rotate={-1.5} className="bottom-2 left-4 w-52" />
                    </div>

                    {/* Arrow + task card */}
                    <div className="flex flex-col items-start gap-6">
                        <div className="flex items-center gap-4 text-ink-faint">
                            <div className="w-12 h-px bg-ink/20" />
                            <span className="font-mono text-xs">SYNAPSE reads all of it</span>
                            <div className="text-signal text-lg">→</div>
                        </div>

                        {/* Organised task card */}
                        <div className="card-hard w-full max-w-sm" style={{ boxShadow: '6px 6px 0 rgb(var(--text-rgb) / 0.12)' }}>
                            <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
                                <span className="font-mono text-xs text-ink-faint uppercase tracking-widest">Today · Nov 4</span>
                                <span className="rounded-full bg-signal px-2 py-0.5 font-mono text-xs text-accent-foreground">3 tasks</span>
                            </div>

                            {[
                                { t: 'Confirm resume workshop room', src: 'WhatsApp', done: true },
                                { t: 'Fill attendance form by 5pm', src: 'Google Form', done: false },
                                { t: 'Check updated exam schedule', src: 'Email circular', done: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-ink/8 last:border-0">
                                    <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-forest border-forest' : 'border-ink/25'}`} style={{ borderRadius: '1px' }}>
                                        {item.done && <span className="text-bg text-xs">✓</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-body text-sm ${item.done ? 'line-through text-ink-faint' : 'text-ink'}`}>{item.t}</p>
                                        <p className="font-mono text-xs text-ink-faint">{item.src}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Hairline */}
            <div className="border-t border-ink/8 mx-6 lg:mx-10" />

            {/* 4 ── HOW IT WORKS */}
            <section id="how" className="py-24 px-6 lg:px-10 max-w-6xl mx-auto">
                <div className="mb-16">
                    <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">02 — How it works</span>
                    <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink mt-3 leading-tight max-w-xl">
                        Four steps. One system.
                    </h2>
                </div>

                <div className="max-w-lg">
                    <Step num="01" title="Announcement in" desc="Admin posts (or pastes) announcements from any source — WhatsApp, email, circular. AI parses the text into structured tasks with due dates and affected groups." />
                    <Step num="02" title="Tasks appear" desc="Every student sees exactly what applies to them. No more reading a 3-paragraph circular just to extract one sentence. Conflict detection flags when two deadlines clash." />
                    <Step num="03" title="Roadmap adjusts" desc="SYNAPSE knows your skills and career goal. It surfaces the next learning step on your personalised roadmap alongside batch tasks — not instead of them." />
                    <Step num="04" title="Progress tracked" isLast desc="Mentors see who's on track, who's falling behind, and where the batch is stuck. Admins get one-number placement readiness — no spreadsheet, no chasing." />
                </div>
            </section>

            {/* Hairline */}
            <div className="border-t border-ink/8 mx-6 lg:mx-10" />

            {/* 5 ── THREE ROLES */}
            <section id="roles" className="py-24 px-6 lg:px-10 max-w-6xl mx-auto">
                <div className="mb-16">
                    <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">03 — Who it's for</span>
                    <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink mt-3 leading-tight">
                        One platform. Three views.
                    </h2>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Student */}
                    <div className="card-hard overflow-hidden">
                        <div className="px-5 py-3 bg-ink text-paper flex items-center justify-between">
                            <span className="font-mono text-xs uppercase tracking-widest">Student</span>
                            <span className="font-mono text-xs opacity-50">Year 3 · CS</span>
                        </div>
                        {/* Simulated UI fragment */}
                        <div className="p-5 space-y-3">
                            <div className="bg-signal/10 border border-signal/20 p-3" style={{ borderRadius: '2px' }}>
                                <p className="font-mono text-xs text-signal mb-1">Today's priority</p>
                                <p className="font-body text-sm text-ink font-medium">Review linked list problems — DSA Week 6</p>
                            </div>
                            <div className="space-y-2">
                                {['Resume due — Fri 5pm', 'Mock interview prep', 'React hooks module'].map((t, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-3 h-3 border border-ink/25 flex-shrink-0" style={{ borderRadius: '1px' }} />
                                        <span className="font-body text-xs text-ink-muted">{t}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-ink/10">
                            <p className="font-body text-xs text-ink-muted">Your tasks, roadmap, and placement score — in one tab.</p>
                        </div>
                    </div>

                    {/* Mentor */}
                    <div className="card-hard overflow-hidden">
                        <div className="px-5 py-3 bg-ink text-paper flex items-center justify-between">
                            <span className="font-mono text-xs uppercase tracking-widest">Mentor</span>
                            <span className="font-mono text-xs opacity-50">5 students</span>
                        </div>
                        <div className="p-5 space-y-2">
                            {[
                                { name: 'Aarav S.', pct: 72, ok: true },
                                { name: 'Priya N.', pct: 34, ok: false },
                                { name: 'Rohan M.', pct: 88, ok: true },
                                { name: 'Sneha P.', pct: 55, ok: true },
                            ].map((s) => (
                                <div key={s.name} className="flex items-center gap-3">
                                    <span className="font-body text-sm text-ink w-20 flex-shrink-0">{s.name}</span>
                                    <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${s.ok ? 'bg-forest' : 'bg-signal'}`} style={{ width: `${s.pct}%` }} />
                                    </div>
                                    <span className="font-mono text-xs text-ink-faint w-8">{s.pct}%</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-3 border-t border-ink/10">
                            <p className="font-body text-xs text-ink-muted">See progress, spot who needs help, no inbox-chasing.</p>
                        </div>
                    </div>

                    {/* Admin */}
                    <div className="card-hard overflow-hidden">
                        <div className="px-5 py-3 bg-ink text-paper flex items-center justify-between">
                            <span className="font-mono text-xs uppercase tracking-widest">Admin</span>
                            <span className="font-mono text-xs opacity-50">Batch of 60</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                    { n: '60', l: 'Students' },
                                    { n: '4', l: 'Mentors' },
                                    { n: '38%', l: 'Placement ready' },
                                ].map((m) => (
                                    <div key={m.l} className="bg-ink/4 py-2" style={{ borderRadius: '2px' }}>
                                        <div className="font-display text-xl font-bold text-ink">{m.n}</div>
                                        <div className="font-mono text-xs text-ink-faint">{m.l}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs font-mono text-ink-faint border border-ink/10 px-3 py-2" style={{ borderRadius: '2px' }}>
                                📢 Announcement sent → 60 tasks generated
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-ink/10">
                            <p className="font-body text-xs text-ink-muted">Post once. The tasks distribute themselves.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Hairline */}
            <div className="border-t border-ink/8 mx-6 lg:mx-10" />

            {/* 6 ── FEATURES BENTO */}
            <section id="features" className="py-24 px-6 lg:px-10 max-w-6xl mx-auto">
                <div className="mb-16">
                    <span className="font-mono text-xs tracking-widest uppercase text-ink-faint">04 — What's inside</span>
                    <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink mt-3 leading-tight max-w-xl">
                        Not a feature list. A working system.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 card-hard p-8" style={{ borderRadius: '14px', boxShadow: '0 1px 3px rgb(var(--text-rgb) / 0.08)' }}>
                        <span className="mb-4 inline-block rounded-full bg-signal px-2 py-0.5 font-mono text-xs text-accent-foreground">Core</span>
                        <h3 className="font-display text-2xl font-bold text-ink mb-3">AI announcement → task</h3>
                        <p className="font-body text-sm text-ink-muted leading-relaxed max-w-md">
                            Paste a WhatsApp forward or email circular. SYNAPSE extracts: what to do, who needs to do it, when it's due — no manual parsing. The same source can generate different tasks for different years or departments.
                        </p>
                    </div>

                    <FeatCard
                        title="Deadline conflict detection"
                        desc="Two assignments due the same day? SYNAPSE flags it before students are already stuck at midnight."
                        tag="Smart"
                    />

                    <FeatCard
                        title="RAG assistant with citations"
                        desc="Ask anything about your batch's syllabus, announcements, or roadmap. Answers come with the source so you know it's not hallucinated."
                        tag="AI"
                        accent
                    />

                    <FeatCard
                        title="Personalised skill roadmaps"
                        desc="Not a generic 'learn DSA' plan. Built around your current skills, target role, and the hours you actually have per day."
                        tag="Adaptive"
                    />

                    <FeatCard
                        title="Placement readiness score"
                        desc="One number that tracks resume, DSA, projects, mock interviews, and domain knowledge — updated as students complete tasks."
                        tag="Placement"
                    />

                    <div className="md:col-span-2 card-hard p-8" style={{ borderRadius: '14px', boxShadow: '0 1px 3px rgb(var(--text-rgb) / 0.08)' }}>
                        <span className="mb-4 inline-block rounded-full bg-ink px-2 py-0.5 font-mono text-xs text-paper">Mentor tools</span>
                        <h3 className="font-display text-2xl font-bold text-ink mb-3">At-risk student detection</h3>
                        <p className="font-body text-sm text-ink-muted leading-relaxed max-w-lg">
                            When a student's task completion rate drops or they're consistently behind the roadmap, mentors are surfaced an alert — not an inbox full of emails. Intervene before the deadline, not after.
                        </p>
                    </div>
                </div>
            </section>

            {/* 7 ── CTA BAND */}
            <section className="mx-6 mb-10 bg-accent lg:mx-10">
                <div className="max-w-4xl mx-auto px-8 py-16 text-center">
                    <p className="mb-4 font-mono text-xs uppercase tracking-widest text-accent-foreground/60">Ready?</p>
                    <h2 className="mb-6 font-display text-4xl font-bold leading-tight text-accent-foreground lg:text-5xl">
                        Your batch is already talking.<br />Start listening systematically.
                    </h2>
                    <p className="mx-auto mb-10 max-w-lg font-body text-lg text-accent-foreground/75">
                        Sign up as a student. Ask your admin to set up the batch. Don't wait until placement season to get organised.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 rounded-[10px] bg-surface px-8 py-4 font-display text-base font-semibold text-accent transition-all hover:bg-surface-2"
                            style={{ boxShadow: '0 1px 3px rgb(var(--text-rgb) / 0.15)' }}
                        >
                            Join your batch →
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 rounded-[10px] border border-accent-foreground/40 bg-transparent px-8 py-4 font-body text-base font-medium text-accent-foreground transition-all hover:bg-accent-foreground/10"
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            </section>

            {/* 8 ── FOOTER */}
            <footer className="border-t border-ink/10 px-6 lg:px-10 py-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <Logo />
                        <div>
                            <span className="font-display font-bold text-base text-ink block">SYNAPSE</span>
                            <span className="font-mono text-xs text-ink-faint">Academic coordination layer</span>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="font-body text-sm text-ink-muted">
                            Built by <span className="font-medium text-ink">Team Cipher</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
