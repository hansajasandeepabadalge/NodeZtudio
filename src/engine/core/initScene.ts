import * as THREE from 'three';
import { SETTINGS, FRUSTUM_SIZE } from '@/common/settings';

export { FRUSTUM_SIZE } from '@/common/settings';
export const DEFAULT_ZOOM = SETTINGS.camera.zoom;
export const DEFAULT_POS = new THREE.Vector3(...SETTINGS.camera.position);
export const DEFAULT_TARGET = new THREE.Vector3(...SETTINGS.camera.target);

/** Creates and returns a configured Three.js Scene. */
export function createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(SETTINGS.lighting.colors.daySky);
    return scene;
}

/** Creates and sizes a WebGLRenderer to fit the given mount element. */
export function createRenderer(mount: HTMLDivElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: SETTINGS.renderer.antialias });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, SETTINGS.renderer.maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = SETTINGS.renderer.exposure;
    renderer.shadowMap.enabled = SETTINGS.renderer.shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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
        SETTINGS.camera.near,
        SETTINGS.camera.far,
    );
    camera.position.copy(DEFAULT_POS);
    camera.zoom = SETTINGS.camera.zoom;
    camera.updateProjectionMatrix();
    camera.lookAt(DEFAULT_TARGET);
    return camera;
}
