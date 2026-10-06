import { BlockId, TextureId } from '@/common/enums';
import { DEFAULT_COLOR, DEFAULT_GLOW_COLOR, SETTINGS } from '@/common/settings';
export { DEFAULT_GLOW_COLOR } from '@/common/settings';

export const BLOCKS = [
    { id: BlockId.Grass, label: 'Grass', color: SETTINGS.blocks.colors.grass, description: 'Green grass top with earthy dirt sides.' },
    { id: BlockId.Dirt, label: 'Dirt', color: SETTINGS.blocks.colors.dirt, description: 'Speckled brown soil for terrain and foundations.' },
    { id: BlockId.Stone, label: 'Stone', color: SETTINGS.blocks.colors.stone, description: 'Rough gray stone for walls and paths.' },
    { id: BlockId.Sand, label: 'Sand', color: SETTINGS.blocks.colors.sand, description: 'Warm, pale sand for beaches and deserts.' },
    { id: BlockId.Log, label: 'Wood Log', color: SETTINGS.blocks.colors.log, description: 'Vertical bark sides and growth rings on the ends.' },
    { id: BlockId.Planks, label: 'Wood Planks', color: SETTINGS.blocks.colors.planks, description: 'Timber boards for floors, roofs, and walls.' },
    { id: BlockId.Leaves, label: 'Oak Leaves', color: SETTINGS.blocks.colors.leaves, description: 'Green oak foliage with transparent gaps for tree canopies.' },
    { id: BlockId.Custom, label: 'Custom Color', color: DEFAULT_COLOR, description: 'A solid block using your selected paint color.' },
    { id: BlockId.Glow, label: 'Glow Block', color: DEFAULT_GLOW_COLOR, description: 'A solid glowing block. Choose any glow color below.' },
] as const;

export type BlockType = `${BlockId}`;

/** Public assets shared by the scene materials and the block picker. */
export const BLOCK_TEXTURE_URLS: Record<TextureKind, string> = SETTINGS.blocks.textures;

export type TextureKind = `${TextureId}`;

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
    return type === BlockId.Glow ? { color, ...SETTINGS.blocks.emission } : undefined;
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

const BLOCK_FACE_TEXTURES: Record<Exclude<BlockType, `${BlockId.Custom | BlockId.Glow}`>, {
    side: TextureKind;
    top?: TextureKind;
    bottom?: TextureKind;
}> = {
    [BlockId.Grass]: { side: TextureId.GrassSide, top: TextureId.GrassTop, bottom: TextureId.Dirt },
    [BlockId.Log]: { side: TextureId.LogSide, top: TextureId.LogTop },
    [BlockId.Planks]: { side: TextureId.Planks },
    [BlockId.Leaves]: { side: TextureId.Leaves },
    [BlockId.Dirt]: { side: TextureId.Dirt },
    [BlockId.Stone]: { side: TextureId.Stone },
    [BlockId.Sand]: { side: TextureId.Sand },
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
        return { x, y, z, color: legacyColor ?? color, blockType: legacyColor ? BlockId.Glow : blockType ?? BlockId.Custom };
    });
}
