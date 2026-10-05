'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createScene, createRenderer, createCamera, DEFAULT_POS, DEFAULT_TARGET, DEFAULT_ZOOM, FRUSTUM_SIZE } from '@/engine/core/initScene';
import { createOrbitControls } from '@/engine/controls/orbitControls';
import { createGridHelper, createAxisLines } from '@/engine/helpers/gridHelper';
import { addSceneLighting } from '@/engine/core/lighting';
import {createVoxelEngine, HistoryState} from '@/features/rendering/voxelEngine';
import type { VoxelData } from '@/features/rendering/voxelEngine';
import type { Tool } from '@/types/tools';
import { DEFAULT_COLOR } from '@/utils/constants';
import type { BlockType } from '@/features/voxel/blocks';
import { advanceTime, DEFAULT_LIGHTING, type LightingSettings } from './dayNight';
import { createPostProcessing } from './postProcessing';

const LERP_SPEED = 0.05;
const GRID_SIZE  = 30;

export interface IsometricPlaneHandle {
    exportScene(): VoxelData[];
    importScene(data: VoxelData[]): void;
    clearScene(): void;
    undo(): void;
    redo(): void;
}

interface IsometricPlaneProps {
    onResetReady?: (reset: () => void) => void;
    activeColor?: string;
    activeTool?: Tool;
    activeBlock?: BlockType;
    lighting?: LightingSettings;
    onTimeChange?: (time: number) => void;
    onHistoryChange?: (state: HistoryState) => void;
}

const IsometricPlane = forwardRef<IsometricPlaneHandle, IsometricPlaneProps>(function IsometricPlane({
    onResetReady,
    activeColor = DEFAULT_COLOR,
    activeTool  = 'select',
    activeBlock = 'custom',
    lighting = DEFAULT_LIGHTING,
    onTimeChange,
    onHistoryChange,
}, ref) {
    const mountRef     = useRef<HTMLDivElement>(null);
    const engineRef    = useRef<ReturnType<typeof createVoxelEngine> | null>(null);
    const controlsRef  = useRef<OrbitControls | null>(null);
    const toolRef      = useRef(activeTool);
    const lightingRef = useRef(lighting);
    const timeRef = useRef(lighting.time);
    const onTimeChangeRef = useRef(onTimeChange);

    const onHistoryChangeRef = useRef(onHistoryChange);

    useEffect(() => {
        onHistoryChangeRef.current = onHistoryChange;
    }, [onHistoryChange]);

    useEffect(() => {
        lightingRef.current = lighting;
        onTimeChangeRef.current = onTimeChange;
    }, [lighting, onTimeChange]);

    useEffect(() => {
        timeRef.current = lighting.time;
    }, [lighting.time, lighting.automatic]);

    // ── Expose save/load API to parent ─────────────────────
    useImperativeHandle(ref, () => ({
        exportScene: () => engineRef.current?.exportScene() ?? [],
        importScene: (data) => engineRef.current?.importScene(data),
        clearScene:  () => engineRef.current?.clearScene(),
        undo: () => engineRef.current?.undo(),
        redo: () => engineRef.current?.redo(),
    }));

    // ── Sync active color ──────────────────────────────────
    useEffect(() => {
        engineRef.current?.setColor(activeColor);
    }, [activeColor]);

    useEffect(() => {
        engineRef.current?.setBlockType(activeBlock);
    }, [activeBlock]);

    // ── Sync active tool ───────────────────────────────────
    useEffect(() => {
        toolRef.current = activeTool;
        if (controlsRef.current) {
            controlsRef.current.enabled = true; // Always allow pan/zoom
            if (activeTool === 'select') {
                controlsRef.current.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
                controlsRef.current.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
                controlsRef.current.mouseButtons.RIGHT = THREE.MOUSE.PAN;
                controlsRef.current.touches.ONE = THREE.TOUCH.ROTATE;
            } else {
                controlsRef.current.mouseButtons.LEFT = null as any;
                controlsRef.current.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE; // Middle-click rotates
                controlsRef.current.mouseButtons.RIGHT = null as any; // Right-click unmapped (used for deleting)
                controlsRef.current.touches.ONE = null as any;
            }
        }
        engineRef.current?.setMode(activeTool);
    }, [activeTool]);

    // ── Scene setup (runs once) ────────────────────────────
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene    = createScene();
        const renderer = createRenderer(mount);
        const camera   = createCamera(mount);
        const postProcessing = createPostProcessing(renderer, scene, camera);
        mount.appendChild(renderer.domElement);

        const controls = createOrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;

        const sceneLighting = addSceneLighting(scene);
        scene.add(createGridHelper(GRID_SIZE));
        scene.add(createAxisLines(GRID_SIZE));

        engineRef.current = createVoxelEngine(scene, camera, renderer.domElement, activeColor, activeBlock,
            state => onHistoryChangeRef.current?.(state));
        engineRef.current.setMode(toolRef.current);

        // ── Reset animation ────────────────────────────────
        let isResetting = false;
        const triggerReset = () => {
            isResetting = true;
            controls.enabled = false;
        };
        onResetReady?.(triggerReset);

        // ── Render loop ────────────────────────────────────
        let animFrameId: number;
        let previousTime = performance.now();
        let lastTimeReport = 0;
        const animate = () => {
            animFrameId = requestAnimationFrame(animate);
            const now = performance.now();
            // Pause while the tab is hidden; avoid jumping ahead when it returns.
            const delta = document.hidden ? 0 : Math.min((now - previousTime) / 1000, 0.1);
            previousTime = now;
            timeRef.current = advanceTime(timeRef.current, delta, lightingRef.current);
            sceneLighting.update(timeRef.current, lightingRef.current.brightness);
            if (now - lastTimeReport >= 250) {
                onTimeChangeRef.current?.(timeRef.current);
                lastTimeReport = now;
            }

            if (isResetting) {
                camera.position.lerp(DEFAULT_POS, LERP_SPEED);
                controls.target.lerp(DEFAULT_TARGET, LERP_SPEED);
                camera.zoom += (DEFAULT_ZOOM - camera.zoom) * LERP_SPEED * 3;
                camera.updateProjectionMatrix();
                if (
                    camera.position.distanceTo(DEFAULT_POS)    < 0.01 &&
                    controls.target.distanceTo(DEFAULT_TARGET) < 0.01 &&
                    Math.abs(camera.zoom - DEFAULT_ZOOM)       < 0.001
                ) {
                    camera.position.copy(DEFAULT_POS);
                    controls.target.copy(DEFAULT_TARGET);
                    camera.zoom = DEFAULT_ZOOM;
                    camera.updateProjectionMatrix();
                    isResetting      = false;
                    controls.enabled = true;
                }
            }

            controls.update();
            engineRef.current?.updateLighting();
            postProcessing.render();
        };
        animate();

        // ── Resize handler ─────────────────────────────────
        const handleResize = () => {
            if (!mount) return;
            const { clientWidth: w, clientHeight: h } = mount;
            const aspect = w / h;
            camera.left  = -FRUSTUM_SIZE * aspect;
            camera.right =  FRUSTUM_SIZE * aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            postProcessing.resize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // ── Cleanup ────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animFrameId);
            window.removeEventListener('resize', handleResize);
            engineRef.current?.dispose();
            engineRef.current = null;
            controlsRef.current = null;
            controls.dispose();
            sceneLighting.dispose();
            postProcessing.dispose();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});

export default IsometricPlane;
