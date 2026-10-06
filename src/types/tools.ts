// Shared tool types — import from here across the app.
import type { ReactNode } from 'react';
import { ToolId } from '@/common/enums';

export const TOOL_IDS = Object.values(ToolId);
export type Tool = `${ToolId}`;

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
