import React from 'react';

interface PanelProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

// Generic glassmorphism panel — reuse for any floating UI surface.
export default function Panel({ children, style }: PanelProps) {
    return (
        <div style={{
            background: 'rgba(10, 14, 20, 0.72)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            ...style,
        }}>
            {children}
        </div>
    );
}
