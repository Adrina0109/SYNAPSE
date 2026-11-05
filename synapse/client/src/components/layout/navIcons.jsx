const Icon = ({ children }) => (
    <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 shrink-0"
    >
        {children}
    </svg>
);

export const DashboardIcon = () => (
    <Icon><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="11" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /></Icon>
);

export const TasksIcon = () => (
    <Icon><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 .8.8L6 5m-2.5 7 .8.8L6 11m-2.5 7 .8.8L6 17" /></Icon>
);

export const PlannerIcon = () => (
    <Icon><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-13 4h3m-3 3h7" /></Icon>
);

export const RoadmapsIcon = () => (
    <Icon><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 2 4" /><path d="M6 8v8a2 2 0 0 0 2 2h8" /></Icon>
);

export const AssistantIcon = () => (
    <Icon><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12" /><circle cx="12" cy="12" r="4" /></Icon>
);

export const AnnouncementsIcon = () => (
    <Icon><path d="m3 11 18-5v12L3 13v-2Z" /><path d="M11 15.2 13 21l4-1.1-2.4-3.4M5 14l1.5 5H10" /></Icon>
);

export const PlacementIcon = () => (
    <Icon><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2" /></Icon>
);

export const DocumentsIcon = () => (
    <Icon><path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5m-9 4h5m-5 4h5" /></Icon>
);

export const ProfileIcon = () => (
    <Icon><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>
);
