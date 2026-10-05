export const DEFAULT_GLOW_COLOR = '#ffad42';

export const BLOCKS = [
    { id: 'grass', label: 'Grass', color: '#648b38', description: 'Green grass top with earthy dirt sides.' },
    { id: 'dirt', label: 'Dirt', color: '#896344', description: 'Speckled brown soil for terrain and foundations.' },
    { id: 'stone', label: 'Stone', color: '#92958c', description: 'Rough gray stone for walls and paths.' },
    { id: 'sand', label: 'Sand', color: '#d8c58d', description: 'Warm, pale sand for beaches and deserts.' },
    { id: 'log', label: 'Wood Log', color: '#705038', description: 'Vertical bark sides and growth rings on the ends.' },
    { id: 'planks', label: 'Wood Planks', color: '#b38b55', description: 'Timber boards for floors, roofs, and walls.' },
    { id: 'custom', label: 'Custom Color', color: '#95704b', description: 'A solid block using your selected paint color.' },
    { id: 'glow', label: 'Glow Block', color: DEFAULT_GLOW_COLOR, description: 'A solid glowing block. Choose any glow color below.' },
] as const;

export type BlockType = typeof BLOCKS[number]['id'];
export type TextureKind = 'grass-top' | 'grass-side' | 'dirt' | 'stone' | 'sand' | 'bark' | 'rings' | 'planks';

export interface BlockEmission {
    color: string;
    intensity: number;
    range: number;
    emissiveIntensity: number;
}

// Older scene files used fixed-color framed lamps. Migrate them to solid glow blocks.
const LEGACY_LIGHT_COLORS = {
    'amber-light': '#ffad42',
    'cyan-light': '#40eaff',
    'jade-light': '#73ff9e',
    'portal-light': '#ffc5ff',
};

export function isLightBlock(type: string): type is 'glow' {
    return type === 'glow';
}

export function blockEmission(type: BlockType, color = DEFAULT_GLOW_COLOR): BlockEmission | undefined {
    return isLightBlock(type) ? { color, intensity: 3, range: 4, emissiveIntensity: 1.6 } : undefined;
}

export interface VoxelData {
    x: number;
    y: number;
    z: number;
    color: string;
    blockType?: BlockType;
}

export function isBlockType(value: unknown): value is BlockType {
    return BLOCKS.some(block => block.id === value);
}

/** BoxGeometry order: right, left, top, bottom, front, back. */
export function blockFaces(type: Exclude<BlockType, 'custom' | 'glow'>): TextureKind[] {
    switch (type) {
        case 'grass': return ['grass-side', 'grass-side', 'grass-top', 'dirt', 'grass-side', 'grass-side'];
        case 'log': return ['bark', 'bark', 'rings', 'rings', 'bark', 'bark'];
        default: return Array<TextureKind>(6).fill(type);
    }
}

const TEXTURE_PALETTES: Record<TextureKind, readonly string[]> = {
    'grass-top': ['#648b38', '#749947', '#557b30', '#88a853'],
    'grass-side': ['#896344', '#a17b55', '#735035', '#b18c64'],
    dirt: ['#896344', '#a17b55', '#735035', '#b18c64'],
    stone: ['#92958c', '#a3a59d', '#7d8179', '#b3b5ad'],
    sand: ['#d8c58d', '#e3d29e', '#c5b27d', '#ecddb0'],
    bark: ['#705038', '#856141', '#533d2b', '#98744d'],
    rings: ['#b38b55', '#c9a56e', '#8f683f', '#d9b881'],
    planks: ['#b38b55', '#c19a64', '#8b663e', '#cfaa75'],
};

/** Original, deterministic 16px textures, shared by the renderer and block picker. */
export function blockTexturePixels(kind: TextureKind): Uint8Array {
    const pixels = new Uint8Array(16 * 16 * 4);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const hash = ((x * 374761393 + y * 668265263 + 1274126177) ^ (x * y * 1013)) >>> 0;
            let palette = TEXTURE_PALETTES[kind];
            let shade = (hash >>> 8) % 4;
            if (kind === 'grass-side' && y < 3 + (x % 3)) palette = TEXTURE_PALETTES['grass-top'];
            if (kind === 'bark') shade = x % 4 === 0 ? 2 : (x + Math.floor(y / 5)) % 4;
            if (kind === 'rings') shade = Math.floor(Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5))) % 3;
            if (kind === 'planks') {
                const seam = y % 4 === 0 || (x === (Math.floor(y / 4) % 2 === 0 ? 4 : 12));
                shade = seam ? 2 : (hash >>> 8) % 2;
            }
            const rgb = Number.parseInt(palette[shade].slice(1), 16);
            const offset = (y * 16 + x) * 4;
            pixels[offset] = (rgb >>> 16) & 255;
            pixels[offset + 1] = (rgb >>> 8) & 255;
            pixels[offset + 2] = rgb & 255;
            pixels[offset + 3] = 255;
        }
    }
    return pixels;
}

/** Validate before replacing a scene, retaining support for old solid-color saves. */
export function parseVoxels(data: unknown): VoxelData[] {
    if (!Array.isArray(data)) throw new Error('Expected a voxel array.');
    return data.map(value => {
        if (!value || typeof value !== 'object') throw new Error('Invalid voxel.');
        const { x, y, z, color, blockType } = value;
        const legacyColor = typeof blockType === 'string' && Object.hasOwn(LEGACY_LIGHT_COLORS, blockType)
            ? LEGACY_LIGHT_COLORS[blockType as keyof typeof LEGACY_LIGHT_COLORS] : undefined;
        if (![x, y, z].every(coordinate => typeof coordinate === 'number' && Number.isFinite(coordinate)) ||
            typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color) ||
            (blockType !== undefined && !isBlockType(blockType) && !legacyColor)) {
            throw new Error('Invalid voxel data.');
        }
        return { x, y, z, color: legacyColor ?? color, blockType: legacyColor ? 'glow' : blockType ?? 'custom' };
    });
}
