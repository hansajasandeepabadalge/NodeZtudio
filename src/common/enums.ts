/** Stable strings used by UI state, tools, materials, and saved scenes. */
export enum ToolId {
    Select = 'select',
    Draw = 'draw',
    Paint = 'paint',
    Erase = 'erase',
    Fill = 'fill',
    Pick = 'pick',
}

export enum BlockId {
    Grass = 'grass',
    Dirt = 'dirt',
    Stone = 'stone',
    Sand = 'sand',
    Log = 'log',
    Planks = 'planks',
    Leaves = 'leaves',
    Custom = 'custom',
    Glow = 'glow',
}

export enum TextureId {
    GrassTop = 'grass_block_top',
    GrassSide = 'grass_block_side',
    Dirt = 'dirt',
    Stone = 'stone',
    Sand = 'sand',
    LogSide = 'log_oak',
    LogTop = 'log_oak_top',
    Planks = 'planks_oak',
    Leaves = 'leaves_oak',
}

export enum SidebarPanel {
    Blocks = 'blocks',
    Colors = 'colors',
}

export enum ButtonVariant {
    Primary = 'primary',
    Ghost = 'ghost',
    Danger = 'danger',
}

export enum SaveStatus {
    Enabled = 'Autosave on',
    Saved = 'Saved locally',
    Restored = 'Restored locally',
    Unavailable = 'Local save unavailable',
}
