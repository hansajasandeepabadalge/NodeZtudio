import { ToolId } from '@/common/enums';
import { SETTINGS } from '@/common/settings';
import type { ToolDef } from '@/types/tools';
import EditorIcon from './EditorIcon';

export const TOOLS: ToolDef[] = [
    { id: ToolId.Rotate, label: 'Rotate object', key: 'T', description: 'Click an object to turn it 90°. Shift-click turns it back.', icon: <EditorIcon name="rotate" /> },
    { id: ToolId.Move, label: 'Move object', key: 'M', description: 'Drag an object across the grid at its current height. Esc or right-click cancels.', icon: <EditorIcon name="move" /> },
    { id: ToolId.Select, label: 'Navigate', key: SETTINGS.shortcuts.tools[ToolId.Select], description: 'Orbit the scene. Right-drag to pan and scroll to zoom.', icon: <EditorIcon name={ToolId.Select} /> },
    { id: ToolId.Draw, label: 'Build', key: SETTINGS.shortcuts.tools[ToolId.Draw], description: 'Place the selected block on the grid or beside another block.', icon: <EditorIcon name={ToolId.Draw} /> },
    { id: ToolId.Box, label: 'Box Build', key: SETTINGS.shortcuts.tools[ToolId.Box], description: 'Click two opposite corners to add blocks throughout the box. Existing blocks are kept. Esc or right-click cancels.', icon: <EditorIcon name={ToolId.Box} /> },
    { id: ToolId.Paint, label: 'Paint', key: SETTINGS.shortcuts.tools[ToolId.Paint], description: 'Replace one block with the selected material and color.', icon: <EditorIcon name={ToolId.Paint} /> },
    { id: ToolId.Erase, label: 'Erase', key: SETTINGS.shortcuts.tools[ToolId.Erase], description: 'Remove the block you click.', icon: <EditorIcon name={ToolId.Erase} /> },
    { id: ToolId.BoxErase, label: 'Box Erase', key: SETTINGS.shortcuts.tools[ToolId.BoxErase], description: 'Click two opposite corners to remove every block inside the box. Esc or right-click cancels.', icon: <EditorIcon name={ToolId.BoxErase} /> },
    { id: ToolId.Fill, label: 'Fill', key: SETTINGS.shortcuts.tools[ToolId.Fill], description: 'Replace connected blocks that share the clicked material and color.', icon: <EditorIcon name={ToolId.Fill} /> },
    { id: ToolId.Pick, label: 'Sample', key: SETTINGS.shortcuts.tools[ToolId.Pick], description: 'Sample a block’s material and color, then continue building.', icon: <EditorIcon name={ToolId.Pick} /> },
];
