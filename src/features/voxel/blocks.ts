export const DEFAULT_GLOW_COLOR = '#ffad42';

export const BLOCKS = [
    { id: 'grass', label: 'Grass', color: '#648b38', description: 'Green grass top with earthy dirt sides.' },
    { id: 'dirt', label: 'Dirt', color: '#896344', description: 'Speckled brown soil for terrain and foundations.' },
    { id: 'stone', label: 'Stone', color: '#92958c', description: 'Rough gray stone for walls and paths.' },
    { id: 'sand', label: 'Sand', color: '#d8c58d', description: 'Warm, pale sand for beaches and deserts.' },
    { id: 'log', label: 'Wood Log', color: '#705038', description: 'Vertical bark sides and growth rings on the ends.' },
    { id: 'planks', label: 'Wood Planks', color: '#b38b55', description: 'Timber boards for floors, roofs, and walls.' },
    { id: 'leaves', label: 'Oak Leaves', color: '#6b9f43', description: 'Green oak foliage with transparent gaps for tree canopies.' },
    { id: 'custom', label: 'Custom Color', color: '#95704b', description: 'A solid block using your selected paint color.' },
    { id: 'glow', label: 'Glow Block', color: DEFAULT_GLOW_COLOR, description: 'A solid glowing block. Choose any glow color below.' },
] as const;

export type BlockType = typeof BLOCKS[number]['id'];

/** Public assets shared by the scene materials and the block picker. */
export const BLOCK_TEXTURE_URLS = {
    grass_block_top: '/textures/grass_block_top.png',
    grass_block_side: '/textures/grass_block_side.png',
    dirt: '/textures/dirt.png',
    stone: '/textures/stone.png',
    sand: '/textures/sand.png',
    log_oak: '/textures/log_oak.png',
    log_oak_top: '/textures/log_oak_top.png',
    planks_oak: '/textures/planks_oak.png',
    leaves_oak: '/textures/leaves_oak.png',
} as const;

export type TextureKind = keyof typeof BLOCK_TEXTURE_URLS;

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

export function blockEmission(type: BlockType, color = DEFAULT_GLOW_COLOR): BlockEmission | undefined {
    return type === 'glow' ? { color, intensity: 3, range: 4, emissiveIntensity: 1.6 } : undefined;
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

const BLOCK_FACE_TEXTURES: Record<Exclude<BlockType, 'custom' | 'glow'>, {
    side: TextureKind;
    top?: TextureKind;
    bottom?: TextureKind;
}> = {
    grass: { side: 'grass_block_side', top: 'grass_block_top', bottom: 'dirt' },
    log: { side: 'log_oak', top: 'log_oak_top' },
    planks: { side: 'planks_oak' },
    leaves: { side: 'leaves_oak' },
    dirt: { side: 'dirt' },
    stone: { side: 'stone' },
    sand: { side: 'sand' },
};

/** BoxGeometry order: right, left, top, bottom, front, back. Bottom defaults to top. */
export function blockFaces(type: BlockType): TextureKind[] | undefined {
    if (!Object.hasOwn(BLOCK_FACE_TEXTURES, type)) return undefined;
    const { side, top = side, bottom = top } = BLOCK_FACE_TEXTURES[type as keyof typeof BLOCK_FACE_TEXTURES];
    return [side, side, top, bottom, side, side];
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
