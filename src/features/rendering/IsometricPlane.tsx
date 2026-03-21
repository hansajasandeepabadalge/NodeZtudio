'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createScene, createRenderer, createCamera, DEFAULT_POS, DEFAULT_TARGET, FRUSTUM_SIZE } from '@/engine/core/initScene';
import { createOrbitControls } from '@/engine/controls/orbitControls';
import { createGridHelper, createAxisLines } from '@/engine/helpers/gridHelper';

const LERP_SPEED = 0.05;
const GRID_SIZE  = 20;
const HALF_GRID  = GRID_SIZE / 2;

interface IsometricPlaneProps {
    onResetReady?: (reset: () => void) => void;
    /** Hex color string (e.g. '#3498db') used to tint the hover cube. */
    activeColor?: string;
}

export default function IsometricPlane({ onResetReady, activeColor = '#00b4ff' }: IsometricPlaneProps) {
    const mountRef    = useRef<HTMLDivElement>(null);
    // Refs that outlive the setup effect so the color-sync effect can reach them
    const fillMatRef  = useRef<THREE.MeshBasicMaterial | null>(null);
    const edgeMatRef  = useRef<THREE.LineBasicMaterial  | null>(null);
    const colorRef    = useRef(activeColor);

    // Sync materials whenever the active color changes (no scene remount)
    useEffect(() => {
        colorRef.current = activeColor;
        const c = new THREE.Color(activeColor);
        if (fillMatRef.current) fillMatRef.current.color.copy(c);
        if (edgeMatRef.current) edgeMatRef.current.color.copy(c);
    }, [activeColor]);

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

        // ── Invisible floor plane for raycasting ───────────
        const floorMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
            new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
        );
        floorMesh.rotation.x = -Math.PI / 2;
        scene.add(floorMesh);

        // ── Hover highlight — transparent cube ────────────
        const boxGeo = new THREE.BoxGeometry(0.96, 1, 0.96);

        // Transparent face fill
        const fillMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(colorRef.current),
            transparent: true,
            opacity: 0.5,
            side: THREE.FrontSide,
            depthWrite: false,
        });
        fillMatRef.current = fillMat;

        const boxFillMesh = new THREE.Mesh(boxGeo, fillMat);
        boxFillMesh.position.y = 0.5; // sit on top of grid
        boxFillMesh.visible = false;
        scene.add(boxFillMesh);

        // Wireframe edge outline
        const edgeMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(colorRef.current),
            opacity: 0.85,
            transparent: true,
        });
        edgeMatRef.current = edgeMat;

        const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
        boxEdges.position.y = 0.5;
        boxEdges.visible = false;
        scene.add(boxEdges);

        // ── Raycaster ──────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const mouseNDC  = new THREE.Vector2();

        const handleMouseMove = (event: MouseEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouseNDC.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
            mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouseNDC, camera);
            const hits = raycaster.intersectObject(floorMesh);

            if (hits.length > 0) {
                const { x, z } = hits[0].point;

                // Snap world position to nearest cell centre
                const cellX = Math.floor(x) + 0.5;
                const cellZ = Math.floor(z) + 0.5;

                // Only highlight if within grid bounds
                if (Math.abs(cellX) <= HALF_GRID && Math.abs(cellZ) <= HALF_GRID) {
                    boxFillMesh.position.set(cellX, 0.5, cellZ);
                    boxEdges.position.set(cellX, 0.5, cellZ);
                    boxFillMesh.visible = true;
                    boxEdges.visible    = true;
                    return;
                }
            }

            boxFillMesh.visible = false;
            boxEdges.visible    = false;
        };

        const handleMouseLeave = () => {
            boxFillMesh.visible = false;
            boxEdges.visible    = false;
        };

        renderer.domElement.addEventListener('mousemove', handleMouseMove);
        renderer.domElement.addEventListener('mouseleave', handleMouseLeave);

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
            renderer.domElement.removeEventListener('mousemove', handleMouseMove);
            renderer.domElement.removeEventListener('mouseleave', handleMouseLeave);
            controls.dispose();
            mount.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);

    return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
}
