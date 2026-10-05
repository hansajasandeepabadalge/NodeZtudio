export interface LightingSettings {
    automatic: boolean;
    time: number;
    cycleSeconds: number;
    brightness: number;
}

export const DEFAULT_LIGHTING: LightingSettings = {
    automatic: true,
    time: 12,
    cycleSeconds: 240,
    brightness: 1,
};

export function wrapTime(hours: number): number {
    return ((hours % 24) + 24) % 24;
}

export function advanceTime(time: number, deltaSeconds: number, settings: LightingSettings): number {
    return wrapTime(time + (settings.automatic ? Math.max(0, deltaSeconds) * 24 / Math.max(1, settings.cycleSeconds) : 0));
}

export function daylightAt(time: number): number {
    const elevation = Math.sin((wrapTime(time) - 6) / 24 * Math.PI * 2);
    const blend = Math.max(0, Math.min(1, (elevation + 0.12) / 0.5));
    return blend * blend * (3 - 2 * blend);
}

export function formatTime(time: number): string {
    const minutes = Math.floor(wrapTime(time) * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
