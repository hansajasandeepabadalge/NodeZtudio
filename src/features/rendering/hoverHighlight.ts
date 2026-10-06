/**
 * hoverHighlight.ts
 * -----------------
 * Manages the transparent hover-cube that follows the mouse over the isometric grid.
 * Call `createHoverHighlight(...)` once after the scene is set up, then call
 * `dispose()` in the cleanup phase.
 */

import * as THREE from 'three';
import { GRID_SIZE } from '@/utils/constants';

const HALF_GRID = GRID_SIZE / 2;

export interface HoverHighlight {
    /** Update the material color (hex string). */
    setColor(hex: string): void;
    /** Remove event listeners and Three.js objects from the scene. */
    dispose(): void;
}

export function createHoverHighlight(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    initialColor: string,
): HoverHighlight {

    // ── Invisible floor plane — raycast target ──────────────
    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // ── Hover cube ──────────────────────────────────────────
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const fillMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(initialColor),
        transparent: true,
        opacity: 0.5,
        side: THREE.FrontSide,
        depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(boxGeo, fillMat);
    fillMesh.position.y = 0.5;
    fillMesh.visible = false;
    scene.add(fillMesh);

    const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(initialColor),
        opacity: 0.85,
        transparent: true,
    });
    const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
    edgeLines.position.y = 0.5;
    edgeLines.visible = false;
    scene.add(edgeLines);

    // ── Raycaster ───────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouseNDC  = new THREE.Vector2();

    function show(x: number, z: number) {
        fillMesh.position.set(x, 0.5, z);
        edgeLines.position.set(x, 0.5, z);
        fillMesh.visible  = true;
        edgeLines.visible = true;
    }

    function hide() {
        fillMesh.visible  = false;
        edgeLines.visible = false;
    }

    function onMouseMove(event: MouseEvent) {
        const rect = domElement.getBoundingClientRect();
        mouseNDC.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObject(floorMesh);

        if (hits.length > 0) {
            const { x, z } = hits[0].point;
            const cellX = Math.floor(x) + 0.5;
            const cellZ = Math.floor(z) + 0.5;
            if (Math.abs(cellX) <= HALF_GRID && Math.abs(cellZ) <= HALF_GRID) {
                show(cellX, cellZ);
                return;
            }
        }
        hide();
    }

    function onMouseLeave() { hide(); }

    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseleave', onMouseLeave);

    // ── Public API ──────────────────────────────────────────
    return {
        setColor(hex: string) {
            const c = new THREE.Color(hex);
            fillMat.color.copy(c);
            edgeMat.color.copy(c);
        },
        dispose() {
            domElement.removeEventListener('mousemove', onMouseMove);
            domElement.removeEventListener('mouseleave', onMouseLeave);
            scene.remove(fillMesh, edgeLines, floorMesh);
            boxGeo.dispose();
            fillMat.dispose();
            edgeMat.dispose();
            floorMesh.geometry.dispose();
            (floorMesh.material as THREE.Material).dispose();
        },
    };
}
