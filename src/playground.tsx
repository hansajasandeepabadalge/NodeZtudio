'use client';

import { useRef, useCallback, useState } from 'react';
import IsometricPlane from '@/components/plane';

// ── Types ──────────────────────────────────────────────────
type Tool = 'select' | 'draw' | 'erase' | 'fill';

interface ToolDef {
    id: Tool;
    label: string;
    key: string;
    icon: React.ReactNode;
}

// ── Palette colors ─────────────────────────────────────────
const PALETTE = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
    '#ffffff', '#bdc3c7', '#7f8c8d', '#2c3e50',
    '#795548', '#ff7043', '#26c6da', '#66bb6a',
];

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

const TOOLS: ToolDef[] = [
    { id: 'select', label: 'Select', key: 'V', icon: <CursorIcon /> },
    { id: 'draw', label: 'Draw', key: 'B', icon: <PencilIcon /> },
    { id: 'erase', label: 'Erase', key: 'E', icon: <EraserIcon /> },
    { id: 'fill', label: 'Fill', key: 'F', icon: <FillIcon /> },
];

// ── Style tokens ───────────────────────────────────────────
const GLASS: React.CSSProperties = {
    background: 'rgba(10, 14, 20, 0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};
const TEXT_COLOR = '#e8ecf0';
const ACCENT = '#00b4ff';

// ── Component ──────────────────────────────────────────────
export default function Playground() {
    const [activeTool, setActiveTool] = useState<Tool>('draw');
    const [activeColor, setActiveColor] = useState<string>('#3498db');
    const resetFnRef = useRef<(() => void) | null>(null);

    const handleResetReady = useCallback((resetCallback: () => void) => {
        resetFnRef.current = resetCallback;
    }, []);

    const handleResetView = useCallback(() => {
        resetFnRef.current?.();
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* 3D Viewport */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <IsometricPlane onResetReady={handleResetReady} />
            </div>

            {/* Left Sidebar */}
            <div style={{
                position: 'absolute', left: '16px', top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '10px',
                ...GLASS,
            }}>
                {/* Tool buttons */}
                {TOOLS.map(tool => (
                    <SidebarBtn
                        key={tool.id}
                        active={activeTool === tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        title={`${tool.label} (${tool.key})`}
                    >
                        {tool.icon}
                    </SidebarBtn>
                ))}

                <SidebarDivider />

                {/* Compact color picker — hover to reveal flyout */}
                <ColorPickerButton
                    activeColor={activeColor}
                    onColorChange={setActiveColor}
                />

                <SidebarDivider />

                {/* Isometric reset button */}
                <SidebarBtn onClick={handleResetView} title="Reset to isometric view">
                    <IsoIcon />
                </SidebarBtn>
            </div>

            {/* Bottom Status Bar */}
            <div style={{
                position: 'absolute', bottom: '16px', left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '7px 18px',
                ...GLASS,
                borderRadius: '10px',
            }}>
                <StatusItem label="Tool" value={TOOLS.find(tool => tool.id === activeTool)?.label ?? ''} />
                <StatusDot />
                <StatusItem label="Color" value={activeColor.toUpperCase()} />
                <StatusDot />
                <StatusItem label="Mode" value="Isometric" />
            </div>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────

function SidebarDivider() {
    return <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '2px 0' }} />;
}

function StatusDot() {
    return <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />;
}

function StatusItem({ label, value }: { label: string; value: string }) {
    return (
        <span style={{ color: TEXT_COLOR, fontSize: '11px' }}>
            <span style={{ opacity: 0.5, marginRight: '5px' }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </span>
    );
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
            onMouseEnter={event => {
                if (!active) (event.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
            }}
            onMouseLeave={event => {
                if (!active) (event.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            }}
        >
            {children}
        </button>
    );
}

// Compact color button + hover flyout palette
function ColorPickerButton({
    activeColor,
    onColorChange,
}: {
    activeColor: string;
    onColorChange: (color: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            {/* Trigger button: paint icon + current color swatch */}
            <div
                title="Color picker"
                style={{
                    width: '38px', height: '38px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '3px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    color: TEXT_COLOR,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
            >
                {/* Paint bucket icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 11a7.5 7.5 0 0 1-1.9 4.9L12 21l-5.1-5.1A7.5 7.5 0 0 1 12 4.5a7.5 7.5 0 0 1 7 6.5z" />
                    <line x1="12" y1="2" x2="12" y2="4.5" />
                </svg>
                {/* Active color dot */}
                <div style={{
                    width: '14px', height: '5px',
                    borderRadius: '3px',
                    background: activeColor,
                    border: '1px solid rgba(255,255,255,0.25)',
                }} />
            </div>

            {/* Flyout palette panel */}
            <div style={{
                position: 'absolute',
                left: 'calc(100% + 10px)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(10, 14, 20, 0.90)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'all' : 'none',
                transition: 'opacity 0.18s ease',
                zIndex: 10,
                minWidth: '116px',
            }}>
                {/* Palette grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                    {PALETTE.map(color => (
                        <button
                            key={color}
                            onClick={() => onColorChange(color)}
                            title={color}
                            style={{
                                width: '20px', height: '20px',
                                borderRadius: '5px',
                                background: color,
                                border: activeColor === color
                                    ? `2px solid ${TEXT_COLOR}`
                                    : '2px solid transparent',
                                cursor: 'pointer',
                                padding: 0,
                                outline: 'none',
                                transition: 'transform 0.1s',
                                transform: activeColor === color ? 'scale(1.18)' : 'scale(1)',
                            }}
                        />
                    ))}
                </div>

                {/* Hex label */}
                <span style={{
                    color: TEXT_COLOR, fontSize: '10px',
                    fontFamily: 'monospace', opacity: 0.6,
                    textAlign: 'center', letterSpacing: '0.05em',
                }}>
                    {activeColor.toUpperCase()}
                </span>

                {/* Custom color input */}
                <input
                    type="color"
                    value={activeColor}
                    onChange={event => onColorChange(event.target.value)}
                    title="Custom color"
                    style={{
                        width: '100%', height: '26px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: '1px',
                    }}
                />
            </div>
        </div>
    );
}
