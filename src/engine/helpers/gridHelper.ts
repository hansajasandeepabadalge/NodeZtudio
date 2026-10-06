import * as THREE from 'three';
import { SETTINGS } from '@/common/settings';

/** Faint minor grid lines covering `size × size` units. */
export function createGridHelper(size: number): THREE.GridHelper {
    const grid = new THREE.GridHelper(size, size, SETTINGS.grid.centerColor, SETTINGS.grid.lineColor);
    (grid.material as THREE.LineBasicMaterial).opacity = SETTINGS.grid.lineOpacity;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    return grid;
}

/** Brighter X/Z center axis lines drawn over the grid. */
export function createAxisLines(size: number): THREE.LineSegments {
    const half = size / 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-half, 0, 0),
        new THREE.Vector3(half, 0, 0),
        new THREE.Vector3(0, 0, -half),
        new THREE.Vector3(0, 0, half),
    ]);
    const material = new THREE.LineBasicMaterial({
        color: SETTINGS.grid.centerColor,
        opacity: SETTINGS.grid.axisOpacity,
        transparent: true,
    });
    return new THREE.LineSegments(geometry, material);
}
