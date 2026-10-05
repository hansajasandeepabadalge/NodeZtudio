import type { CSSProperties } from 'react';

export const GRID_SIZE     = 20;
export const FRUSTUM_SIZE  = 20;
export const LERP_SPEED    = 0.05;
export const DEFAULT_COLOR = '#95704b';

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
    '#ede5d3', '#c5bca7', '#92958c', '#5d625b',
    '#c69b64', '#95704b', '#705038', '#44372c',
    '#819b43', '#5f7d32', '#3d5b2c', '#b2b86a',
    '#ac5e43', '#d0a34f', '#71999b', '#383c39',
];
