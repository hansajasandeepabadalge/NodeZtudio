/**
 * voxelPlacer.ts
 * --------------
 * Handles click-to-place colored voxel blocks on the isometric grid.
 * Only active when the draw tool is selected (call setActive(true/false)).
 * Placed voxels are stored in a Map and can be replaced by clicking the same cell.
 */

import * as THREE from 'three';
import { GRID_SIZE } from '@/common/settings';

const HALF_GRID = GRID_SIZE / 2;

export interface VoxelPlacer {
    setColor(hex: string): void;
    setActive(active: boolean): void;
    dispose(): void;
}

export function createVoxelPlacer(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    initialColor: string,
): VoxelPlacer {

    // ── Invisible floor plane — raycast target ──────────────
    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // ── State ───────────────────────────────────────────────
    let currentColor = initialColor;
    let isActive     = false;

    /** Placed voxel meshes keyed by "x,z" cell coordinate. */
    const voxels = new Map<string, THREE.Mesh>();

    const raycaster = new THREE.Raycaster();
    const mouseNDC  = new THREE.Vector2();

    function cellKey(x: number, z: number) {
        return `${x},${z}`;
    }

    function placeVoxel(cellX: number, cellZ: number) {
        const key = cellKey(cellX, cellZ);

        // If a block already exists at this cell, remove it first (overwrite)
        const existing = voxels.get(key);
        if (existing) {
            scene.remove(existing);
            existing.geometry.dispose();
            (existing.material as THREE.Material).dispose();
            voxels.delete(key);
        }

        const geo  = new THREE.BoxGeometry(1, 1, 1);
        const mat  = new THREE.MeshLambertMaterial({ color: new THREE.Color(currentColor) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cellX, 0.5, cellZ);
        scene.add(mesh);
        voxels.set(key, mesh);
    }

    function onMouseDown(event: MouseEvent) {
        if (!isActive || event.button !== 0) return;

        const rect = domElement.getBoundingClientRect();
        mouseNDC.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);

        // Prioritise hitting placed voxel tops so we can stack on top of them
        const allMeshes = [floorMesh, ...voxels.values()];
        const hits = raycaster.intersectObjects(allMeshes);

        if (hits.length > 0) {
            const point = hits[0].point;
            // Place on the surface that was hit
            const cellX = Math.floor(point.x) + 0.5;
            const cellZ = Math.floor(point.z) + 0.5;
            if (Math.abs(cellX) <= HALF_GRID && Math.abs(cellZ) <= HALF_GRID) {
                placeVoxel(cellX, cellZ);
            }
        }
    }

    domElement.addEventListener('mousedown', onMouseDown);

    // ── Public API ──────────────────────────────────────────
    return {
        setColor(hex: string) {
            currentColor = hex;
        },
        setActive(active: boolean) {
            isActive = active;
        },
        dispose() {
            domElement.removeEventListener('mousedown', onMouseDown);
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            voxels.clear();
            scene.remove(floorMesh);
            floorMesh.geometry.dispose();
            (floorMesh.material as THREE.Material).dispose();
        },
    };
}
