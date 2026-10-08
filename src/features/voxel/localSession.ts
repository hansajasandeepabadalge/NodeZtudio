import { isBlockType, parseVoxels, type BlockType, type VoxelData } from './blocks';
import type { LightingSettings } from '../rendering/dayNight';
import { isTool, type Tool } from '@/types/tools';

import { LOCAL_SESSION_KEY, SETTINGS } from '@/common/settings';
export { LOCAL_SESSION_KEY, AUTOSAVE_INTERVAL_MS } from '@/common/settings';

export interface LocalSession {
    voxels: VoxelData[];
    activeTool: Tool;
    activeBlock: BlockType;
    activeColor: string;
    glowColor: string;
    lighting: LightingSettings;
    showGrid?: boolean;
    placementRotation?: number;
}

const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Validate the entire snapshot before restoring any part of the editor. */
export function readLocalSession(storage: Pick<Storage, 'getItem'>): LocalSession | undefined {
    try {
        const raw = storage.getItem(LOCAL_SESSION_KEY);
        if (!raw) return undefined;
        const data = JSON.parse(raw);
        if (!data || data.version !== SETTINGS.storage.version || !isBlockType(data.activeBlock) ||
            !isTool(data.activeTool) ||
            (data.showGrid !== undefined && typeof data.showGrid !== 'boolean') ||
            (data.placementRotation !== undefined && (!Number.isInteger(data.placementRotation) || data.placementRotation < 0 || data.placementRotation > 3)) ||
            !isColor(data.activeColor) || !isColor(data.glowColor)) return undefined;
        const lighting = data.lighting;
        if (!lighting || typeof lighting.automatic !== 'boolean' ||
            !isFiniteNumber(lighting.time) || lighting.time < 0 || lighting.time >= SETTINGS.lighting.hoursPerDay ||
            !isFiniteNumber(lighting.cycleSeconds) || lighting.cycleSeconds < SETTINGS.lighting.minCycleSeconds ||
            !isFiniteNumber(lighting.brightness) || lighting.brightness < SETTINGS.lighting.minBrightness || lighting.brightness > SETTINGS.lighting.maxBrightness) return undefined;
        return {
            voxels: parseVoxels(data.voxels), activeTool: data.activeTool, activeBlock: data.activeBlock,
            activeColor: data.activeColor, glowColor: data.glowColor,
            lighting: { automatic: lighting.automatic, time: lighting.time, cycleSeconds: lighting.cycleSeconds, brightness: lighting.brightness },
            ...(data.showGrid !== undefined ? { showGrid: data.showGrid } : {}),
            ...(data.placementRotation !== undefined ? { placementRotation: data.placementRotation } : {}),
        };
    } catch {
        return undefined;
    }
}

export function saveLocalSession(storage: Pick<Storage, 'setItem'>, session: LocalSession): boolean {
    try {
        storage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ ...session, version: SETTINGS.storage.version, savedAt: Date.now() }));
        return true;
    } catch {
        return false;
    }
}
