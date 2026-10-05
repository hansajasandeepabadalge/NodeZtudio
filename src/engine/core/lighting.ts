import * as THREE from 'three';

/** Warm daylight and a matte ground for the miniature diorama look. */
export function addSceneLighting(scene: THREE.Scene): () => void {
    const sky = new THREE.HemisphereLight('#e7efff', '#82704f', 1.1);
    const sun = new THREE.DirectionalLight('#fff0d2', 3);
    sun.position.set(-18, 30, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
        left: -24, right: 24, top: 32, bottom: -24, near: 0.5, far: 100,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 2;

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshStandardMaterial({ color: '#bdb299', roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;

    scene.add(sky, sun, ground);
    return () => {
        scene.remove(sky, sun, ground);
        sun.shadow.dispose();
        ground.geometry.dispose();
        ground.material.dispose();
    };
}
