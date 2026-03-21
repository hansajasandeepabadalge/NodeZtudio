import * as THREE from 'three';

/** Faint minor grid lines covering `size × size` units. */
export function createGridHelper(size: number): THREE.GridHelper {
    const grid = new THREE.GridHelper(size, size, 0x000001, 0xffffff);
    (grid.material as THREE.LineBasicMaterial).opacity = 0.15;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    return grid;
}

/** Brighter X/Z center axis lines drawn over the grid. */
export function createAxisLines(size: number): THREE.LineSegments {
    const half = size / 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, 0,     0),
        new THREE.Vector3( half, 0,     0),
        new THREE.Vector3(    0, 0, -half),
        new THREE.Vector3(    0, 0,  half),
    ]);
    const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.4,
        transparent: true,
    });
    return new THREE.LineSegments(geometry, material);
}
