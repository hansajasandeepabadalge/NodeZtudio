'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import ColorPicker from './ColorPicker';
import BlockPicker, { BlockPreview } from './BlockPicker';
import { BLOCKS, type BlockType } from '@/features/voxel/blocks';
import type { Tool } from '@/types/tools';
import EditorIcon, { type EditorIconName } from './EditorIcon';
import { TOOLS } from './editorTools';
import styles from './Sidebar.module.css';

interface SidebarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
    activeColor: string;
    onColorChange: (color: string) => void;
    onResetView: () => void;
    activeBlock: BlockType;
    glowColor: string;
    onBlockSelect: (block: BlockType) => void;
    onGlowColorChange: (color: string) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    showGrid: boolean;
    onToggleGrid: () => void;
    onSave: () => void;
    onLoad: () => void;
    onClear: () => void;
    saveStatus: string;
}

export default function Sidebar(props: SidebarProps) {
    const [panel, setPanel] = useState<'blocks' | 'colors' | null>(null);
    const panelId = useId();
    const colorPanelId = useId();
    const sidebarRef = useRef<HTMLElement>(null);
    const materialButton = useRef<HTMLButtonElement>(null);
    const colorButton = useRef<HTMLButtonElement>(null);
    const closePanel = () => {
        (panel === 'colors' ? colorButton : materialButton).current?.focus();
        setPanel(null);
    };
    const block = BLOCKS.find(block => block.id === props.activeBlock);

    useEffect(() => {
        if (!panel) return;
        const dismiss = (event: PointerEvent) => {
            if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) setPanel(null);
        };
        document.addEventListener('pointerdown', dismiss);
        return () => document.removeEventListener('pointerdown', dismiss);
    }, [panel]);

    return <aside ref={sidebarRef} aria-label="Editor sidebar" className={styles.sidebar}
        onKeyDown={event => { if (event.key === 'Escape' && panel) { event.stopPropagation(); closePanel(); } }}>
        <header className={styles.header}>
            <div className={styles.brandIcon} title="NodeZtudio"><EditorIcon name="cube" size={22} /></div>
        </header>
        <div className={styles.body}>
            <Section title="Tools">
                <div className={styles.toolGrid} role="group" aria-label="Editing tools">
                    {TOOLS.map(item => <button key={item.id} type="button" className={styles.toolButton} aria-label={item.label}
                        aria-pressed={props.activeTool === item.id} title={`${item.label} (${item.key}) — ${item.description}`} onClick={() => props.onToolChange(item.id)}>
                        {item.icon}
                    </button>)}
                </div>
            </Section>
            <Section title="Material">
                <button ref={materialButton} type="button" className={styles.materialButton} aria-label="Choose building material"
                    aria-expanded={panel === 'blocks'} aria-controls={panelId} onClick={() => setPanel(value => value === 'blocks' ? null : 'blocks')} title={`Building blocks: ${block?.label ?? 'Custom Color'}`}>
                    <BlockPreview type={props.activeBlock} color={props.activeBlock === 'glow' ? props.glowColor : props.activeColor} />
                </button>
                <button ref={colorButton} type="button" className={styles.colorButton} aria-label="Open color palette" title={`Paint color: ${props.activeColor.toUpperCase()}`}
                    aria-expanded={panel === 'colors'} aria-controls={colorPanelId} onClick={() => setPanel(value => value === 'colors' ? null : 'colors')}>
                    <span className={styles.colorSwatch} style={{ background: props.activeColor }} />
                </button>
            </Section>
            <Section title="History">
                <div className={styles.actionGrid}>
                    <Action name="undo" label="Undo" shortcut="Ctrl/⌘ Z" disabled={!props.canUndo} onClick={props.onUndo} />
                    <Action name="redo" label="Redo" shortcut="Ctrl/⌘ ⇧ Z" disabled={!props.canRedo} onClick={props.onRedo} />
                </div>
            </Section>
            <Section title="View">
                <div className={styles.actionGrid}>
                    <Action name="grid" label="Grid" shortcut="G" pressed={props.showGrid} onClick={props.onToggleGrid} />
                    <Action name="reset" label="Reset view" shortcut="R" onClick={props.onResetView} />
                </div>
            </Section>
            <Section title="Scene">
                <div className={styles.actionGrid}>
                    <Action name="save" label="Save file" shortcut="Ctrl/⌘ S" onClick={props.onSave} />
                    <Action name="load" label="Open file" onClick={props.onLoad} />
                </div>
                <Action name="clear" label="Clear scene" danger onClick={props.onClear} />
            </Section>
        </div>
        {panel === 'blocks' && <div className={styles.library}><BlockPicker id={panelId} embedded activeBlock={props.activeBlock} activeColor={props.activeColor}
            glowColor={props.glowColor} onSelect={props.onBlockSelect} onGlowColorChange={props.onGlowColorChange} onClose={closePanel} /></div>}
        {panel === 'colors' && <section id={colorPanelId} aria-label="Paint colors" className={`${styles.library} ${styles.colorFlyout}`}>
            <div className={styles.flyoutHeader}><strong>Paint color</strong><button type="button" aria-label="Close color palette" onClick={closePanel}><EditorIcon name="close" size={16} /></button></div>
            <ColorPicker activeColor={props.activeColor} onColorChange={props.onColorChange} />
        </section>}
        <footer className={styles.footer} title={props.saveStatus}>
            <span className={styles.saveDot} data-error={props.saveStatus.includes('unavailable')} />
            <span role="status" className={styles.srOnly}>{props.saveStatus}</span>
        </footer>
    </aside>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return <section className={styles.section} aria-label={title}>{children}</section>;
}

function Action({ name, label, shortcut, onClick, disabled, pressed, danger }: {
    name: EditorIconName; label: string; shortcut?: string; onClick: () => void; disabled?: boolean; pressed?: boolean; danger?: boolean;
}) {
    return <button type="button" className={`${styles.action} ${danger ? styles.danger : ''}`} onClick={onClick} disabled={disabled}
        aria-label={label} aria-pressed={pressed} title={shortcut ? `${label} (${shortcut})` : label}>
        <EditorIcon name={name} size={16} />
    </button>;
}
