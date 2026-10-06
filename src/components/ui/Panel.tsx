import React from 'react';
import { GLASS } from '@/common/settings';

interface PanelProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

// Generic glassmorphism panel — reuse for any floating UI surface.
export default function Panel({ children, style }: PanelProps) {
    return (
        <div style={{
            ...GLASS,
            ...style,
        }}>
            {children}
        </div>
    );
}
