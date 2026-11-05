import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './components/RouteGuards.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Pages
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Tasks from './pages/Tasks.jsx';
import Planner from './pages/Planner.jsx';
import Placement from './pages/Placement.jsx';
import SharePublic from './pages/SharePublic.jsx';
import DrivesManage from './pages/DrivesManage.jsx';
import Announcements from './pages/Announcements.jsx';
import AnnouncementInbox from './pages/AnnouncementInbox.jsx';
import Assistant from './pages/Assistant.jsx';
import Documents from './pages/Documents.jsx';
import Roadmaps from './pages/Roadmaps.jsx';
import RoadmapDetail from './pages/RoadmapDetail.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import MentorDashboard from './pages/MentorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/share/:token" element={<SharePublic />} />

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
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
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
                    path="/planner"
                    element={
                        <RoleRoute role="student">
                            <Planner />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/placement"
                    element={
                        <RoleRoute role="student">
                            <Placement />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/placement/drives"
                    element={
                        <RoleRoute role={['mentor', 'admin']}>
                            <DrivesManage />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/roadmaps"
                    element={
                        <RoleRoute role="student">
                            <Roadmaps />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/roadmaps/:id"
                    element={
                        <RoleRoute role="student">
                            <RoadmapDetail />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/announcements"
                    element={
                        <RoleRoute role={['mentor', 'admin']}>
                            <Announcements />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/announcements/inbox"
                    element={
                        <RoleRoute role="student">
                            <AnnouncementInbox />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/assistant"
                    element={
                        <RoleRoute role="student">
                            <Assistant />
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
                    path="/documents"
                    element={
                        <RoleRoute role={['mentor', 'admin']}>
                            <Documents />
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
                <Route
                    path="/admin/documents"
                    element={
                        <RoleRoute role="admin">
                            <Documents />
                        </RoleRoute>
                    }
                />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
