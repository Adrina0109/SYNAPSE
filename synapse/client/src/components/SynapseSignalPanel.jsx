/**
 * The right-hand accent panel used on auth pages (Login / Signup).
 * Bold signal-red background with the SVG signal-network motif and a quote.
 */
export default function SynapseSignalPanel({ quote, subtext }) {
    return (
        <div
            className="hidden lg:flex flex-col justify-between p-12 xl:p-16"
            style={{ background: '#E8401C', minWidth: '420px', maxWidth: '520px' }}
        >
            {/* Top: Signal-network SVG */}
            <div className="flex-1 flex items-center justify-center">
                <AnimatedSignalSVG />
            </div>

            {/* Bottom: Quote */}
            <div>
                <div className="w-8 h-px bg-white/40 mb-6" />
                <blockquote className="font-display text-white text-2xl font-semibold leading-tight mb-3">
                    "{quote}"
                </blockquote>
                <p className="font-body text-white/70 text-sm">{subtext}</p>
            </div>
        </div>
    );
}

function AnimatedSignalSVG() {
    const nodes = [
        { cx: 160, cy: 60, label: 'Resume due Fri', delay: '0s' },
        { cx: 280, cy: 140, label: 'React roadmap', delay: '0.3s' },
        { cx: 80, cy: 200, label: 'Mock interview', delay: '0.6s' },
        { cx: 240, cy: 280, label: 'TA session 4pm', delay: '0.9s' },
        { cx: 130, cy: 340, label: 'DSA Week 8', delay: '1.2s' },
        { cx: 300, cy: 380, label: 'All connected', delay: '1.5s' },
    ];

    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 2], [1, 3],
    ];

    return (
        <svg width="380" height="440" viewBox="0 0 380 440" fill="none" aria-hidden="true">
            {/* Animated connection lines */}
            {edges.map(([a, b], i) => (
                <line
                    key={i}
                    x1={nodes[a].cx}
                    y1={nodes[a].cy}
                    x2={nodes[b].cx}
                    y2={nodes[b].cy}
                    stroke="white"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                    strokeDasharray="500"
                    strokeDashoffset="500"
                    style={{
                        animation: `drawLine 1.2s ease forwards`,
                        animationDelay: nodes[a].delay,
                    }}
                />
            ))}

            {/* Nodes */}
            {nodes.map((n, i) => (
                <g key={i} style={{ animation: `fadeIn 0.4s ease forwards`, animationDelay: n.delay, opacity: 0 }}>
                    <circle cx={n.cx} cy={n.cy} r="5" fill="white" fillOpacity="0.9" />
                    <circle cx={n.cx} cy={n.cy} r="9" fill="white" fillOpacity="0.12" />
                    {/* Label chip */}
                    <g transform={`translate(${n.cx + 14}, ${n.cy - 7})`}>
                        <rect
                            x="0" y="0" width={n.label.length * 6.5 + 12} height="18"
                            fill="white" fillOpacity="0.12"
                            rx="2"
                        />
                        <text
                            x="6" y="13"
                            fill="white"
                            fillOpacity="0.85"
                            fontSize="9"
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="500"
                        >
                            {n.label}
                        </text>
                    </g>
                </g>
            ))}

            {/* Keyframe styles embedded */}
            <defs>
                <style>{`
          @keyframes drawLine {
            to { stroke-dashoffset: 0; }
          }
          @keyframes fadeIn {
            to { opacity: 1; }
          }
        `}</style>
            </defs>
        </svg>
    );
}
