import type { CSSProperties } from 'react';
import type { LightingSettings } from '@/types/lighting';
import { BlockId, ToolId, TextureId } from './enums';

/** Tune application defaults here. Keep runtime objects (cameras/materials) in the engine. */
export const SETTINGS = {
    app: { title: 'NodeZtudio', description: 'Isometric voxel editor' },
    grid: { size: 30, centerColor: 0x776c56, lineColor: 0x8e826b, lineOpacity: 0.22, axisOpacity: 0.45 },
    camera: {
        frustumSize: 20, zoom: 1,
        position: [20, 20, 20] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        near: -100, far: 1000, resetLerpSpeed: 0.05, zoomLerpMultiplier: 3,
        positionTolerance: 0.01, zoomTolerance: 0.001,
    },
    controls: { enableDamping: true, dampingFactor: 0.08, screenSpacePanning: true },
    renderer: { antialias: true, maxPixelRatio: 2, exposure: 1, shadowsEnabled: true },
    editor: { tool: ToolId.Select, block: BlockId.Custom, color: '#95704b', glowColor: '#ffad42', showGrid: true, historyLimit: 100 },
    shortcuts: {
        tools: { [ToolId.Select]: 'V', [ToolId.Draw]: 'B', [ToolId.Box]: 'X', [ToolId.Paint]: 'P', [ToolId.Erase]: 'E', [ToolId.Fill]: 'F', [ToolId.Pick]: 'I' },
        grid: 'G', reset: 'R', undo: 'Z', redo: 'Y', save: 'S',
    },
    lighting: {
        defaults: { automatic: false, time: 12, cycleSeconds: 240, brightness: 1 } satisfies LightingSettings,
        hoursPerDay: 24, sunrise: 6, minutesPerHour: 60,
        minCycleSeconds: 1, minBrightness: 0.25, maxBrightness: 2, brightnessStep: 0.05,
        maxFrameDelta: 0.1, timeReportIntervalMs: 250,
        daylightOffset: 0.12, daylightBlend: 0.5, twilightElevation: 0.5, sunsetBlend: 0.6,
        presets: [{ label: 'Dawn', time: 6 }, { label: 'Day', time: 12 }, { label: 'Dusk', time: 18 }, { label: 'Night', time: 0 }],
        cycleOptions: [{ label: '1 minute', seconds: 60 }, { label: '4 minutes', seconds: 240 }, { label: '10 minutes', seconds: 600 }, { label: '20 minutes', seconds: 1200 }],
        colors: {
            nightSky: '#101a30', daySky: '#bdb299', sunsetSky: '#b78169',
            nightFill: '#96abd0', dayFill: '#f2f6ff', groundFill: '#a9a298',
            nightBounce: '#8396ba', dayBounce: '#eef3ff', warmSun: '#ffad66', noonSun: '#fff8ec', moon: '#9ebaff',
        },
        intensity: { skyNight: 0.45, skyDayGain: 0.95, fillNight: 0.18, fillDayGain: 0.47, sun: 2.2, moon: 0.45 },
        orbit: { radiusX: 28, offsetX: 12, radiusZ: 18, sunHeight: 30, moonHeight: 25, minHeight: 3 },
        fillPosition: [-24, 18, 24] as [number, number, number],
        ground: { size: 2000, y: -0.02 },
    },
    shadows: {
        mapSize: 2048, bias: -0.00015, normalBias: 0.025, radius: 2,
        camera: { left: -24, right: 24, top: 32, bottom: -24, near: 0.5, far: 100 },
    },
    blocks: {
        maxLights: 16, lightDecay: 2,
        emission: { intensity: 3, range: 4, emissiveIntensity: 1.6 },
        colors: { grass: '#648b38', dirt: '#896344', stone: '#92958c', sand: '#d8c58d', log: '#705038', planks: '#b38b55', leaves: '#6b9f43' },
        textures: {
            [TextureId.GrassTop]: '/textures/grass_block_top.png',
            [TextureId.GrassSide]: '/textures/grass_block_side.png',
            [TextureId.Dirt]: '/textures/dirt.png',
            [TextureId.Stone]: '/textures/stone.png',
            [TextureId.Sand]: '/textures/sand.png',
            [TextureId.LogSide]: '/textures/log_oak.png',
            [TextureId.LogTop]: '/textures/log_oak_top.png',
            [TextureId.Planks]: '/textures/planks_oak.png',
            [TextureId.Leaves]: '/textures/leaves_oak.png',
        },
        roughness: 1, metalness: 0, leavesAlphaTest: 0.5,
    },
    hover: { opacity: 0.5, edgeColor: 0xffffff, edgeOpacity: 0.85, eraseColor: 0xff2222, eraseOpacity: 0.45, eraseEdgeColor: 0xff4444, eraseEdgeOpacity: 0.95 },
    postProcessing: { maxSamples: 4, bloomStrength: 0.2, bloomRadius: 0.18, bloomThreshold: 1.5 },
    storage: { key: 'nodeztudio.session.v1', version: 1, autosaveIntervalMs: 15_000, sceneVersion: 2, sceneExtension: '.nzs' },
    ui: { textColor: '#e8ecf0', accentColor: '#00b4ff', lightingAccent: '#d0a34f', loaderBackground: 'rgba(10,14,20,0.9)' },
};

// Named exports make frequently used defaults easy to import.
export const GRID_SIZE = SETTINGS.grid.size;
export const FRUSTUM_SIZE = SETTINGS.camera.frustumSize;
export const LERP_SPEED = SETTINGS.camera.resetLerpSpeed;
export const DEFAULT_COLOR = SETTINGS.editor.color;
export const DEFAULT_GLOW_COLOR = SETTINGS.editor.glowColor;
export const DEFAULT_LIGHTING: LightingSettings = { ...SETTINGS.lighting.defaults };
export const TEXT_COLOR = SETTINGS.ui.textColor;
export const ACCENT = SETTINGS.ui.accentColor;
export const AUTOSAVE_INTERVAL_MS = SETTINGS.storage.autosaveIntervalMs;
export const LOCAL_SESSION_KEY = SETTINGS.storage.key;

export const GLASS: CSSProperties = {
    background: 'rgba(10, 14, 20, 0.72)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
};

export const PALETTE = [
    '#ede5d3', '#c5bca7', '#92958c', '#5d625b',
    '#c69b64', DEFAULT_COLOR, '#705038', '#44372c',
    '#819b43', '#5f7d32', '#3d5b2c', '#b2b86a',
    '#ac5e43', '#d0a34f', '#71999b', '#383c39',
];
