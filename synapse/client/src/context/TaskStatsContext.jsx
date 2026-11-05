import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const TaskStatsContext = createContext(null);

export const TaskStatsProvider = ({ children }) => {
    const [refreshKey, setRefreshKey] = useState(0);
    const notifyTasksChanged = useCallback(() => {
        setRefreshKey((current) => current + 1);
    }, []);
    const value = useMemo(() => ({ refreshKey, notifyTasksChanged }), [refreshKey, notifyTasksChanged]);

    return (
        <TaskStatsContext.Provider value={value}>
            {children}
        </TaskStatsContext.Provider>
    );
};

export const useTaskStats = () => {
    const context = useContext(TaskStatsContext);
    if (!context) throw new Error('useTaskStats must be used inside TaskStatsProvider');
    return context;
};
