import { useState } from 'react';
import api from '../../lib/api.js';

const GROUPS = [
    { key: 'technical', label: 'Technical' },
    { key: 'projects', label: 'Projects' },
    { key: 'behavioral', label: 'Behavioral' },
];

export default function InterviewChecklist({ checklist, onToggled }) {
    const [pendingKeys, setPendingKeys] = useState([]);
    const [errors, setErrors] = useState({});
    const items = checklist?.items || [];
    const tickedCount = items.filter((item) => item.ticked).length;

    const toggleItem = async (item) => {
        setPendingKeys((current) => [...current, item.key]);
        setErrors((current) => ({ ...current, [item.key]: '' }));
        try {
            const { data } = await api.patch(`/placement/checklist/${encodeURIComponent(item.key)}`, {
                ticked: !item.ticked,
            });
            onToggled(data.checklist);
        } catch (error) {
            setErrors((current) => ({
                ...current,
                [item.key]: error.response?.data?.message || 'Could not update this checklist item.',
            }));
        } finally {
            setPendingKeys((current) => current.filter((key) => key !== item.key));
        }
    };

    return (
        <section className="card-hard min-w-0 space-y-5 p-4 sm:p-6" aria-labelledby="interview-checklist-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="interview-checklist-heading" className="font-display text-2xl font-semibold text-ink">
                    Interview checklist
                </h2>
                <p className="font-mono text-xs text-ink-faint">{tickedCount} of {items.length} ticked</p>
            </div>
            {items.length === 0 ? (
                <p className="font-body text-sm text-ink-faint">Your interview checklist is not available yet.</p>
            ) : GROUPS.map((group) => {
                const groupItems = items.filter((item) => item.group === group.key);
                if (groupItems.length === 0) return null;

                return (
                    <div key={group.key} className="space-y-3">
                        <p className="section-label">{group.label}</p>
                        <ul className="space-y-3">
                            {groupItems.map((item) => {
                                const isPending = pendingKeys.includes(item.key);
                                return (
                                    <li key={item.key} className="min-w-0">
                                        <label className="flex cursor-pointer items-start gap-3 font-body text-sm leading-relaxed text-ink">
                                            <input
                                                type="checkbox"
                                                className="mt-1 h-4 w-4 shrink-0 accent-signal"
                                                checked={item.ticked}
                                                disabled={isPending}
                                                onChange={() => toggleItem(item)}
                                            />
                                            <span className={item.ticked ? 'text-ink-faint line-through' : ''}>
                                                {item.label}
                                                {isPending && <span className="ml-2 font-mono text-[10px] text-ink-faint">Saving…</span>}
                                            </span>
                                        </label>
                                        {errors[item.key] && (
                                            <p className="ml-7 mt-1 font-body text-xs text-signal" role="alert">
                                                {errors[item.key]}
                                            </p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}
