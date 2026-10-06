import * as THREE from 'three';
import { daylightAt, wrapTime } from '@/features/rendering/dayNight';
import { DEFAULT_LIGHTING, SETTINGS } from '@/common/settings';

/** Balanced daylight and soft fill keep pixel textures visible on shaded faces. */
export function addSceneLighting(scene: THREE.Scene) {
    const { colors, intensity, orbit, ground: groundSettings } = SETTINGS.lighting;
    const sky = new THREE.HemisphereLight(colors.dayFill, colors.groundFill, intensity.skyNight + intensity.skyDayGain);
    const sun = new THREE.DirectionalLight(colors.noonSun, intensity.sun);
    sun.castShadow = true;
    sun.shadow.mapSize.set(SETTINGS.shadows.mapSize, SETTINGS.shadows.mapSize);
    Object.assign(sun.shadow.camera, SETTINGS.shadows.camera);
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = SETTINGS.shadows.bias;
    sun.shadow.normalBias = SETTINGS.shadows.normalBias;
    sun.shadow.radius = SETTINGS.shadows.radius;

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(groundSettings.size, groundSettings.size),
        new THREE.MeshStandardMaterial({ color: colors.daySky, roughness: SETTINGS.blocks.roughness, metalness: SETTINGS.blocks.metalness }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundSettings.y;
    ground.receiveShadow = true;

    const moon = new THREE.DirectionalLight(colors.moon, intensity.moon);
    const fill = new THREE.DirectionalLight(colors.dayBounce, intensity.fillNight + intensity.fillDayGain);
    fill.position.set(...SETTINGS.lighting.fillPosition);
    const nightSky = new THREE.Color(colors.nightSky);
    const daySky = new THREE.Color(colors.daySky);
    const sunsetSky = new THREE.Color(colors.sunsetSky);
    const nightFill = new THREE.Color(colors.nightFill);
    const dayFill = new THREE.Color(colors.dayFill);
    const nightBounce = new THREE.Color(colors.nightBounce);
    const dayBounce = new THREE.Color(colors.dayBounce);
    const warmSun = new THREE.Color(colors.warmSun);
    const noonSun = new THREE.Color(colors.noonSun);
    const background = new THREE.Color();
    scene.background = background;
    scene.add(sky, sun, moon, fill, ground);

    const update = (time: number, brightness: number) => {
        const angle = (wrapTime(time) - SETTINGS.lighting.sunrise) / SETTINGS.lighting.hoursPerDay * Math.PI * 2;
        const elevation = Math.sin(angle);
        const daylight = daylightAt(time);
        const twilight = daylight * (1 - Math.max(0, Math.min(1, elevation / SETTINGS.lighting.twilightElevation)));
        const strength = Math.max(SETTINGS.lighting.minBrightness, Math.min(SETTINGS.lighting.maxBrightness, brightness));
        background.copy(nightSky).lerp(daySky, daylight).lerp(sunsetSky, twilight * SETTINGS.lighting.sunsetBlend);
        sky.color.copy(nightFill).lerp(dayFill, daylight);
        sky.intensity = (intensity.skyNight + daylight * intensity.skyDayGain) * strength;
        fill.color.copy(nightBounce).lerp(dayBounce, daylight);
        fill.intensity = (intensity.fillNight + daylight * intensity.fillDayGain) * strength;
        sun.color.copy(warmSun).lerp(noonSun, Math.max(0, elevation));
        sun.intensity = intensity.sun * daylight * strength;
        // Rotate the original orbit 90 degrees: sunrise and sunset now cross the X axis.
        sun.position.set(orbit.radiusX * Math.cos(angle) + orbit.offsetX, Math.max(orbit.minHeight, elevation * orbit.sunHeight), orbit.radiusZ * Math.sin(angle));
        moon.position.set(-sun.position.x, Math.max(orbit.minHeight, -elevation * orbit.moonHeight), -sun.position.z);
        moon.intensity = intensity.moon * (1 - daylight) * strength;
    };
    update(DEFAULT_LIGHTING.time, DEFAULT_LIGHTING.brightness);

    const dispose = () => {
        scene.remove(sky, sun, moon, fill, ground);
        sun.shadow.dispose();
        ground.geometry.dispose();
        ground.material.dispose();
    };
    return { update, dispose };
}
