'use client';

import { useId, useRef, useState, type Ref } from 'react';
import ColorPickerButton from '@/components/editor/ColorPicker';
import BlockPicker from '@/components/editor/BlockPicker';
import type { BlockType } from '@/features/voxel/blocks';
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
const BlocksIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 5 3v6l-5 3-5-3V5zM7 5l5 3 5-3M12 8v6M7 11l-5 3v6l5 3 5-3v-6M2 14l5 3 5-3M7 17v6M17 11l5 3v6l-5 3-5-3M12 14l5 3 5-3M17 17v6" />
    </svg>
);
const IsoIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);
const HistoryIcon = ({ redo = false }: { redo?: boolean }) => (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: redo ? 'scaleX(-1)' : undefined }}>
        <path d="M9 4 4 9l5 5M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
);

export const TOOLS: ToolDef[] = [
    { id: 'select', label: 'Select', key: 'V', icon: <CursorIcon /> },
    { id: 'draw', label: 'Draw', key: 'B', icon: <PencilIcon /> },
    { id: 'erase', label: 'Erase', key: 'E', icon: <EraserIcon /> },
];

// ── Sidebar Props ──────────────────────────────────────────
interface SidebarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    onResetView: () => void;
    activeBlock: BlockType;
    glowColor: string;
    onBlockSelect: (block: BlockType) => void;
    onGlowColorChange: (color: string) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

// ── Sidebar Component ──────────────────────────────────────
export default function Sidebar({
    activeTool,
    onToolChange,
    activeColor,
    onColorChange,
    onResetView,
    activeBlock,
    glowColor,
    onBlockSelect,
    onGlowColorChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: SidebarProps) {
    const [blocksOpen, setBlocksOpen] = useState(false);
    const blocksPanelId = useId();
    const blocksButtonRef = useRef<HTMLButtonElement>(null);
    const closeBlocks = () => {
        setBlocksOpen(false);
        blocksButtonRef.current?.focus();
    };

    return (
        <aside aria-label="Editor sidebar" onKeyDown={event => {
            if (event.key === 'Escape' && blocksOpen) {
                event.stopPropagation();
                closeBlocks();
            }
        }} style={{
            position: 'absolute', left: '16px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: '10px', zIndex: 5,
        }}>
        <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            padding: '10px',
            ...GLASS,
        }}>
            <SidebarBtn onClick={onUndo} disabled={!canUndo} label="Undo" title="Undo (Ctrl/⌘+Z)">
                <HistoryIcon />
            </SidebarBtn>
            <SidebarBtn onClick={onRedo} disabled={!canRedo} label="Redo" title="Redo (Ctrl/⌘+Shift+Z or Ctrl+Y)">
                <HistoryIcon redo />
            </SidebarBtn>

            <SidebarDivider />

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

            <SidebarBtn active={blocksOpen} onClick={() => setBlocksOpen(open => !open)}
                title="Building blocks" expanded={blocksOpen} controls={blocksPanelId} buttonRef={blocksButtonRef}>
                <BlocksIcon />
            </SidebarBtn>

            <ColorPickerButton activeColor={activeColor} onColorChange={onColorChange} />

            <SidebarDivider />

            <SidebarBtn onClick={onResetView} title="Reset to isometric view">
                <IsoIcon />
            </SidebarBtn>
        </div>
        {blocksOpen && <BlockPicker id={blocksPanelId} activeBlock={activeBlock} activeColor={activeColor}
            glowColor={glowColor} onSelect={onBlockSelect} onGlowColorChange={onGlowColorChange} onClose={closeBlocks} />}
        </aside>
    );
}

// ── Sub-components ─────────────────────────────────────────

function SidebarDivider() {
    return <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />;
}

function SidebarBtn({ children, active, onClick, title, expanded, controls, buttonRef, disabled = false, label }: {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    title?: string;
    expanded?: boolean;
    controls?: string;
    buttonRef?: Ref<HTMLButtonElement>;
    disabled?: boolean;
    label?: string;
}) {
    return (
        <button
            type="button"
            ref={buttonRef}
            onClick={onClick}
            title={title}
            disabled={disabled}
            aria-label={label ?? title}
            aria-expanded={expanded}
            aria-controls={controls}
            style={{
                width: '38px', height: '38px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(0,180,255,0.22)' : 'rgba(255,255,255,0.04)',
                border: active ? '1px solid rgba(0,180,255,0.55)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: active ? ACCENT : TEXT_COLOR,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.35 : 1,
                transition: 'all 0.15s',
                outlineOffset: '3px',
            }}
            onMouseEnter={e => {
                if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
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
