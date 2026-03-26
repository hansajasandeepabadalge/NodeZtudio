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
    // Soft ambient — base brightness
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);

    // Main sun — angled from above-right matching the isometric camera position
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(10, 20, 15);

    // Cool fill from below-left — makes back/bottom faces visibly darker but not black
    const fill = new THREE.DirectionalLight(0x8899cc, 0.25);
    fill.position.set(-10, 5, -10);

    scene.add(ambient, sun, fill);
}
