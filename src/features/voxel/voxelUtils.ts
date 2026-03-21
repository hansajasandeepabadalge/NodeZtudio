// Utility helpers for voxel processing (flood-fill, neighbour queries, etc.).
import type { VoxelMap } from './voxelTypes';
import { createVoxelKey } from './voxelGrid';

export function hasVoxel(grid: VoxelMap, x: number, y: number, z: number): boolean {
    return grid.has(createVoxelKey(x, y, z));
}
