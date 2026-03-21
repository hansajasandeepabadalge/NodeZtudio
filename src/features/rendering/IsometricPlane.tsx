'use client';

import { useEffect, useRef } from 'react';
import { createScene, createRenderer, createCamera, DEFAULT_POS, DEFAULT_TARGET, FRUSTUM_SIZE } from '@/engine/core/initScene';
import { createOrbitControls } from '@/engine/controls/orbitControls';
import { createGridHelper, createAxisLines } from '@/engine/helpers/gridHelper';

const LERP_SPEED = 0.05;
const GRID_SIZE  = 20;

interface IsometricPlaneProps {
    /** Called once with a reset fn so the parent can trigger view resets. */
    onResetReady?: (reset: () => void) => void;
}

export default function IsometricPlane({ onResetReady }: IsometricPlaneProps) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ── Core objects ───────────────────────────────────
        const scene    = createScene();
        const renderer = createRenderer(mount);
        const camera   = createCamera(mount);
        mount.appendChild(renderer.domElement);

        const controls = createOrbitControls(camera, renderer.domElement);

        // ── Grid & axes ────────────────────────────────────
        scene.add(createGridHelper(GRID_SIZE));
        scene.add(createAxisLines(GRID_SIZE));

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
                    camera.position.distanceTo(DEFAULT_POS)     < 0.01 &&
                    controls.target.distanceTo(DEFAULT_TARGET)  < 0.01
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
            const aspect  = w / h;
            camera.left   = -FRUSTUM_SIZE * aspect;
            camera.right  =  FRUSTUM_SIZE * aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        // ── Cleanup ────────────────────────────────────────
        return () => {
            cancelAnimationFrame(animFrameId);
            window.removeEventListener('resize', handleResize);
            controls.dispose();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
