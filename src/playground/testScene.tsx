'use client';

import { ToolId, BlockId, SaveStatus } from '@/common/enums';

import { useEffect, useRef, useCallback, useState } from 'react';
import IsometricPlane from '@/features/rendering/IsometricPlane';
import type { IsometricPlaneHandle } from '@/features/rendering/IsometricPlane';
import Sidebar from '@/components/editor/Sidebar';
import { TOOLS } from '@/components/editor/editorTools';
import type { Tool } from '@/types/tools';
import { DEFAULT_COLOR, DEFAULT_GLOW_COLOR, DEFAULT_LIGHTING, AUTOSAVE_INTERVAL_MS, GLASS, TEXT_COLOR, SETTINGS } from '@/common/settings';
import LightingControls from '@/components/editor/LightingControls';
import { BLOCKS, type BlockType, type VoxelData } from '@/features/voxel/blocks';
import type { LightingSettings } from '@/features/rendering/dayNight';
import { readLocalSession, saveLocalSession, type LocalSession } from '@/features/voxel/localSession';
import styles from '@/components/editor/EditorWorkspace.module.css';

// ── Component ──────────────────────────────────────────────
export default function Playground() {
    const [activeTool, setActiveTool] = useState<Tool>(SETTINGS.editor.tool);
    const [placementRotation, setPlacementRotation] = useState(0);
    const [activeColor, setActiveColor] = useState<string>(DEFAULT_COLOR);
    const [activeBlock, setActiveBlock] = useState<BlockType>(SETTINGS.editor.block);
    const [glowColor, setGlowColor] = useState<string>(DEFAULT_GLOW_COLOR);
    const [lighting, setLighting] = useState(DEFAULT_LIGHTING);
    const [currentTime, setCurrentTime] = useState(DEFAULT_LIGHTING.time);
    const [history, setHistory] = useState({ canUndo: false, canRedo: false });
    const [showGrid, setShowGrid] = useState(SETTINGS.editor.showGrid);
    const resetFnRef = useRef<(() => void) | null>(null);
    const planeRef   = useRef<IsometricPlaneHandle>(null);
    const [localSaveStatus, setLocalSaveStatus] = useState<SaveStatus>(SaveStatus.Enabled);
    const sessionRef = useRef<Omit<LocalSession, 'voxels'>>({ activeTool, activeColor, activeBlock, glowColor, lighting, showGrid, placementRotation });

    useEffect(() => {
        sessionRef.current = { activeTool, activeColor, activeBlock, glowColor, lighting: { ...lighting, time: currentTime }, showGrid, placementRotation };
    }, [activeTool, activeColor, activeBlock, glowColor, lighting, currentTime, showGrid, placementRotation]);

    useEffect(() => {
        const save = () => {
            if (!planeRef.current?.isReady()) return;
            try {
                const saved = saveLocalSession(window.localStorage, { ...sessionRef.current, voxels: planeRef.current.exportScene() });
                setLocalSaveStatus(saved ? SaveStatus.Saved : SaveStatus.Unavailable);
            } catch {
                setLocalSaveStatus(SaveStatus.Unavailable);
            }
        };
        const onVisibilityChange = () => { if (document.hidden) save(); };
        const timer = window.setInterval(save, AUTOSAVE_INTERVAL_MS);
        window.addEventListener('pagehide', save);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('pagehide', save);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    const handleUndo = useCallback(() => planeRef.current?.undo(), []);
    const handleRedo = useCallback(() => planeRef.current?.redo(), []);

    const handleBlockSelect = useCallback((type: BlockType) => {
        setActiveBlock(type);
        if (type === BlockId.Glow) {
            setActiveColor(glowColor);
        } else if (type !== BlockId.Custom) {
            const block = BLOCKS.find(block => block.id === type);
            if (block) setActiveColor(block.color);
        }
        setActiveTool(current => current === ToolId.Paint || current === ToolId.Fill || current === ToolId.Box ? current : ToolId.Draw);
    }, [glowColor]);

    const handleColorChange = useCallback((color: string) => {
        setActiveColor(color);
        if (activeBlock === BlockId.Glow) setGlowColor(color);
        else setActiveBlock(BlockId.Custom);
    }, [activeBlock]);

    const handleGlowColorChange = useCallback((color: string) => {
        setGlowColor(color);
        setActiveColor(color);
        setActiveBlock(BlockId.Glow);
        setActiveTool(current => current === ToolId.Paint || current === ToolId.Fill || current === ToolId.Box ? current : ToolId.Draw);
    }, []);

    const handlePick = useCallback((voxel: VoxelData) => {
        setPlacementRotation(voxel.rotation ?? 0);
        setActiveBlock(voxel.blockType ?? BlockId.Custom);
        setActiveColor(voxel.color);
        if (voxel.blockType === BlockId.Glow) setGlowColor(voxel.color);
        setActiveTool(ToolId.Draw);
    }, []);
    const handleToggleGrid = useCallback(() => setShowGrid(value => !value), []);

    const handleLightingChange = useCallback((settings: LightingSettings) => {
        setLighting(settings);
        if (!settings.automatic) setCurrentTime(settings.time);
    }, []);

    const handleResetReady = useCallback((resetCallback: () => void) => {
        resetFnRef.current = resetCallback;
        try {
            const session = readLocalSession(window.localStorage);
            if (!session) return;
            planeRef.current?.importScene(session.voxels);
            setActiveTool(session.activeTool);
            setPlacementRotation(session.placementRotation ?? 0);
            setActiveBlock(session.activeBlock);
            setActiveColor(session.activeColor);
            setGlowColor(session.glowColor);
            setLighting(session.lighting);
            setCurrentTime(session.lighting.time);
            setShowGrid(session.showGrid ?? SETTINGS.editor.showGrid);
            setLocalSaveStatus(SaveStatus.Restored);
        } catch {
            setLocalSaveStatus(SaveStatus.Unavailable);
        }
    }, []);

    const handleResetView = useCallback(() => {
        resetFnRef.current?.();
    }, []);

    // ── Save ────────────────────────────────────────────────
    const handleSave = useCallback(() => {
        const data = planeRef.current?.exportScene() ?? [];
        if (data.length === 0) return;
        const json = JSON.stringify({ version: SETTINGS.storage.sceneVersion, voxels: data }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `scene-${Date.now()}${SETTINGS.storage.sceneExtension}`;
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // ── Load ────────────────────────────────────────────────
    const handleLoad = useCallback(() => {
        const input = document.createElement('input');
        input.type   = 'file';
        input.accept = `${SETTINGS.storage.sceneExtension},application/json`;
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target?.result as string);
                    const voxels = parsed?.voxels ?? parsed; // support plain arrays too
                    planeRef.current?.importScene(voxels);
                } catch {
                    alert('Failed to load file — make sure it is a valid .nzs scene.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }, []);

    // ── Clear ───────────────────────────────────────────────
    const handleClear = useCallback(() => {
        if (confirm('Clear all voxels?')) planeRef.current?.clearScene();
    }, []);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.isComposing || event.altKey || event.repeat) return;
            if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
            const key = event.key.toLowerCase();
            if (event.ctrlKey || event.metaKey) {
                if (key === SETTINGS.shortcuts.undo.toLowerCase()) { event.preventDefault(); if (event.shiftKey) handleRedo(); else handleUndo(); }
                else if (key === SETTINGS.shortcuts.redo.toLowerCase()) { event.preventDefault(); handleRedo(); }
                else if (key === SETTINGS.shortcuts.save.toLowerCase()) { event.preventDefault(); handleSave(); }
                return;
            }
            if (key === SETTINGS.shortcuts.rotatePlacement.toLowerCase()) {
                event.preventDefault();
                setPlacementRotation(value => (value + (event.shiftKey ? 3 : 1)) % 4);
                return;
            }
            if (event.shiftKey) return;
            const tool = TOOLS.find(item => item.key.toLowerCase() === key);
            if (tool) { event.preventDefault(); setActiveTool(tool.id); }
            else if (key === SETTINGS.shortcuts.grid.toLowerCase()) { event.preventDefault(); handleToggleGrid(); }
            else if (key === SETTINGS.shortcuts.reset.toLowerCase()) { event.preventDefault(); handleResetView(); }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [handleUndo, handleRedo, handleSave, handleToggleGrid, handleResetView]);

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100dvh', overflow: 'hidden', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

            {/* 3D Viewport */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <IsometricPlane
                    ref={planeRef}
                    onResetReady={handleResetReady}
                    activeColor={activeColor}
                    activeBlock={activeBlock}
                    activeTool={activeTool}
                    placementRotation={placementRotation}
                    lighting={lighting}
                    onTimeChange={setCurrentTime}
                    onHistoryChange={setHistory}
                    onPick={handlePick}
                    showGrid={showGrid}
                />
            </div>

            {/* Left Sidebar */}
            <Sidebar
                activeTool={activeTool}
                onToolChange={setActiveTool}
                activeColor={activeColor}
                onColorChange={handleColorChange}
                onResetView={handleResetView}
                activeBlock={activeBlock}
                glowColor={glowColor}
                onBlockSelect={handleBlockSelect}
                onGlowColorChange={handleGlowColorChange}
                canUndo={history.canUndo}
                canRedo={history.canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                showGrid={showGrid}
                onToggleGrid={handleToggleGrid}
                onSave={handleSave}
                onLoad={handleLoad}
                onClear={handleClear}
                saveStatus={localSaveStatus}
            />

            {/* Bottom Status Bar */}
            <LightingControls settings={lighting} currentTime={currentTime} onChange={handleLightingChange} />

            <div className={styles.statusBar} style={GLASS} role="group" aria-label="Editor status">
                <StatusItem label="Tool" value={TOOLS.find(tool => tool.id === activeTool)?.label ?? ''} />
                <StatusDot />
                <StatusItem label="Color" value={activeColor.toUpperCase()} />
                <StatusDot />
                <StatusItem label="Block" value={BLOCKS.find(block => block.id === activeBlock)?.label ?? ''} />
                <StatusDot /><StatusItem label="Next turn" value={`${placementRotation * 90}° · Q`} />
                <span className={styles.modeStatus}><StatusDot /><StatusItem label="Mode" value={activeTool === ToolId.Move ? 'Drag to move · Esc cancels' : activeTool === ToolId.Rotate ? 'Click to turn · Shift reverses' : activeTool === ToolId.Draw ? 'Q turns preview · Click places' : activeTool === ToolId.Box || activeTool === ToolId.BoxErase ? 'Click two corners · Esc cancels' : 'Isometric'} /></span>
            </div>
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────

function StatusDot() {
    return <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />;
}

function StatusItem({ label, value }: { label: string; value: string }) {
    return (
        <span style={{ color: TEXT_COLOR, fontSize: '11px' }}>
            <span style={{ opacity: 0.5, marginRight: '5px' }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </span>
    );
}
