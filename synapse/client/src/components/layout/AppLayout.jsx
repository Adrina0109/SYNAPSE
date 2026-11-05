import { useLocation, useOutlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AssistantWidget from '../assistant/AssistantWidget.jsx';
import MobileNav from './MobileNav.jsx';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { getNavGroups } from './navConfig.js';

const getPageTitle = (pathname, role) => {
    const item = getNavGroups(role).flatMap((group) => group.items)
        .find((navItem) => navItem.to === pathname);
    if (item) return item.label;
    if (/^\/roadmaps\/[^/]+$/.test(pathname)) return 'Roadmap detail';
    if (pathname === '/announcements/inbox') return 'Announcements';
    return 'Workspace';
};

export default function AppLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const outlet = useOutlet();
    const showAssistant = user?.role === 'student' && location.pathname !== '/assistant';

    return (
        <div className="min-h-screen min-w-0 bg-bg text-text lg:pl-64">
            <Sidebar />
            <MobileNav />
            <TopBar title={getPageTitle(location.pathname, user?.role)} />
            <main className="mx-auto min-w-0 w-full max-w-[1600px] px-4 py-6 md:px-8 lg:px-10 lg:py-8">
                {outlet}
            </main>
            {showAssistant && <AssistantWidget />}
        </div>
    );
}