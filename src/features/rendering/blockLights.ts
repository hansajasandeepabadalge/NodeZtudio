import * as THREE from 'three';
import { blockEmission, type BlockType, type BlockEmission } from '@/features/voxel/blocks';

// Keep the shader's light count stable as blocks are placed/erased. All light
// blocks remain emissive; the nearest sources get local illumination in large scenes.
export const MAX_BLOCK_LIGHTS = 16;

export function createBlockLights(scene: THREE.Scene) {
    const sources = new Map<string, { position: THREE.Vector3; emission: BlockEmission }>();
    const lights = Array.from({ length: MAX_BLOCK_LIGHTS }, () => {
        const light = new THREE.PointLight(0xffffff, 0, 7, 2);
        light.name = 'Block glow';
        scene.add(light);
        return light;
    });
    const lastCameraPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
    let dirty = true;

    return {
        set(key: string, position: THREE.Vector3, type: BlockType, color: string) {
            const emission = blockEmission(type, color);
            if (emission) sources.set(key, { position: position.clone(), emission });
            else sources.delete(key);
            dirty = true;
        },
        remove(key: string) {
            sources.delete(key);
            dirty = true;
        },
        update(cameraPosition: THREE.Vector3) {
            if (!dirty && (sources.size <= MAX_BLOCK_LIGHTS || lastCameraPosition.equals(cameraPosition))) return;
            const nearest = [...sources.values()];
            if (nearest.length > MAX_BLOCK_LIGHTS) {
                nearest.sort((a, b) => a.position.distanceToSquared(cameraPosition) - b.position.distanceToSquared(cameraPosition));
            }
            lights.forEach((light, index) => {
                const source = nearest[index];
                light.intensity = source?.emission.intensity ?? 0;
                if (source) {
                    light.position.copy(source.position);
                    light.color.set(source.emission.color);
                    light.distance = source.emission.range;
                }
            });
            lastCameraPosition.copy(cameraPosition);
            dirty = false;
        },
        clear() {
            sources.clear();
            lights.forEach(light => { light.intensity = 0; });
            dirty = true;
        },
        dispose() {
            sources.clear();
            lights.forEach(light => { scene.remove(light); light.dispose(); });
        },
    };
}
