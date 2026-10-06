import { SETTINGS } from '@/common/settings';
import type { LightingSettings } from '@/types/lighting';
export type { LightingSettings } from '@/types/lighting';
export { DEFAULT_LIGHTING } from '@/common/settings';

export function wrapTime(hours: number): number {
    const day = SETTINGS.lighting.hoursPerDay;
    return ((hours % day) + day) % day;
}

export function advanceTime(time: number, deltaSeconds: number, settings: LightingSettings): number {
    return wrapTime(time + (settings.automatic ? Math.max(0, deltaSeconds) * SETTINGS.lighting.hoursPerDay / Math.max(SETTINGS.lighting.minCycleSeconds, settings.cycleSeconds) : 0));
}

export function daylightAt(time: number): number {
    const { sunrise, hoursPerDay, daylightOffset, daylightBlend } = SETTINGS.lighting;
    const elevation = Math.sin((wrapTime(time) - sunrise) / hoursPerDay * Math.PI * 2);
    const blend = Math.max(0, Math.min(1, (elevation + daylightOffset) / daylightBlend));
    return blend * blend * (3 - 2 * blend);
}

export function formatTime(time: number): string {
    const hour = SETTINGS.lighting.minutesPerHour;
    const minutes = Math.floor(wrapTime(time) * hour);
    return `${String(Math.floor(minutes / hour)).padStart(2, '0')}:${String(minutes % hour).padStart(2, '0')}`;
}
