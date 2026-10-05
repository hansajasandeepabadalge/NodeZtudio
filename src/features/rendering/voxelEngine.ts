/**
 * voxelEngine.ts
 * --------------
 * Unified module for hover preview and voxel placement.
 * Since hover and placement both need to raycast against the floor AND
 * existing voxels (to allow stacking), they share state here.
 */

import * as THREE from 'three';

const GRID_SIZE = 20;
const HALF_GRID = GRID_SIZE / 2;

export interface VoxelData {
    x: number;
    y: number;
    z: number;
    color: string;
}

export interface VoxelEngine {
    setColor(hex: string): void;
    setMode(mode: 'draw' | 'erase' | 'select' | 'fill'): void;
    exportScene(): VoxelData[];
    importScene(data: VoxelData[]): void;
    clearScene(): void;
    dispose(): void;
}

export function createVoxelEngine(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    initialColor: string,
): VoxelEngine {

    // ── Shared State ─────────────────────────────────────────
    let currentColor = initialColor;
    let currentMode: 'draw' | 'erase' | 'select' | 'fill' = 'select';

    /** Placed voxel meshes keyed by "x,y,z" */
    const voxels = new Map<string, THREE.Mesh>();

    // ── Invisible Floor ──────────────────────────────────────
    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
        new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    // ── Hover Highlight ──────────────────────────────────────
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    
    const hoverMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(initialColor),
        transparent: true,
        opacity: 0.5,
        side: THREE.FrontSide,
        depthWrite: false,
    });
    const hoverMesh = new THREE.Mesh(boxGeo, hoverMat);
    hoverMesh.visible = false;
    scene.add(hoverMesh);

    const edgeMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.85,
        transparent: true,
    });
    const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
    edgeLines.visible = false;
    scene.add(edgeLines);

    // ── Erase Hover Highlight (red tint overlay on hit block) ─
    const eraseHoverMat = new THREE.MeshBasicMaterial({
        color: 0xff2222,
        transparent: true,
        opacity: 0.45,
        side: THREE.FrontSide,
        depthWrite: false,
    });
    const eraseHoverMesh = new THREE.Mesh(boxGeo, eraseHoverMat);
    eraseHoverMesh.visible = false;
    scene.add(eraseHoverMesh);

    const eraseEdgeMat = new THREE.LineBasicMaterial({
        color: 0xff4444,
        opacity: 0.95,
        transparent: true,
    });
    const eraseEdgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), eraseEdgeMat);
    eraseEdgeLines.visible = false;
    scene.add(eraseEdgeLines);

    // ── Raycaster Utils ──────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouseNDC  = new THREE.Vector2();

    function cellKey(x: number, y: number, z: number) {
        return `${x},${y},${z}`;
    }

    interface HitTargets {
        /** The cell where a new block should be placed */
        place: THREE.Vector3 | null;
        /** The cell of the existing block that was hit (or null if floor/air) */
        hitBlock: THREE.Vector3 | null;
    }

    /** Returns both the target for placing a new block and the specific block being hit (if any) */
    function getTargets(event: MouseEvent): HitTargets {
        const rect = domElement.getBoundingClientRect();
        mouseNDC.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        mouseNDC.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);

        // Raycast against floor + all placed blocks
        const objects = [floorMesh, ...voxels.values()];
        const hits = raycaster.intersectObjects(objects);

        if (hits.length === 0) {
            return { place: null, hitBlock: null };
        }

        const hit = hits[0];
        const isFloor = hit.object === floorMesh;

        // Calculate the hit block (the one we are looking at)
        let hitBlock: THREE.Vector3 | null = null;
        if (!isFloor) {
            hitBlock = hit.object.position.clone();
        }
        
        // Calculate the place target (adjacent cell)
        const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0);
        if (isFloor) normal.set(0, 1, 0);

        const pos = hit.point.clone().add(normal.multiplyScalar(0.5));

        // Snap to grid
        const cellX = Math.floor(pos.x) + 0.5;
        const cellY = Math.floor(pos.y) + 0.5;
        const cellZ = Math.floor(pos.z) + 0.5;

        let place: THREE.Vector3 | null = null;
        if (Math.abs(cellX) <= HALF_GRID && Math.abs(cellZ) <= HALF_GRID && cellY > 0) {
            place = new THREE.Vector3(cellX, cellY, cellZ);
        }

        return { place, hitBlock };
    }

    // ── Interaction Handlers ─────────────────────────────────

    function onMouseMove(event: MouseEvent) {
        // Hide erase highlights by default
        eraseHoverMesh.visible = false;
        eraseEdgeLines.visible = false;

        if (currentMode === 'erase') {
            hoverMesh.visible = false;
            edgeLines.visible = false;
            const { hitBlock } = getTargets(event);
            if (hitBlock) {
                eraseHoverMesh.position.copy(hitBlock);
                eraseEdgeLines.position.copy(hitBlock);
                eraseHoverMesh.visible = true;
                eraseEdgeLines.visible = true;
            }
            return;
        }

        if (currentMode !== 'draw' && currentMode !== 'select') {
            hoverMesh.visible = false;
            edgeLines.visible = false;
            return;
        }

        const { place, hitBlock } = getTargets(event);

        if (currentMode === 'select') {
            // Select mode: only show highlight on hit block
            if (hitBlock) {
                hoverMesh.position.copy(hitBlock);
                edgeLines.position.copy(hitBlock);
                hoverMesh.visible = true;
                edgeLines.visible = true;
            } else {
                hoverMesh.visible = false;
                edgeLines.visible = false;
            }
        } else if (currentMode === 'draw') {
            // Draw mode: only show white border outline at the place target
            hoverMesh.visible = false;
            if (place) {
                edgeLines.position.copy(place);
                edgeLines.visible = true;
            } else {
                edgeLines.visible = false;
            }
        }
    }

    function onMouseLeave() {
        hoverMesh.visible = false;
        edgeLines.visible = false;
        eraseHoverMesh.visible = false;
        eraseEdgeLines.visible = false;
    }

    function eraseVoxelAt(hitBlock: THREE.Vector3) {
        const key = cellKey(hitBlock.x, hitBlock.y, hitBlock.z);
        const existing = voxels.get(key);
        if (existing) {
            scene.remove(existing);
            existing.geometry.dispose();
            (existing.material as THREE.Material).dispose();
            voxels.delete(key);
        }
    }

    function onMouseDown(event: MouseEvent) {
        if (currentMode === 'erase') {
            if (event.button === 0) {
                // Left click in erase mode = remove hovered voxel
                const { hitBlock } = getTargets(event);
                if (hitBlock) {
                    eraseVoxelAt(hitBlock);
                    onMouseMove(event); // refresh hover highlight
                }
            }
            return;
        }

        if (currentMode !== 'draw') return;

        const { place } = getTargets(event);

        if (event.button === 0) {
            // Left click = Place block
            if (place) {
                const key = cellKey(place.x, place.y, place.z);

                const existing = voxels.get(key);
                if (existing) {
                    scene.remove(existing);
                    existing.geometry.dispose();
                    (existing.material as THREE.Material).dispose();
                }

                const geo  = new THREE.BoxGeometry(1, 1, 1);
                const mat  = new THREE.MeshStandardMaterial({ color: new THREE.Color(currentColor), roughness: 1, metalness: 0 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.copy(place);
                scene.add(mesh);
                voxels.set(key, mesh);

                onMouseMove(event);
            }
        }
    }

    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseleave', onMouseLeave);
    domElement.addEventListener('mousedown', onMouseDown);
    // Prevent context menu from popping up on right click
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // ── Public API ───────────────────────────────────────────
    return {
        setColor(hex: string) {
            currentColor = hex;
            const c = new THREE.Color(hex);
            hoverMat.color.copy(c);
        },
        setMode(mode: 'draw' | 'erase' | 'select' | 'fill') {
            currentMode = mode;
            hoverMesh.visible = false;
            edgeLines.visible = false;
            eraseHoverMesh.visible = false;
            eraseEdgeLines.visible = false;
        },

        exportScene(): VoxelData[] {
            const result: VoxelData[] = [];
            voxels.forEach((mesh, key) => {
                const [x, y, z] = key.split(',').map(Number);
                const mat = mesh.material as THREE.MeshStandardMaterial;
                result.push({ x, y, z, color: '#' + mat.color.getHexString() });
            });
            return result;
        },

        importScene(data: VoxelData[]) {
            // Clear existing
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            voxels.clear();

            // Rebuild
            data.forEach(({ x, y, z, color }) => {
                const key = cellKey(x, y, z);
                const geo  = new THREE.BoxGeometry(1, 1, 1);
                const mat  = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 1, metalness: 0 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(x, y, z);
                scene.add(mesh);
                voxels.set(key, mesh);
            });
        },

        clearScene() {
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            voxels.clear();
        },

        dispose() {
            domElement.removeEventListener('mousemove', onMouseMove);
            domElement.removeEventListener('mouseleave', onMouseLeave);
            domElement.removeEventListener('mousedown', onMouseDown);
            
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            voxels.clear();

            scene.remove(floorMesh, hoverMesh, edgeLines, eraseHoverMesh, eraseEdgeLines);
            boxGeo.dispose();
            hoverMat.dispose();
            edgeMat.dispose();
            eraseHoverMat.dispose();
            eraseEdgeMat.dispose();
            floorMesh.geometry.dispose();
            (floorMesh.material as THREE.Material).dispose();
        },
    };
}
