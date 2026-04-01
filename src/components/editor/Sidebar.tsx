'use client';

import ColorPickerButton from '@/components/editor/ColorPicker';
import { GLASS, TEXT_COLOR, ACCENT } from '@/utils/constants';
import type { Tool, ToolDef } from '@/types/tools';

// ── Icons ──────────────────────────────────────────────────
const CursorIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l7 18 3-7 7-3z" />
    </svg>
);
const PencilIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
);
const EraserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 20H7L3 16l9.5-9.5 7.5 7.5-2.5 2.5" /><path d="M6.5 17.5l4-4" />
    </svg>
);
const FillIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 11a7.5 7.5 0 0 1-1.9 4.9L12 21l-5.1-5.1A7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 7 6.5z" /><line x1="12" y1="2" x2="12" y2="4" />
    </svg>
);
const IsoIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);

export const TOOLS: ToolDef[] = [
    { id: 'select', label: 'Select', key: 'V', icon: <CursorIcon /> },
    { id: 'draw', label: 'Draw', key: 'B', icon: <PencilIcon /> },
    { id: 'erase', label: 'Erase', key: 'E', icon: <EraserIcon /> },
    // { id: 'fill', label: 'Fill', key: 'F', icon: <FillIcon /> },
];

// ── Sidebar Props ──────────────────────────────────────────
interface SidebarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    onResetView: () => void;
}

// ── Sidebar Component ──────────────────────────────────────
export default function Sidebar({
    activeTool,
    onToolChange,
    activeColor,
    onColorChange,
    onResetView,
}: SidebarProps) {
    return (
        <div style={{
            position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            padding: '10px',
            ...GLASS,
        }}>
            {TOOLS.map(tool => (
                <SidebarBtn
                    key={tool.id}
                    active={activeTool === tool.id}
                    onClick={() => onToolChange(tool.id)}
                    title={`${tool.label} (${tool.key})`}
                >
                    {tool.icon}
                </SidebarBtn>
            ))}

            <SidebarDivider />

            <ColorPickerButton activeColor={activeColor} onColorChange={onColorChange} />

            <SidebarDivider />

            <SidebarBtn onClick={onResetView} title="Reset to isometric view">
                <IsoIcon />
            </SidebarBtn>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────

function SidebarDivider() {
    return <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />;
}

function SidebarBtn({ children, active, onClick, title }: {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    title?: string;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: '38px', height: '38px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(0,180,255,0.22)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(0,180,255,0.55)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: active ? ACCENT : TEXT_COLOR,
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: 'none',
            }}
            onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
            }}
            onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            }}
        >
            {children}
        </button>
    );
}

// Re-export types for consumers that import from this module
export type { Tool, ToolDef };
