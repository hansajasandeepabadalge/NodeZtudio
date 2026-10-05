import * as THREE from 'three';
import { daylightAt, wrapTime } from '@/features/rendering/dayNight';

/** Warm daylight and a matte ground for the miniature diorama look. */
export function addSceneLighting(scene: THREE.Scene) {
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

    const moon = new THREE.DirectionalLight('#9ebaff', 0.35);
    moon.position.set(18, 25, -12);
    const nightSky = new THREE.Color('#101a30');
    const daySky = new THREE.Color('#bdb299');
    const sunsetSky = new THREE.Color('#b78169');
    const nightFill = new THREE.Color('#748bb6');
    const dayFill = new THREE.Color('#e7efff');
    const warmSun = new THREE.Color('#ffad66');
    const noonSun = new THREE.Color('#fff0d2');
    const background = new THREE.Color();
    scene.background = background;
    scene.add(sky, sun, moon, ground);

    const update = (time: number, brightness: number) => {
        const angle = (wrapTime(time) - 6) / 24 * Math.PI * 2;
        const elevation = Math.sin(angle);
        const daylight = daylightAt(time);
        const twilight = daylight * (1 - Math.max(0, Math.min(1, elevation / 0.5)));
        const strength = Math.max(0.25, Math.min(2, brightness));
        background.copy(nightSky).lerp(daySky, daylight).lerp(sunsetSky, twilight * 0.6);
        sky.color.copy(nightFill).lerp(dayFill, daylight);
        sky.intensity = (0.32 + daylight * 0.78) * strength;
        sun.color.copy(warmSun).lerp(noonSun, Math.max(0, elevation));
        sun.intensity = 3 * daylight * strength;
        sun.position.set(-18 * Math.sin(angle), Math.max(3, elevation * 30), 28 * Math.cos(angle) + 12);
        moon.intensity = 0.35 * (1 - daylight) * strength;
    };
    update(12, 1);

    const dispose = () => {
        scene.remove(sky, sun, moon, ground);
        sun.shadow.dispose();
        ground.geometry.dispose();
        ground.material.dispose();
    };
    return { update, dispose };
}
