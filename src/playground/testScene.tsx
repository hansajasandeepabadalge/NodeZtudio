'use client';

import { useRef, useCallback, useState } from 'react';
import IsometricPlane from '@/features/rendering/IsometricPlane';
import type { IsometricPlaneHandle } from '@/features/rendering/IsometricPlane';
import Sidebar, { TOOLS, type Tool } from '@/components/editor/Sidebar';

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

// ── Component ──────────────────────────────────────────────
export default function Playground() {
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [activeColor, setActiveColor] = useState<string>('#795548');
    const resetFnRef = useRef<(() => void) | null>(null);
    const planeRef   = useRef<IsometricPlaneHandle>(null);

    const handleResetReady = useCallback((resetCallback: () => void) => {
        resetFnRef.current = resetCallback;
    }, []);

    const handleResetView = useCallback(() => {
        resetFnRef.current?.();
    }, []);

    // ── Save ────────────────────────────────────────────────
    const handleSave = useCallback(() => {
        const data = planeRef.current?.exportScene() ?? [];
        if (data.length === 0) return;
        const json = JSON.stringify({ version: 1, voxels: data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `scene-${Date.now()}.nzs`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // ── Load ────────────────────────────────────────────────
    const handleLoad = useCallback(() => {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = '.nzs,application/json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target?.result as string);
                    const voxels = parsed?.voxels ?? parsed; // support plain arrays too
                    planeRef.current?.importScene(voxels);
                } catch {
                    alert('Failed to load file — make sure it is a valid .nzs scene.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);

    // ── Clear ───────────────────────────────────────────────
    const handleClear = useCallback(() => {
        if (confirm('Clear all voxels?')) planeRef.current?.clearScene();
    }, []);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>

            {/* 3D Viewport */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <IsometricPlane
                    ref={planeRef}
                    onResetReady={handleResetReady}
                    activeColor={activeColor}
                    activeTool={activeTool}
                />
            </div>

            {/* Left Sidebar */}
            <Sidebar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                activeColor={activeColor}
                onColorChange={setActiveColor}
                onResetView={handleResetView}
            />

            {/* Top-right — Save / Load / Clear */}
            <div style={{
                position: 'absolute', top: '16px', right: '16px',
                display: 'flex', gap: '8px',
            }}>
                <SceneBtn id="btn-save" onClick={handleSave} color="#00b4ff" title="Save scene to .nzs file">
                    <SaveIcon /> Save
                </SceneBtn>
                <SceneBtn id="btn-load" onClick={handleLoad} color="#a78bfa" title="Load .nzs scene file">
                    <LoadIcon /> Load
                </SceneBtn>
                <SceneBtn id="btn-clear" onClick={handleClear} color="#ff5555" title="Clear all voxels">
                    <TrashIcon /> Clear
                </SceneBtn>
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

function SceneBtn({ children, onClick, color, title, id }: {
    children: React.ReactNode;
    onClick: () => void;
    color: string;
    title: string;
    id: string;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            id={id}
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px',
                background: hovered ? `${color}18` : 'rgba(10, 14, 20, 0.65)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: `1px solid ${hovered ? color + 'bb' : color + '33'}`,
                borderRadius: '10px',
                color: hovered ? '#ffffff' : color,
                fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s, transform 0.15s',
                boxShadow: hovered
                    ? `0 0 12px ${color}55, 0 4px 20px rgba(0,0,0,0.4)`
                    : '0 2px 10px rgba(0,0,0,0.3)',
                transform: hovered ? 'translateY(-1px) scale(1.04)' : 'translateY(0) scale(1)',
            }}
        >
            {children}
        </button>
    );
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

// ── Icons ──────────────────────────────────────────────────
const SaveIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
);
const LoadIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
);
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
);
