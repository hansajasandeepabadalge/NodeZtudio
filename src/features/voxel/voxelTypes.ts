// Core voxel type definitions.
// Move voxel-related types here from src/types/voxel.ts as they get fleshed out.

export interface Voxel {
    x: number;
    y: number;
    z: number;
    color: string;
}

export type VoxelMap = Map<string, Voxel>;
