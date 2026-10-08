import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { isDoor, type BlockType } from '@/features/voxel/blocks';

/** Keep the mesh origin at the lower cell so saved coordinates remain stable. */
export function createBlockGeometry(type: BlockType) {
    if (!isDoor(type)) return new THREE.BoxGeometry(1, 1, 1);
    const halves = [0, 1].map(half => {
        const geometry = new THREE.BoxGeometry(1, 1, 3 / 16);
        const uv = geometry.getAttribute('uv');
        // Thin edges sample solid edge strips instead of stretching the windows.
        for (let face = 0; face < 4; face++) {
            for (let vertex = face * 4; vertex < face * 4 + 4; vertex++) {
                if (face < 2) uv.setX(vertex, uv.getX(vertex) * 3 / 16);
                else uv.setY(vertex, face === 2 ? 1 - uv.getY(vertex) / 16 : uv.getY(vertex) / 16);
            }
        }
        geometry.translate(0, half, -13 / 32);
        return geometry;
    });
    const geometry = mergeGeometries(halves)!;
    halves.forEach((half, index) => {
        half.groups.forEach(group => geometry.addGroup(group.start + index * 36, group.count, group.materialIndex! + index * 6));
        half.dispose();
    });
    return geometry;
}
