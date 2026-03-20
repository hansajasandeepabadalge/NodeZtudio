'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Isometric default: equal X/Y/Z gives 45° horizontal + ~35° vertical
const DEFAULT_POS = new THREE.Vector3(20, 20, 20);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const LERP_SPEED = 0.05; // lower = slower reset animation

interface IsometricPlaneProps {
    /** Called once with a `reset()` fn so the parent can trigger view resets. */
    onResetReady?: (reset: () => void) => void;
}

export default function IsometricPlane({ onResetReady }: IsometricPlaneProps) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x00b4ff);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mount.appendChild(renderer.domElement);

        // Orthographic camera — negative near plane lets us see geometry behind the pivot
        const aspectRatio = mount.clientWidth / mount.clientHeight;
        const frustumSize = 20;
        const camera = new THREE.OrthographicCamera(
            -frustumSize * aspectRatio,
            frustumSize * aspectRatio,
            frustumSize,
            -frustumSize,
            -100,
            1000
        );
        camera.position.copy(DEFAULT_POS);
        camera.lookAt(DEFAULT_TARGET);

        // OrbitControls with damping for smooth inertia feel
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.screenSpacePanning = true;
        controls.target.copy(DEFAULT_TARGET);
        controls.update();

        const gridSize = 20;

        // Faint minor grid lines
        const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x000001, 0xffffff);
        (gridHelper.material as THREE.LineBasicMaterial).opacity = 0.15;
        (gridHelper.material as THREE.LineBasicMaterial).transparent = true;
        scene.add(gridHelper);

        // Brighter center axis lines — drawn separately because GridHelper uses
        // vertex colors and doesn't support per-line opacity.
        const gridHalf = gridSize / 2;
        const axisCenterGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-gridHalf, 0, 0),
            new THREE.Vector3(gridHalf, 0, 0),
            new THREE.Vector3(0, 0, -gridHalf),
            new THREE.Vector3(0, 0, gridHalf),
        ]);
        const axisCenterMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            opacity: 0.4,
            transparent: true,
        });
        const axisLines = new THREE.LineSegments(axisCenterGeometry, axisCenterMaterial);
        scene.add(axisLines);

        // Reset animation state — triggered by the parent via onResetReady
        let isResetting = false;

        const triggerReset = () => {
            isResetting = true;
            controls.enabled = false;
        };
        onResetReady?.(triggerReset);

        // Render loop
        let animFrameId: number;

        const animate = () => {
            animFrameId = requestAnimationFrame(animate);

            if (isResetting) {
                camera.position.lerp(DEFAULT_POS, LERP_SPEED);
                controls.target.lerp(DEFAULT_TARGET, LERP_SPEED);

                // Snap to exact position once close enough
                if (
                    camera.position.distanceTo(DEFAULT_POS) < 0.01 &&
                    controls.target.distanceTo(DEFAULT_TARGET) < 0.01
                ) {
                    camera.position.copy(DEFAULT_POS);
                    controls.target.copy(DEFAULT_TARGET);
                    isResetting = false;
                    controls.enabled = true;
                }
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Keep camera frustum & renderer in sync with container size
        const handleResize = () => {
            if (!mount) return;
            const width = mount.clientWidth;
            const height = mount.clientHeight;
            const aspectRatio = width / height;
            camera.left = -frustumSize * aspectRatio;
            camera.right = frustumSize * aspectRatio;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup on unmount
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
