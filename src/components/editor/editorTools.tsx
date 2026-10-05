import type { ToolDef } from '@/types/tools';
import EditorIcon from './EditorIcon';

export const TOOLS: ToolDef[] = [
    { id: 'select', label: 'Navigate', key: 'V', description: 'Orbit the scene. Right-drag to pan and scroll to zoom.', icon: <EditorIcon name="select" /> },
    { id: 'draw', label: 'Build', key: 'B', description: 'Place the selected block on the grid or beside another block.', icon: <EditorIcon name="draw" /> },
    { id: 'paint', label: 'Paint', key: 'P', description: 'Replace one block with the selected material and color.', icon: <EditorIcon name="paint" /> },
    { id: 'erase', label: 'Erase', key: 'E', description: 'Remove the block you click.', icon: <EditorIcon name="erase" /> },
    { id: 'fill', label: 'Fill', key: 'F', description: 'Replace connected blocks that share the clicked material and color.', icon: <EditorIcon name="fill" /> },
    { id: 'pick', label: 'Sample', key: 'I', description: 'Sample a block’s material and color, then continue building.', icon: <EditorIcon name="pick" /> },
];
