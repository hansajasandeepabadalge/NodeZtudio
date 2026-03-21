// Shared tool types — import from here across the app.
export type Tool = 'select' | 'draw' | 'erase' | 'fill';

export interface ToolDef {
    id: Tool;
    label: string;
    key: string;
}
