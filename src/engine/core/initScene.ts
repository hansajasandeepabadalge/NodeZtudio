import * as THREE from 'three';

export const FRUSTUM_SIZE  = 20;
export const DEFAULT_ZOOM  = 1;
export const DEFAULT_POS   = new THREE.Vector3(20, 20, 20);
export const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

/** Creates and returns a configured Three.js Scene. */
export function createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00b4ff);
    return scene;
}

/** Creates and sizes a WebGLRenderer to fit the given mount element. */
export function createRenderer(mount: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    return renderer;
}

/** Creates an OrthographicCamera sized to the mount element. */
export function createCamera(mount: HTMLDivElement): THREE.OrthographicCamera {
    const aspect = mount.clientWidth / mount.clientHeight;
    const camera = new THREE.OrthographicCamera(
        -FRUSTUM_SIZE * aspect,
         FRUSTUM_SIZE * aspect,
         FRUSTUM_SIZE,
        -FRUSTUM_SIZE,
        -100,
        1000,
    );
    camera.position.copy(DEFAULT_POS);
    camera.lookAt(DEFAULT_TARGET);
    return camera;
}
