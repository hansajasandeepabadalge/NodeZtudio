import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DEFAULT_TARGET } from '@/engine/core/initScene';

/**
 * Creates OrbitControls with damping and screen-space panning,
 * targeted at the scene origin.
 */
export function createOrbitControls(
    camera: THREE.Camera,
    domElement: HTMLElement,
): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping    = true;
    controls.dampingFactor    = 0.08;
    controls.screenSpacePanning = true;
    controls.target.copy(DEFAULT_TARGET);
    controls.update();
    return controls;
}
