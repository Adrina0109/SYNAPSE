export function buildJourneyLevels(days, status) {
    if (!Array.isArray(days) || days.length === 0) return [];

    const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
    const levelCount = Math.min(5, sortedDays.length);
    const baseSize = Math.floor(sortedDays.length / levelCount);
    const extraDays = sortedDays.length % levelCount;
    const chunks = [];
    let offset = 0;

    for (let index = 0; index < levelCount; index += 1) {
        const chunkSize = baseSize + (index < extraDays ? 1 : 0);
        chunks.push(sortedDays.slice(offset, offset + chunkSize));
        offset += chunkSize;
    }

    const levelProgress = chunks.map((chunk, index) => {
        const dayNumbers = chunk.map((day) => day.dayNumber);
        const firstDay = dayNumbers[0];
        const lastDay = dayNumbers[dayNumbers.length - 1];
        const completedCount = chunk.filter((day) => day.completed).length;
        const total = chunk.length;

        return {
            index: index + 1,
            dayNumbers,
            firstDay,
            lastDay,
            completedCount,
            total,
            percent: total === 0 ? 0 : Math.round((completedCount / total) * 100),
            firstTopic: chunk[0].topic,
            title: `Level ${index + 1}`,
            rangeLabel: firstDay === lastDay ? `Day ${firstDay}` : `Days ${firstDay} to ${lastDay}`,
        };
    });

    const firstIncompleteIndex = levelProgress.findIndex((level) => level.completedCount < level.total);

    return levelProgress.map((level, index) => ({
        ...level,
        state: status === 'completed' || firstIncompleteIndex === -1 || index < firstIncompleteIndex
            ? 'completed'
            : index === firstIncompleteIndex
                ? 'current'
                : 'locked',
        isFinal: index === levelProgress.length - 1,
    }));
}
