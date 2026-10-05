// Shared tool types — import from here across the app.
import type { ReactNode } from 'react';

export const TOOL_IDS = ['select', 'draw', 'paint', 'erase', 'fill', 'pick'] as const;
export type Tool = typeof TOOL_IDS[number];

export function isTool(value: unknown): value is Tool {
    return TOOL_IDS.some(tool => tool === value);
}

export interface ToolDef {
    id: Tool;
    label: string;
    key: string;
    description: string;
    icon: ReactNode;
}
