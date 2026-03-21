'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createScene, createRenderer, createCamera, DEFAULT_POS, DEFAULT_TARGET, FRUSTUM_SIZE } from '@/engine/core/initScene';
import { createOrbitControls } from '@/engine/controls/orbitControls';
import { createGridHelper, createAxisLines } from '@/engine/helpers/gridHelper';
import { addSceneLighting } from '@/engine/core/lighting';
import { createVoxelEngine } from '@/features/rendering/voxelEngine';
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
    activeColor = '#795548',
    activeTool  = 'select',
}: IsometricPlaneProps) {
    const mountRef     = useRef<HTMLDivElement>(null);
    const engineRef    = useRef<ReturnType<typeof createVoxelEngine> | null>(null);
    const controlsRef  = useRef<OrbitControls | null>(null);
    const toolRef      = useRef(activeTool);

    // ── Sync active color ──────────────────────────────────
    useEffect(() => {
        engineRef.current?.setColor(activeColor);
    }, [activeColor]);

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
        mount.appendChild(renderer.domElement);

        const controls = createOrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;

        addSceneLighting(scene);
        scene.add(createGridHelper(GRID_SIZE));
        scene.add(createAxisLines(GRID_SIZE));

        engineRef.current = createVoxelEngine(scene, camera, renderer.domElement, activeColor);
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
                    controls.enabled = true;
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
            engineRef.current?.dispose();
            engineRef.current = null;
            controlsRef.current = null;
            controls.dispose();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
