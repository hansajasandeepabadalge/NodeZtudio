// Shared voxel types — import from here across the app.
export interface Voxel {
    x: number;
    y: number;
    z: number;
    color: string;
}

export type VoxelMap = Map<string, Voxel>;
