// Voxel grid data structure and operations.
import type { Voxel, VoxelMap } from './voxelTypes';

export function createVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

export function addVoxel(grid: VoxelMap, voxel: Voxel): VoxelMap {
    const next = new Map(grid);
    next.set(createVoxelKey(voxel.x, voxel.y, voxel.z), voxel);
    return next;
}

export function removeVoxel(grid: VoxelMap, x: number, y: number, z: number): VoxelMap {
    const next = new Map(grid);
    next.delete(createVoxelKey(x, y, z));
    return next;
}
