'use client';

import { useEffect, useRef } from 'react';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createScene, createRenderer, createCamera, DEFAULT_POS, DEFAULT_TARGET, FRUSTUM_SIZE } from '@/engine/core/initScene';
import { createOrbitControls } from '@/engine/controls/orbitControls';
import { createGridHelper, createAxisLines } from '@/engine/helpers/gridHelper';
import { createHoverHighlight } from '@/features/rendering/hoverHighlight';
import { createVoxelPlacer } from '@/features/rendering/voxelPlacer';
import type { Tool } from '@/types/tools';

const LERP_SPEED = 0.05;
const GRID_SIZE  = 20;

interface IsometricPlaneProps {
    onResetReady?: (reset: () => void) => void;
    activeColor?: string;
    activeTool?: Tool;
}

export default function IsometricPlane({
    onResetReady,
    activeColor = '#00b4ff',
    activeTool  = 'select',
}: IsometricPlaneProps) {
    const mountRef     = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<ReturnType<typeof createHoverHighlight> | null>(null);
    const voxelRef     = useRef<ReturnType<typeof createVoxelPlacer>    | null>(null);
    const controlsRef  = useRef<OrbitControls | null>(null);
    const toolRef      = useRef(activeTool); // readable from inside the animation loop

    // ── Sync active color ──────────────────────────────────
    useEffect(() => {
        highlightRef.current?.setColor(activeColor);
        voxelRef.current?.setColor(activeColor);
    }, [activeColor]);

    // ── Sync active tool ───────────────────────────────────
    useEffect(() => {
        toolRef.current = activeTool;
        const isDrawing = activeTool === 'draw';
        // Disable orbit so clicks go to voxelPlacer, not orbit controls
        if (controlsRef.current) controlsRef.current.enabled = !isDrawing;
        voxelRef.current?.setActive(isDrawing);
    }, [activeTool]);

    // ── Scene setup (runs once) ────────────────────────────
    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene    = createScene();
        const renderer = createRenderer(mount);
        const camera   = createCamera(mount);
        mount.appendChild(renderer.domElement);

        const controls = createOrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;
        controls.enabled    = toolRef.current !== 'draw';

        scene.add(createGridHelper(GRID_SIZE));
        scene.add(createAxisLines(GRID_SIZE));

        highlightRef.current = createHoverHighlight(scene, camera, renderer.domElement, activeColor);
        voxelRef.current     = createVoxelPlacer(scene, camera, renderer.domElement, activeColor);
        voxelRef.current.setActive(toolRef.current === 'draw');

        // ── Reset animation ────────────────────────────────
        let isResetting = false;
        const triggerReset = () => {
            isResetting = true;
            controls.enabled = false;
        };
        onResetReady?.(triggerReset);

        // ── Render loop ────────────────────────────────────
        let animFrameId: number;
        const animate = () => {
            animFrameId = requestAnimationFrame(animate);

            if (isResetting) {
                camera.position.lerp(DEFAULT_POS, LERP_SPEED);
                controls.target.lerp(DEFAULT_TARGET, LERP_SPEED);
                if (
                    camera.position.distanceTo(DEFAULT_POS)    < 0.01 &&
                    controls.target.distanceTo(DEFAULT_TARGET) < 0.01
                ) {
                    camera.position.copy(DEFAULT_POS);
                    controls.target.copy(DEFAULT_TARGET);
                    isResetting      = false;
                    // Restore correct orbit state based on current tool
                    controls.enabled = toolRef.current !== 'draw';
                }
            }

            controls.update();
            renderer.render(scene, camera);
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
        };
        window.addEventListener('resize', handleResize);

        // ── Cleanup ────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animFrameId);
            window.removeEventListener('resize', handleResize);
            highlightRef.current?.dispose();
            highlightRef.current = null;
            voxelRef.current?.dispose();
            voxelRef.current = null;
            controlsRef.current = null;
            controls.dispose();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
