'use client';

import { useRef, useCallback, useState } from 'react';
import IsometricPlane from '@/features/rendering/IsometricPlane';
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
                <IsometricPlane onResetReady={handleResetReady} activeColor={activeColor} />
            </div>

            {/* Left Sidebar */}
            <Sidebar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                activeColor={activeColor}
                onColorChange={setActiveColor}
                onResetView={handleResetView}
            />

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
