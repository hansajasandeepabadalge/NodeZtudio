'use client';

import { formatTime, type LightingSettings } from '@/features/rendering/dayNight';
import { GLASS, TEXT_COLOR, SETTINGS } from '@/common/settings';

interface Props {
    settings: LightingSettings;
    currentTime: number;
    onChange: (settings: LightingSettings) => void;
}

export default function LightingControls({ settings, currentTime, onChange }: Props) {
    const chooseTime = (time: number) => onChange({ ...settings, automatic: false, time });
    const buttonStyle = {
        background: 'rgba(255,255,255,0.08)', color: TEXT_COLOR,
        border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6,
        padding: '6px 8px', cursor: 'pointer', fontSize: 11,
    };

    return (
        <details aria-label="Scene lighting" style={{
            ...GLASS, position: 'absolute', right: 16, top: 16,
            width: 'min(240px, calc(100vw - 100px))', boxSizing: 'border-box',
            padding: 14, color: TEXT_COLOR, fontSize: 12,
        }}>
            <summary style={{ display: 'flex', justifyContent: 'space-between', gap: 12, cursor: 'pointer', listStyle: 'none' }}>
                <strong>Day & night</strong>
                <output aria-label="Current scene time" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(currentTime)}</output>
            </summary>
            <div style={{ marginTop: 14 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <input type="checkbox" checked={settings.automatic}
                    onChange={event => onChange({ ...settings, automatic: event.target.checked, time: currentTime })} />
                Automatic cycle
            </label>
            <label style={{ display: 'grid', gap: 7 }}>
                Time of day
                <input aria-label="Time of day" type="range" min={0} max={SETTINGS.lighting.hoursPerDay - 1 / SETTINGS.lighting.minutesPerHour} step={1 / SETTINGS.lighting.minutesPerHour}
                    value={currentTime} onChange={event => chooseTime(Number(event.target.value))}
                    style={{ width: '100%', accentColor: SETTINGS.ui.lightingAccent, margin: 0 }} />
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '10px 0 14px' }}>
                {SETTINGS.lighting.presets.map(({ label, time }) => (
                    <button key={label} type="button" style={buttonStyle} onClick={() => chooseTime(time)}>{label}</button>
                ))}
            </div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                Full cycle
                <select aria-label="Full cycle duration" value={settings.cycleSeconds}
                    onChange={event => onChange({ ...settings, cycleSeconds: Number(event.target.value) })}
                    style={{ ...buttonStyle, background: '#222831' }}>
                    {SETTINGS.lighting.cycleOptions.map(({ label, seconds }) => <option key={seconds} value={seconds}>{label}</option>)}
                </select>
            </label>
            <label style={{ display: 'grid', gap: 7 }}>
                <span>Brightness <span style={{ float: 'right', opacity: 0.65 }}>{Math.round(settings.brightness * 100)}%</span></span>
                <input aria-label="Lighting brightness" type="range" min={SETTINGS.lighting.minBrightness} max={SETTINGS.lighting.maxBrightness} step={SETTINGS.lighting.brightnessStep}
                    value={settings.brightness}
                    onChange={event => onChange({ ...settings, brightness: Number(event.target.value) })}
                    style={{ width: '100%', accentColor: SETTINGS.ui.lightingAccent, margin: 0 }} />
            </label>
            <p style={{ margin: '10px 0 0', fontSize: 10, opacity: 0.55 }}>Adjusting the time pauses the cycle.</p>
            </div>
        </details>
    );
}
