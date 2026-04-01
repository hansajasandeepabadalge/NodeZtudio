import * as THREE from 'three';

/**
 * Adds a three-point lighting rig to the scene — tuned for an isometric
 * voxel editor so faces show distinct shading without needing expensive
 * shadow maps.
 *
 *  • Ambient  — raises the darkness floor so no face is pitch-black
 *  • Sun      — strong directional from top-front-right, gives the main highlight
 *  • Fill     — weak cool-toned light from the opposite low angle, separates
 *               back faces from black
 */
export function addSceneLighting(scene: THREE.Scene): void {
    // Strong ambient — ensures the chosen color is always clearly visible on all faces
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);

    // Main sun — angled from above-right matching the isometric camera position
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(10, 20, 15);

    // Cool fill from below-left — subtle face separation without heavy darkening
    const fill = new THREE.DirectionalLight(0x99aadd, 0.4);
    fill.position.set(-10, 5, -10);

    scene.add(ambient, sun, fill);
}
