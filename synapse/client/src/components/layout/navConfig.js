import {
    AnnouncementsIcon,
    DashboardIcon,
    DocumentsIcon,
    PlacementIcon,
    PlannerIcon,
    ProfileIcon,
    RoadmapsIcon,
    TasksIcon,
} from './navIcons.jsx';

export const getNavGroups = (role) => {
    if (role === 'student') {
        return [
            {
                label: 'WORKSPACE',
                items: [
                    { label: 'Dashboard', to: '/student', icon: DashboardIcon },
                    { label: 'Tasks', to: '/tasks', icon: TasksIcon },
                    { label: 'Planner', to: '/planner', icon: PlannerIcon },
                ],
            },
            {
                label: 'LEARNING',
                items: [
                    { label: 'Roadmaps', to: '/roadmaps', icon: RoadmapsIcon },
                    { label: 'Announcements', to: '/announcements/inbox', icon: AnnouncementsIcon },
                ],
            },
            {
                label: 'CAREER',
                items: [
                    { label: 'Placement', to: '/placement', icon: PlacementIcon },
                ],
            },
            {
                label: 'ACCOUNT',
                items: [
                    { label: 'Profile', to: '/profile', icon: ProfileIcon },
                ],
            },
        ];
    }

    if (role === 'mentor') {
        return [
            {
                label: 'WORKSPACE',
                items: [
                    { label: 'Dashboard', to: '/mentor', icon: DashboardIcon },
                    { label: 'Placement drives', to: '/placement/drives', icon: PlacementIcon },
                    { label: 'Documents', to: '/documents', icon: DocumentsIcon },
                    { label: 'Announcements', to: '/announcements', icon: AnnouncementsIcon },
                ],
            },
        ];
    }

    if (role === 'admin') {
        return [
            {
                label: 'WORKSPACE',
                items: [
                    { label: 'Dashboard', to: '/admin', icon: DashboardIcon },
                    { label: 'Documents', to: '/documents', icon: DocumentsIcon },
                    { label: 'Placement drives', to: '/placement/drives', icon: PlacementIcon },
                    { label: 'Announcements', to: '/announcements', icon: AnnouncementsIcon },
                ],
            },
        ];
    }

    return [];
};
