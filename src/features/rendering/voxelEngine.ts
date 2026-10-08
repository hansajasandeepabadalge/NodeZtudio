import { ToolId, BlockId } from '@/common/enums';
/**
 * voxelEngine.ts
 * --------------
 * Unified module for hover preview and voxel placement.
 * Since hover and placement both need to raycast against the floor AND
 * existing voxels (to allow stacking), they share state here.
 */

import * as THREE from 'three';
import { createBlockMaterials } from './blockMaterials';
import { createBlockGeometry } from './blockGeometry';
import { createBlockLights } from './blockLights';
import { blockHeight, isBlockType, isDoor, parseVoxels, type BlockType, type VoxelData } from '@/features/voxel/blocks';
import type { Tool } from '@/types/tools';
import { GRID_SIZE, SETTINGS } from '@/common/settings';

export type { VoxelData } from '@/features/voxel/blocks';

const HALF_GRID = GRID_SIZE / 2;
const HISTORY_LIMIT = SETTINGS.editor.historyLimit;

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
    setMode(mode: Tool): void;
    setRotation(rotation: number): void;
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
    initialBlockType: BlockType = SETTINGS.editor.block,
    onHistoryChange?: (state: HistoryState) => void,
    onPick?: (voxel: VoxelData) => void,
): VoxelEngine {

    // ── Shared State ─────────────────────────────────────────
    let currentColor = initialColor;
    let currentBlockType: BlockType = isBlockType(initialBlockType) ? initialBlockType : BlockId.Custom;
    const blockMaterials = createBlockMaterials();
    const blockLights = createBlockLights(scene);
    let currentMode: Tool = SETTINGS.editor.tool;
    let boxStart: THREE.Vector3 | null = null;
    let currentRotation = 0;
    let lastMouseEvent: MouseEvent | undefined;
    let drag: { key: string; source: VoxelData; start: THREE.Vector3; target: THREE.Vector3; valid: boolean } | null = null;

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
        opacity: SETTINGS.hover.opacity,
        side: THREE.FrontSide,
        depthWrite: false,
    });
    const hoverMesh = new THREE.Mesh(boxGeo, hoverMat);
    hoverMesh.visible = false;
    scene.add(hoverMesh);

    function ghostMaterials() {
        const original = blockMaterials.get(currentBlockType, currentColor);
        const clone = (material: THREE.MeshStandardMaterial) => {
            const ghost = material.clone();
            ghost.transparent = true;
            ghost.opacity = .55;
            ghost.depthWrite = false;
            return ghost;
        };
        return Array.isArray(original) ? original.map(clone) : clone(original);
    }
    const placementPreview = new THREE.Mesh(createBlockGeometry(currentBlockType), ghostMaterials());
    placementPreview.visible = false;
    scene.add(placementPreview);
    function refreshPlacementPreview() {
        placementPreview.geometry.dispose();
        const materials = Array.isArray(placementPreview.material) ? placementPreview.material : [placementPreview.material];
        materials.forEach(material => material.dispose());
        placementPreview.geometry = createBlockGeometry(currentBlockType);
        placementPreview.material = ghostMaterials();
        if (lastMouseEvent) onMouseMove(lastMouseEvent);
    }

    const edgeMat = new THREE.LineBasicMaterial({
        color: SETTINGS.hover.edgeColor,
        opacity: SETTINGS.hover.edgeOpacity,
        transparent: true,
    });
    const edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat);
    edgeLines.visible = false;
    scene.add(edgeLines);

    // ── Erase Hover Highlight (red tint overlay on hit block) ─
    const eraseHoverMat = new THREE.MeshBasicMaterial({
        color: SETTINGS.hover.eraseColor,
        transparent: true,
        opacity: SETTINGS.hover.eraseOpacity,
        side: THREE.FrontSide,
        depthWrite: false,
    });
    const eraseHoverMesh = new THREE.Mesh(boxGeo, eraseHoverMat);
    eraseHoverMesh.visible = false;
    scene.add(eraseHoverMesh);

    const eraseEdgeMat = new THREE.LineBasicMaterial({
        color: SETTINGS.hover.eraseEdgeColor,
        opacity: SETTINGS.hover.eraseEdgeOpacity,
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
        const { x, y, z, color, blockType = BlockId.Custom, rotation = 0 } = data;
        const key = cellKey(x, y, z);
        const existing = voxels.get(key);
        if (existing) {
            scene.remove(existing);
            existing.geometry.dispose();
        }
        const mesh = new THREE.Mesh(createBlockGeometry(blockType), blockMaterials.get(blockType, color));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotation * Math.PI / 2;
        mesh.userData.voxel = { x, y, z, color, blockType, ...(data.rotation !== undefined ? { rotation } : {}) } satisfies VoxelData;
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

    function canPlace(x: number, y: number, z: number, type: BlockType, ignore?: string) {
        if (Math.abs(x) > HALF_GRID || Math.abs(z) > HALF_GRID || y <= 0) return false;
        for (let dy = 0; dy < blockHeight(type); dy++) {
            const key = cellKey(x, y + dy, z);
            const below = cellKey(x, y + dy - 1, z);
            if ((key !== ignore && voxels.has(key)) ||
                (below !== ignore && isDoor(voxelAt(below)?.blockType ?? BlockId.Custom))) return false;
        }
        return true;
    }

    function previewCell(mesh: THREE.Object3D, edges: THREE.Object3D, cell: THREE.Vector3, type: BlockType, rotation = 0) {
        const door = isDoor(type);
        mesh.scale.set(1, blockHeight(type), door ? 3 / 16 : 1);
        edges.scale.copy(mesh.scale);
        mesh.rotation.set(0, rotation * Math.PI / 2, 0);
        edges.rotation.copy(mesh.rotation);
        mesh.position.copy(cell).add(new THREE.Vector3(0, door ? .5 : 0, door ? -13 / 32 : 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), mesh.rotation.y));
        edges.position.copy(mesh.position);
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
            before?.color !== after?.color || before?.blockType !== after?.blockType ||
            (before?.rotation ?? 0) !== (after?.rotation ?? 0));
        if (changed.length === 0) return;
        applyChanges(changed, 'after');
        undoStack.push(changed);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack.length = 0;
        notifyHistory();
    }

    // Bulk operations are a single undo step; unchanged cells aren't retained.
    function replaceScene(data: VoxelData[]) {
        cancelBox();
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
        else normal.transformDirection(hit.object.matrixWorld);
        normal.round();

        const pos = hit.point.clone().add(normal.multiplyScalar(0.5));

        // Snap to grid
        const doorHit = !isFloor && isDoor(hit.object.userData.voxel?.blockType);
        const cellX = doorHit && Math.abs(normal.x) > .9 / 2
            ? hit.object.position.x + Math.sign(normal.x) : Math.floor(pos.x) + 0.5;
        const cellY = Math.floor(pos.y) + 0.5;
        // A thin door face still places neighbors in the adjacent grid cell.
        const cellZ = doorHit && Math.abs(normal.z) > .9 / 2
            ? hit.object.position.z + Math.sign(normal.z)
            : Math.floor(pos.z) + 0.5;

        let place: THREE.Vector3 | null = null;
        if (Math.abs(cellX) <= HALF_GRID && Math.abs(cellZ) <= HALF_GRID && cellY > 0) {
            place = new THREE.Vector3(cellX, cellY, cellZ);
        }

        return { place, hitBlock };
    }

    // ── Interaction Handlers ─────────────────────────────────

    function previewBox(end: THREE.Vector3) {
        const start = boxStart ?? end;
        const size = new THREE.Vector3(
            Math.abs(start.x - end.x) + 1,
            Math.abs(start.y - end.y) + 1,
            Math.abs(start.z - end.z) + 1,
        );
        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        if (currentMode === ToolId.Box && isDoor(currentBlockType)) {
            size.y += 1;
            center.y += .5;
        }
        const mesh = currentMode === ToolId.BoxErase ? eraseHoverMesh : hoverMesh;
        const edges = currentMode === ToolId.BoxErase ? eraseEdgeLines : edgeLines;
        mesh.position.copy(center);
        edges.position.copy(center);
        mesh.scale.copy(size);
        edges.scale.copy(size);
        mesh.rotation.set(0, 0, 0);
        edges.rotation.set(0, 0, 0);
        mesh.visible = edges.visible = true;
    }

    function boxTarget(event: MouseEvent) {
        const { place, hitBlock } = getTargets(event);
        return currentMode === ToolId.BoxErase ? hitBlock ?? place : place;
    }

    function cancelBox() {
        cancelDrag();
        boxStart = null;
        onMouseLeave();
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') cancelBox();
    }

    function dragPoint(event: MouseEvent, y: number) {
        const rect = domElement.getBoundingClientRect();
        mouseNDC.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        raycaster.setFromCamera(mouseNDC, camera);
        return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), new THREE.Vector3());
    }

    function cancelDrag() {
        if (!drag) return;
        voxels.get(drag.key)?.position.set(drag.source.x, drag.source.y, drag.source.z);
        voxels.get(drag.key)?.updateMatrixWorld();
        drag = null;
        if (domElement.style) domElement.style.cursor = '';
    }

    function updateDrag(event: MouseEvent) {
        if (!drag) return;
        const point = dragPoint(event, drag.source.y - .5);
        if (!point) { drag.valid = false; return; }
        const target = point.sub(drag.start).add(new THREE.Vector3(drag.source.x, drag.source.y, drag.source.z));
        target.set(Math.floor(target.x) + .5, drag.source.y, Math.floor(target.z) + .5);
        drag.target.copy(target);
        drag.valid = canPlace(target.x, target.y, target.z, drag.source.blockType ?? BlockId.Custom, drag.key);
        const mesh = voxels.get(drag.key);
        if (mesh) { mesh.position.copy(target); mesh.updateMatrixWorld(); }
        previewCell(hoverMesh, edgeLines, target, drag.source.blockType ?? BlockId.Custom, drag.source.rotation);
        edgeMat.color.set(drag.valid ? SETTINGS.hover.edgeColor : SETTINGS.hover.eraseEdgeColor);
        hoverMesh.visible = false;
        edgeLines.visible = true;
    }

    function onMouseUp(event: MouseEvent) {
        if (!drag || event.button !== 0) return;
        updateDrag(event);
        const { key, source, target, valid } = drag;
        cancelDrag();
        if (valid && (target.x !== source.x || target.z !== source.z)) {
            commit([{ key, before: source }, { key: cellKey(target.x, target.y, target.z), after: { ...source, x: target.x, y: target.y, z: target.z } }]);
        }
        onMouseLeave();
    }

    function onMouseMove(event: MouseEvent) {
        lastMouseEvent = event;
        placementPreview.visible = false;
        if (drag) { updateDrag(event); return; }
        // Hide erase highlights by default
        eraseHoverMesh.visible = false;
        eraseEdgeLines.visible = false;

        if (currentMode === ToolId.Box || currentMode === ToolId.BoxErase) {
            const place = boxTarget(event);
            onMouseLeave();
            if (place) previewBox(place);
            else if (boxStart) previewBox(boxStart);
            return;
        }

        if (currentMode === ToolId.Erase) {
            hoverMesh.visible = false;
            edgeLines.visible = false;
            const { hitBlock } = getTargets(event);
            if (hitBlock) {
                const voxel = voxelAt(cellKey(hitBlock.x, hitBlock.y, hitBlock.z));
                previewCell(eraseHoverMesh, eraseEdgeLines, hitBlock, voxel?.blockType ?? BlockId.Custom, voxel?.rotation);
                eraseHoverMesh.visible = true;
                eraseEdgeLines.visible = true;
            }
            return;
        }

        const { place, hitBlock } = getTargets(event);

        if (currentMode !== ToolId.Draw) {
            // Select mode: only show highlight on hit block
            if (hitBlock) {
                const voxel = voxelAt(cellKey(hitBlock.x, hitBlock.y, hitBlock.z));
                previewCell(hoverMesh, edgeLines, hitBlock, voxel?.blockType ?? BlockId.Custom, voxel?.rotation);
                hoverMesh.visible = true;
                edgeLines.visible = true;
            } else {
                hoverMesh.visible = false;
                edgeLines.visible = false;
            }
        } else if (currentMode === ToolId.Draw) {
            // Draw mode: only show white border outline at the place target
            hoverMesh.visible = false;
            if (place) {
                previewCell(hoverMesh, edgeLines, place, currentBlockType, currentRotation);
                if (!canPlace(place.x, place.y, place.z, currentBlockType)) {
                    edgeLines.visible = false;
                    return;
                }
                edgeLines.visible = true;
                placementPreview.position.copy(place);
                placementPreview.rotation.y = currentRotation * Math.PI / 2;
                placementPreview.visible = true;
            } else {
                edgeLines.visible = false;
            }
        }
    }

    function onMouseLeave() {
        placementPreview.visible = false;
        edgeMat.color.set(SETTINGS.hover.edgeColor);
        for (const preview of [hoverMesh, edgeLines, eraseHoverMesh, eraseEdgeLines]) preview.rotation.set(0, 0, 0);
        hoverMesh.scale.setScalar(1);
        edgeLines.scale.setScalar(1);
        eraseHoverMesh.scale.setScalar(1);
        eraseEdgeLines.scale.setScalar(1);
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
        lastMouseEvent = event;
        if (event.button === 2 && drag) { cancelBox(); return; }
        if (event.button === 0 && (currentMode === ToolId.Rotate || currentMode === ToolId.Move)) {
            const { hitBlock } = getTargets(event);
            if (!hitBlock) return;
            const key = cellKey(hitBlock.x, hitBlock.y, hitBlock.z);
            const source = voxelAt(key);
            if (!source) return;
            if (currentMode === ToolId.Rotate) {
                const rotation = ((source.rotation ?? 0) + (event.shiftKey ? 3 : 1)) % 4;
                commit([{ key, before: source, after: { ...source, rotation } }]);
                onMouseMove(event);
            } else {
                const start = dragPoint(event, source.y - .5);
                if (start) {
                    drag = { key, source, start, target: hitBlock.clone(), valid: true };
                    if (domElement.style) domElement.style.cursor = 'grabbing';
                }
            }
            return;
        }
        if (currentMode === ToolId.Box || currentMode === ToolId.BoxErase) {
            if (event.button === 2) {
                cancelBox();
                return;
            }
            if (event.button !== 0) return;
            const place = boxTarget(event);
            if (!place) return;
            if (!boxStart) {
                boxStart = place.clone();
                previewBox(place);
                return;
            }
            const min = boxStart.clone().min(place);
            const max = boxStart.clone().max(place);
            const changes: VoxelChange[] = [];
            if (currentMode === ToolId.BoxErase) {
                // Scan existing cells so empty space in a large box costs no extra work.
                voxels.forEach((mesh, key) => {
                    const { x, y, z } = mesh.position;
                    if (x >= min.x && x <= max.x && y + blockHeight(voxelAt(key)?.blockType) - 1 >= min.y && y <= max.y && z >= min.z && z <= max.z) {
                        changes.push({ key, before: voxelAt(key) });
                    }
                });
            } else for (let x = min.x; x <= max.x; x++) {
                for (let y = min.y; y <= max.y; y += blockHeight(currentBlockType)) {
                    for (let z = min.z; z <= max.z; z++) {
                        const key = cellKey(x, y, z);
                        if (canPlace(x, y, z, currentBlockType)) changes.push({ key, after: {
                            x, y, z, color: currentColor, blockType: currentBlockType, ...(currentRotation ? { rotation: currentRotation } : {}),
                        } });
                    }
                }
            }
            cancelBox();
            commit(changes);
            return;
        }
        if (event.button === 0 && (currentMode === ToolId.Paint || currentMode === ToolId.Fill || currentMode === ToolId.Pick)) {
            const { hitBlock } = getTargets(event);
            if (!hitBlock) return;
            const key = cellKey(hitBlock.x, hitBlock.y, hitBlock.z);
            const source = voxelAt(key);
            if (!source) return;
            if (currentMode === ToolId.Pick) {
                onPick?.(source);
                return;
            }
            if (currentMode === ToolId.Paint) {
                if (!canPlace(source.x, source.y, source.z, currentBlockType, key)) return;
                commit([{ key, before: source, after: { ...source, color: currentColor, blockType: currentBlockType } }]);
            } else {
                const queue = [key];
                const visited = new Set<string>(queue);
                const changes: VoxelChange[] = [];
                for (let index = 0; index < queue.length; index++) {
                    const voxel = voxelAt(queue[index]);
                    if (!voxel || voxel.blockType !== source.blockType || voxel.color.toLowerCase() !== source.color.toLowerCase()) continue;
                    if (!canPlace(voxel.x, voxel.y, voxel.z, currentBlockType, queue[index])) continue;
                    changes.push({ key: queue[index], before: voxel, after: { ...voxel, color: currentColor, blockType: currentBlockType } });
                    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
                        const neighbor = cellKey(voxel.x + dx, voxel.y + dy, voxel.z + dz);
                        if (!visited.has(neighbor) && voxels.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }
                commit(changes);
            }
            onMouseMove(event);
            return;
        }
        if (currentMode === ToolId.Erase) {
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

        if (currentMode !== ToolId.Draw) return;

        const { place } = getTargets(event);

        if (event.button === 0) {
            // Left click = Place block
            if (place && canPlace(place.x, place.y, place.z, currentBlockType)) {
                const key = cellKey(place.x, place.y, place.z);
                commit([{ key, before: voxelAt(key), after: {
                    x: place.x, y: place.y, z: place.z, color: currentColor, blockType: currentBlockType, ...(currentRotation ? { rotation: currentRotation } : {}),
                } }]);

                onMouseMove(event);
            }
        }
    }

    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mouseleave', onMouseLeave);
    domElement.addEventListener('mousedown', onMouseDown);
    domElement.ownerDocument?.addEventListener('keydown', onKeyDown);
    domElement.ownerDocument?.addEventListener('mouseup', onMouseUp);
    domElement.ownerDocument?.addEventListener('mousemove', onDocumentMove);
    domElement.ownerDocument?.defaultView?.addEventListener('blur', cancelBox);
    function onDocumentMove(event: MouseEvent) { if (drag && event.target !== domElement) updateDrag(event); }
    // Prevent context menu from popping up on right click
    const preventContextMenu = (event: Event) => event.preventDefault();
    domElement.addEventListener('contextmenu', preventContextMenu);
    notifyHistory();

    // ── Public API ───────────────────────────────────────────
    return {
        setColor(hex: string) {
            currentColor = hex;
            const c = new THREE.Color(hex);
            hoverMat.color.copy(c);
            refreshPlacementPreview();
        },
        setBlockType(type: BlockType) {
            currentBlockType = isBlockType(type) ? type : BlockId.Custom;
            refreshPlacementPreview();
        },
        setMode(mode: Tool) {
            cancelBox();
            currentMode = mode;
            hoverMesh.visible = false;
            edgeLines.visible = false;
            eraseHoverMesh.visible = false;
            eraseEdgeLines.visible = false;
        },
        setRotation(rotation: number) {
            currentRotation = ((Math.round(rotation) % 4) + 4) % 4;
            if (lastMouseEvent) onMouseMove(lastMouseEvent);
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
            cancelBox();
            const changes = undoStack.pop();
            if (!changes) return;
            applyChanges(changes, 'before');
            redoStack.push(changes);
            notifyHistory();
        },

        redo() {
            cancelBox();
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
            domElement.ownerDocument?.removeEventListener('keydown', onKeyDown);
            cancelDrag();
            domElement.ownerDocument?.removeEventListener('mouseup', onMouseUp);
            domElement.ownerDocument?.removeEventListener('mousemove', onDocumentMove);
            domElement.ownerDocument?.defaultView?.removeEventListener('blur', cancelBox);
            domElement.removeEventListener('contextmenu', preventContextMenu);
            
            voxels.forEach(mesh => {
                scene.remove(mesh);
                mesh.geometry.dispose();
            });
            voxels.clear();

            blockMaterials.dispose();
            placementPreview.geometry.dispose();
            const ghost = Array.isArray(placementPreview.material) ? placementPreview.material : [placementPreview.material];
            ghost.forEach(material => material.dispose());
            scene.remove(placementPreview);
            undoStack.length = 0;
            redoStack.length = 0;
            blockLights.dispose();
            scene.remove(floorMesh, hoverMesh, edgeLines, eraseHoverMesh, eraseEdgeLines);
            boxGeo.dispose();
            edgeLines.geometry.dispose();
            eraseEdgeLines.geometry.dispose();
            hoverMat.dispose();
            edgeMat.dispose();
            eraseHoverMat.dispose();
            eraseEdgeMat.dispose();
            floorMesh.geometry.dispose();
            (floorMesh.material as THREE.Material).dispose();
        },
    };
}
