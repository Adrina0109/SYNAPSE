import AssistantChat from '../components/assistant/AssistantChat.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';

export default function Assistant() {
    return (
        <div className="mx-auto w-full max-w-4xl">
            <PageHeader
                title="AI Assistant"
                subtitle="Answers from your uploaded documents, with sources."
            />
            <AssistantChat variant="page" />
        </div>
    );
}