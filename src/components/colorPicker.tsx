'use client';

import { useState, useRef } from 'react';

// ── Palette colors ─────────────────────────────────────────
export const PALETTE = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
    '#ffffff', '#bdc3c7', '#7f8c8d', '#2c3e50',
    '#795548', '#ff7043', '#26c6da', '#66bb6a',
];

const TEXT_COLOR = '#e8ecf0';

// ── Props ──────────────────────────────────────────────────
interface ColorPickerButtonProps {
    activeColor: string;
    onColorChange: (color: string) => void;
}

// ── Component ──────────────────────────────────────────────
export default function ColorPickerButton({
    activeColor,
    onColorChange,
}: ColorPickerButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = () => {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimer.current = setTimeout(() => setIsOpen(false), 150);
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Trigger button: paint icon + current color swatch */}
            <div
                title="Color picker"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
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
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
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
