import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './components/RouteGuards.jsx';

// Pages
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Tasks from './pages/Tasks.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import MentorDashboard from './pages/MentorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />

            {/* Auth pages — redirect if already logged in */}
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />

            {/* Onboarding — students only */}
            <Route
                path="/onboarding"
                element={
                    <ProtectedRoute>
                        <Onboarding />
                    </ProtectedRoute>
                }
            />

            {/* Dashboards */}
            <Route
                path="/student"
                element={
                    <RoleRoute role="student">
                        <StudentDashboard />
                    </RoleRoute>
                }
            />
            <Route
                path="/tasks"
                element={
                    <RoleRoute role="student">
                        <Tasks />
                    </RoleRoute>
                }
            />
            <Route
                path="/mentor"
                element={
                    <RoleRoute role="mentor">
                        <MentorDashboard />
                    </RoleRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <RoleRoute role="admin">
                        <AdminDashboard />
                    </RoleRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
