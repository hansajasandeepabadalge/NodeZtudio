import * as THREE from 'three';
import { BLOCK_TEXTURE_URLS, blockFaces, blockEmission, type BlockType, type TextureKind } from '@/features/voxel/blocks';

/** Materials belong to the engine, so deleting one block cannot break its neighbors. */
export function createBlockMaterials() {
    const textures = new Map<string, THREE.Texture>();
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const loader = new THREE.TextureLoader();

    const createTexture = (kind: TextureKind) => {
        const texture = loader.load(BLOCK_TEXTURE_URLS[kind]);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        return texture;
    };

    const texturedMaterial = (kind: TextureKind) => {
        let material = materials.get(kind);
        if (!material) {
            const texture = createTexture(kind);
            textures.set(kind, texture);
            material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 });
            materials.set(kind, material);
        }
        return material;
    };

    return {
        get(type: BlockType, color: string): THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] {
            if (type !== 'custom' && type !== 'glow') return blockFaces(type).map(texturedMaterial);
            const key = `${type}:${color.toLowerCase()}`;
            let material = materials.get(key);
            if (!material) {
                material = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
                const emission = blockEmission(type, color);
                if (emission) {
                    material.emissive.set(emission.color);
                    material.emissiveIntensity = emission.emissiveIntensity;
                }
                materials.set(key, material);
            }
            return material;
        },
        dispose() {
            materials.forEach(material => material.dispose());
            textures.forEach(texture => texture.dispose());
            materials.clear();
            textures.clear();
        },
    };
}
