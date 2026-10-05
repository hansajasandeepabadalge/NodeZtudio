/**
 * voxelEngine.ts
 * --------------
 * Unified module for hover preview and voxel placement.
 * Since hover and placement both need to raycast against the floor AND
 * existing voxels (to allow stacking), they share state here.
 */

import * as THREE from 'three';
import { createBlockMaterials } from './blockMaterials';
import { createBlockLights } from './blockLights';
import { parseVoxels, type BlockType, type VoxelData } from '@/features/voxel/blocks';

export type { VoxelData } from '@/features/voxel/blocks';

const GRID_SIZE = 20;
const HALF_GRID = GRID_SIZE / 2;
const HISTORY_LIMIT = 100;

export interface HistoryState {
    canUndo: boolean;
    canRedo: boolean;
}

interface VoxelChange {
    key: string;
    before?: VoxelData;
    after?: VoxelData;
}

export interface VoxelEngine {
    setColor(hex: string): void;
    setBlockType(type: BlockType): void;
    setMode(mode: 'draw' | 'erase' | 'select' | 'fill'): void;
    exportScene(): VoxelData[];
    importScene(data: VoxelData[]): void;
    clearScene(): void;
    undo(): void;
    redo(): void;
    getHistoryState(): HistoryState;
    updateLighting(): void;
    dispose(): void;
}

export function createVoxelEngine(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    initialColor: string,
    initialBlockType: BlockType = 'custom',
    onHistoryChange?: (state: HistoryState) => void,
): VoxelEngine {

    // ── Shared State ─────────────────────────────────────────
    let currentColor = initialColor;
    let currentBlockType = initialBlockType;
    const blockMaterials = createBlockMaterials();
    const blockLights = createBlockLights(scene);
    let currentMode: 'draw' | 'erase' | 'select' | 'fill' = 'select';

    /** Placed voxel meshes keyed by "x,y,z" */
    const voxels = new Map<string, THREE.Mesh>();
    const undoStack: VoxelChange[][] = [];
    const redoStack: VoxelChange[][] = [];

    const getHistoryState = (): HistoryState => ({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
    const notifyHistory = () => onHistoryChange?.(getHistoryState());

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

    function addVoxel(data: VoxelData) {
        const { x, y, z, color, blockType = 'custom' } = data;
        const key = cellKey(x, y, z);
        const existing = voxels.get(key);
        if (existing) {
            scene.remove(existing);
            existing.geometry.dispose();
        }
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), blockMaterials.get(blockType, color));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(x, y, z);
        mesh.userData.voxel = { x, y, z, color, blockType } satisfies VoxelData;
        scene.add(mesh);
        voxels.set(key, mesh);
        blockLights.set(key, mesh.position, blockType, color);
        mesh.updateMatrixWorld();
    }

    function removeVoxel(key: string) {
        const mesh = voxels.get(key);
        if (!mesh) return;
        scene.remove(mesh);
        mesh.geometry.dispose();
        voxels.delete(key);
        blockLights.remove(key);
    }

    function voxelAt(key: string): VoxelData | undefined {
        const mesh = voxels.get(key);
        return mesh ? { ...mesh.userData.voxel as VoxelData } : undefined;
    }

    function applyChanges(changes: VoxelChange[], direction: 'before' | 'after') {
        changes.forEach(change => {
            const data = change[direction];
            if (data) addVoxel(data);
            else removeVoxel(change.key);
        });
        blockLights.update(camera.position);
        onMouseLeave();
    }

    function commit(changes: VoxelChange[]) {
        const changed = changes.filter(({ before, after }) =>
            before?.color !== after?.color || before?.blockType !== after?.blockType);
        if (changed.length === 0) return;
        applyChanges(changed, 'after');
        undoStack.push(changed);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack.length = 0;
        notifyHistory();
    }

    // Bulk operations are a single undo step; unchanged cells aren't retained.
    function replaceScene(data: VoxelData[]) {
        const next = new Map(data.map(voxel => [cellKey(voxel.x, voxel.y, voxel.z), voxel]));
        const changes: VoxelChange[] = [];
        voxels.forEach((_, key) => changes.push({ key, before: voxelAt(key), after: next.get(key) }));
        next.forEach((voxel, key) => {
            if (!voxels.has(key)) changes.push({ key, after: voxel });
        });
        commit(changes);
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
        commit([{ key, before: voxelAt(key) }]);
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
                commit([{ key, before: voxelAt(key), after: {
                    x: place.x, y: place.y, z: place.z, color: currentColor, blockType: currentBlockType,
                } }]);

                onMouseMove(event);
            }
        }
    }

    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseleave', onMouseLeave);
    domElement.addEventListener('mousedown', onMouseDown);
    // Prevent context menu from popping up on right click
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    notifyHistory();

    // ── Public API ───────────────────────────────────────────
    return {
        setColor(hex: string) {
            currentColor = hex;
            const c = new THREE.Color(hex);
            hoverMat.color.copy(c);
        },
        setBlockType(type: BlockType) {
            currentBlockType = type;
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
            voxels.forEach(mesh => {
                result.push({ ...mesh.userData.voxel as VoxelData });
            });
            return result;
        },

        importScene(data: VoxelData[]) {
            replaceScene(parseVoxels(data));
        },

        clearScene() {
            replaceScene([]);
        },

        undo() {
            const changes = undoStack.pop();
            if (!changes) return;
            applyChanges(changes, 'before');
            redoStack.push(changes);
            notifyHistory();
        },

        redo() {
            const changes = redoStack.pop();
            if (!changes) return;
            applyChanges(changes, 'after');
            undoStack.push(changes);
            notifyHistory();
        },

        getHistoryState,

        updateLighting() {
            blockLights.update(camera.position);
        },

        dispose() {
            domElement.removeEventListener('mousemove', onMouseMove);
            domElement.removeEventListener('mouseleave', onMouseLeave);
            domElement.removeEventListener('mousedown', onMouseDown);
            
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
            });
            voxels.clear();

            blockMaterials.dispose();
            undoStack.length = 0;
            redoStack.length = 0;
            blockLights.dispose();
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
