const desktopX = [170, 770, 350, 820, 470];

const stateLabel = (state) => ({
    completed: 'completed',
    current: 'current',
    locked: 'locked',
}[state] || state);

function JourneyIcon({ level }) {
    if (level.isFinal) {
        return (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m12 6 .8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3L12 6Z" fill="currentColor" stroke="none" />
            </svg>
        );
    }

    if (level.state === 'completed') {
        return (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    if (level.state === 'locked') {
        return (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" strokeLinecap="round" />
            </svg>
        );
    }

    return <span className="font-mono text-sm font-semibold" aria-hidden="true">{level.index}</span>;
}

function nodeClassName(level) {
    const stateClass = {
        completed: 'journey-node--done',
        current: 'journey-node--current',
        locked: 'journey-node--locked',
    }[level.state];
    return `journey-node ${stateClass}${level.isFinal ? ' journey-node--final' : ''}`;
}

function nodeLabel(level) {
    return `${level.title}, ${level.rangeLabel}, ${stateLabel(level.state)}, ${level.percent} percent complete`;
}

export default function JourneyMap({ levels, selectedLevel, onSelectLevel }) {
    if (levels.length === 0) {
        return (
            <div className="px-4 py-8 text-center font-body text-sm text-text-muted">
                There are no study days to map yet.
            </div>
        );
    }

    const mapHeight = Math.max(320, levels.length * 112);
    const points = levels.map((level, index) => ({
        level,
        x: desktopX[index] || 500,
        y: levels.length === 1 ? 500 : 100 + (index * 800) / (levels.length - 1),
    }));
    const pathSegments = points.slice(1).map((point, index) => {
        const previous = points[index];
        const controlX = Math.max(
            100,
            Math.min(900, (previous.x + point.x) / 2 + (index % 2 === 0 ? -120 : 120))
        );
        const controlY = (previous.y + point.y) / 2;
        const pathState = point.level.state === 'completed'
            ? 'journey-path--done'
            : point.level.state === 'locked'
                ? 'journey-path--locked'
                : 'journey-path--current';

        return (
            <path
                key={`${previous.level.index}-${point.level.index}`}
                d={`M ${previous.x} ${previous.y} Q ${controlX} ${controlY} ${point.x} ${point.y}`}
                className={`journey-path ${pathState}`}
            />
        );
    });
    const selected = levels.find((level) => level.index === selectedLevel);

    const selectLevel = (level) => {
        if (level.state === 'locked') return;
        onSelectLevel(selectedLevel === level.index ? null : level.index);
    };

    return (
        <div>
            <div className="journey-map-desktop relative hidden overflow-hidden md:block" style={{ height: `${mapHeight}px` }}>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                    {pathSegments}
                </svg>
                {points.map(({ level, x, y }) => (
                    <div
                        key={level.index}
                        className="journey-map__desktop-node"
                        style={{ left: `${x / 10}%`, top: `${y / 10}%` }}
                    >
                        <button
                            type="button"
                            className={`${nodeClassName(level)}${selectedLevel === level.index ? ' journey-node--selected' : ''}`}
                            onClick={() => selectLevel(level)}
                            disabled={level.state === 'locked'}
                            aria-label={nodeLabel(level)}
                            aria-pressed={selectedLevel === level.index}
                            title={`${level.title} · ${level.rangeLabel} · ${level.firstTopic}`}
                        >
                            <JourneyIcon level={level} />
                        </button>
                        <div className="journey-map__node-caption">
                            <span>{level.title}</span>
                            <span>{level.percent}%</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="journey-map-mobile relative md:hidden">
                <svg className="journey-map__mobile-path" viewBox={`0 0 72 ${levels.length * 96}`} preserveAspectRatio="none" aria-hidden="true">
                    {levels.slice(1).map((level, index) => {
                        const segmentClass = level.state === 'completed'
                            ? 'journey-path--done'
                            : level.state === 'locked'
                                ? 'journey-path--locked'
                                : 'journey-path--current';
                        return (
                            <path
                                key={`${index + 1}-${level.index}`}
                                d={`M 36 ${index * 96 + 36} L 36 ${(index + 1) * 96 + 36}`}
                                className={`journey-path ${segmentClass}`}
                            />
                        );
                    })}
                </svg>
                {levels.map((level) => (
                    <div key={level.index} className="journey-map__mobile-node">
                        <button
                            type="button"
                            className={`${nodeClassName(level)}${selectedLevel === level.index ? ' journey-node--selected' : ''}`}
                            onClick={() => selectLevel(level)}
                            disabled={level.state === 'locked'}
                            aria-label={nodeLabel(level)}
                            aria-pressed={selectedLevel === level.index}
                            title={`${level.title} · ${level.rangeLabel} · ${level.firstTopic}`}
                        >
                            <JourneyIcon level={level} />
                        </button>
                        <div className="journey-map__mobile-caption">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="font-display font-semibold text-text">{level.title}</span>
                                <span className="font-mono text-xs text-text-muted">{level.percent}% complete</span>
                            </div>
                            <p className="font-body text-xs text-text-muted">{level.rangeLabel}</p>
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <div className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3" aria-live="polite">
                    <p className="font-display font-semibold text-text">{selected.title}: {selected.rangeLabel}</p>
                    <p className="mt-1 font-body text-sm text-text-muted">{selected.firstTopic}</p>
                </div>
            )}
        </div>
    );
}
