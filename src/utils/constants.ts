import type { CSSProperties } from 'react';

export const GRID_SIZE     = 20;
export const FRUSTUM_SIZE  = 20;
export const LERP_SPEED    = 0.05;
export const DEFAULT_COLOR = '#3498db';

// ── UI Color tokens ────────────────────────────────────────
export const TEXT_COLOR = '#e8ecf0';
export const ACCENT     = '#00b4ff';

// ── Glassmorphism panel style ──────────────────────────────
export const GLASS: CSSProperties = {
    background: 'rgba(10, 14, 20, 0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};

// ── Color palette ──────────────────────────────────────────
export const PALETTE = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
    '#ffffff', '#bdc3c7', '#7f8c8d', '#2c3e50',
    '#795548', '#ff7043', '#26c6da', '#66bb6a',
];
