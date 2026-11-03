import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Loading spinner while auth state loads
const LoadingSpinner = () => (
    <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-ink/20 border-t-signal rounded-full animate-spin" />
            <span className="font-mono text-xs text-ink-faint tracking-widest uppercase">Loading</span>
        </div>
    </div>
);

// Redirect unauthenticated users to /login
export const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingSpinner />;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

// Redirect to correct dashboard for role, handle onboarding
export const RoleRoute = ({ role, children }) => {
    const { user, loading, getDashboardPath } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingSpinner />;

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.role !== role) {
        return <Navigate to={getDashboardPath()} replace />;
    }

    // Students must complete onboarding first
    if (role === 'student' && !user.onboardingComplete && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    return children;
};

// Redirect logged-in users away from auth pages
export const PublicOnlyRoute = ({ children }) => {
    const { user, loading, getDashboardPath } = useAuth();

    if (loading) return <LoadingSpinner />;

    if (user) {
        return <Navigate to={getDashboardPath()} replace />;
    }

    return children;
};
