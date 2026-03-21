// Shared tool types — import from here across the app.
import type { ReactNode } from 'react';

export type Tool = 'select' | 'draw' | 'erase' | 'fill';

export interface ToolDef {
    id: Tool;
    label: string;
    key: string;
    icon: ReactNode;
}
