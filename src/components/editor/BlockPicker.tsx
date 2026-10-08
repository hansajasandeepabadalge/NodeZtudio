'use client';

import { BlockId } from '@/common/enums';

import { memo, useMemo, useState } from 'react';
import { BLOCKS, BLOCK_TEXTURE_URLS, MINECRAFT_PACK, blockFaces, blockEmission, doorTextures, textureSettings, type BlockType, type TextureKind } from '@/features/voxel/blocks';
import { GLASS, TEXT_COLOR } from '@/common/settings';

function Face({ kind, color }: { kind?: TextureKind; color: string }) {
    const url = kind && BLOCK_TEXTURE_URLS[kind];
    if (url) return <image href={url} width="16" height="16" preserveAspectRatio="none" style={{ imageRendering: 'pixelated' }} />;
    return <path fill={color} d="M0 0h16v16H0z" />;
}

export function BlockPreview({ type, color }: { type: BlockType; color: string }) {
    const door = doorTextures(type);
    const doorColor = door ? textureSettings(door.lower)?.color ?? color : color;
    if (door) return (
        <svg aria-hidden="true" width="48" height="44" viewBox="0 0 48 44">
            <g transform="matrix(1 .5 0 1 14 2)">
                <Face kind={door.upper} color={color} />
                <g transform="translate(0 16)"><Face kind={door.lower} color={color} /></g>
            </g>
            <path d="M30 10l3-1.5v32L30 42z" fill={doorColor} />
            <path d="M14 2l3-1.5 16 8L30 10z" fill={doorColor} />
            <path d="M30 10l3-1.5v32L30 42z" fill="#000" opacity=".25" />
        </svg>
    );
    const faces = type === BlockId.Custom || type === BlockId.Glow ? undefined : blockFaces(type);
    const emission = blockEmission(type, color);
    return (
        <svg aria-hidden="true" width="48" height="44" viewBox="0 0 48 44"
            style={{ overflow: 'visible', filter: emission ? `drop-shadow(0 0 3px ${emission.color}66)` : undefined }}>
            <g transform="matrix(1 .5 -1 .5 24 2)"><Face kind={faces?.[2]} color={color} /></g>
            <g transform="matrix(1 .5 0 1.25 8 10)" style={type === BlockId.Leaves ? { filter: 'brightness(0.88)' } : undefined}>
                <Face kind={faces?.[4]} color={color} />
                {type !== BlockId.Leaves && <path fill="#000" opacity=".12" d="M0 0h16v16H0z" />}
            </g>
            <g transform="matrix(1 -.5 0 1.25 24 18)" style={type === BlockId.Leaves ? { filter: 'brightness(0.75)' } : undefined}>
                <Face kind={faces?.[0]} color={color} />
                {type !== BlockId.Leaves && <path fill="#000" opacity=".25" d="M0 0h16v16H0z" />}
            </g>
        </svg>
    );
}

interface Props {
    id: string;
    activeBlock: BlockType;
    activeColor: string;
    glowColor: string;
    onSelect: (block: BlockType) => void;
    onGlowColorChange: (color: string) => void;
    onClose: () => void;
    embedded?: boolean;
}

const BlockPicker = memo(function BlockPicker({ id, activeBlock, activeColor, glowColor, onSelect, onGlowColorChange, onClose, embedded = false }: Props) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('All blocks');
    const [page, setPage] = useState(0);
    const categories = useMemo(() => ['All blocks', ...new Set(BLOCKS.map(block => block.category))], []);
    const matches = useMemo(() => {
        const search = query.trim().toLowerCase();
        return BLOCKS.filter(block => (category === 'All blocks' ? block.category !== 'Texture Variants' || search.length > 0 : block.category === category)
            && (!search || `${block.label} ${block.id}`.toLowerCase().includes(search)));
    }, [query, category]);
    const pageSize = 48;
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    const visibleBlocks = matches.slice(page * pageSize, (page + 1) * pageSize);
    const inputStyle = { width: '100%', boxSizing: 'border-box' as const, border: '1px solid #ffffff25', borderRadius: 6, padding: '8px', background: '#161d25', color: TEXT_COLOR, fontSize: 12 };
    return (
        <section id={id} aria-label="Block library" style={{
            ...(embedded ? {} : GLASS), width: embedded ? '100%' : 'min(260px, calc(100vw - 112px))', padding: embedded ? 0 : 12, boxSizing: 'border-box',
            color: TEXT_COLOR, maxHeight: embedded ? undefined : 'calc(100dvh - 32px)', overflowY: embedded ? undefined : 'auto',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 12 }}>Building blocks</strong>
                <button type="button" aria-label="Close building blocks" onClick={onClose}
                    style={{ width: 26, height: 26, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)', color: TEXT_COLOR, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
                    <span aria-hidden="true">×</span>
                </button>
            </div>
            <p style={{ fontSize: 10, opacity: 0.7, margin: '5px 0 10px' }}>Minecraft Bedrock · {MINECRAFT_PACK.blockCount.toLocaleString()} blocks</p>
            <input type="search" aria-label="Search blocks" placeholder="Search blocks or texture variants…" value={query}
                onChange={event => { setQuery(event.target.value); setPage(0); }} style={inputStyle} />
            <select aria-label="Block category" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }} style={{ ...inputStyle, marginTop: 6 }}>
                {categories.map(value => <option key={value}>{value}</option>)}
            </select>
            <p style={{ fontSize: 10, opacity: 0.7 }}>Choose a block, then click the grid. Doors are two blocks tall; other shaped blocks use cubes. Animated textures show their first frame.</p>
            <div aria-live="polite" style={{ fontSize: 10, opacity: 0.7, marginBottom: 8 }}>{matches.length.toLocaleString()} matches · Page {page + 1} of {pageCount}</div>
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {visibleBlocks.map(block => (
                            <button key={block.id} type="button" title={block.description}
                                aria-label={block.label} aria-pressed={activeBlock === block.id}
                                onClick={() => onSelect(block.id)}
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                    padding: '6px 2px', cursor: 'pointer', borderRadius: 8, color: TEXT_COLOR,
                                    background: activeBlock === block.id ? 'rgba(208,163,79,0.18)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${activeBlock === block.id ? '#d0a34f' : 'rgba(255,255,255,0.08)'}`,
                                    font: 'inherit', fontSize: 10, minWidth: 0, overflowWrap: 'anywhere',
                                }}>
                                <BlockPreview type={block.id} color={block.id === BlockId.Glow ? glowColor : block.id === BlockId.Custom ? activeColor : block.color} />
                                {block.label}
                            </button>
                        ))}
                    </div>
                    {activeBlock === BlockId.Glow && <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                            <input type="color" aria-label="Glow color" value={glowColor}
                                onChange={event => onGlowColorChange(event.target.value)}
                                style={{ width: 38, height: 30, padding: 2, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, background: 'transparent', cursor: 'pointer' }} />
                            <span>Glow color <span style={{ opacity: 0.6, marginLeft: 6 }}>{glowColor.toUpperCase()}</span></span>
                        </label>
                        <p style={{ fontSize: 10, opacity: 0.6, margin: '7px 0 0' }}>Choose a color for the blocks you place next.</p>
                    </div>}
                </div>
            {matches.length === 0 && <p style={{ fontSize: 12 }}>No matching blocks. Try another name or category.</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
                <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)} style={{ ...inputStyle, cursor: 'pointer' }}>Previous</button>
                <button type="button" disabled={page + 1 >= pageCount} onClick={() => setPage(value => value + 1)} style={{ ...inputStyle, cursor: 'pointer' }}>Next</button>
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.6, marginTop: 12 }}>
                <a href="/texture-packs/minecraft-bedrock/minecraft-bedrock.zip" download style={{ color: '#e3b96d' }}>Download texture pack</a>
                <p style={{ opacity: 0.65, margin: '5px 0 0' }}>Textures © Mojang AB · <a href={MINECRAFT_PACK.source} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>Official source</a> · <a href="/texture-packs/minecraft-bedrock/LICENSE.md" style={{ color: 'inherit' }}>Terms</a></p>
            </div>
        </section>
    );
});

export default BlockPicker;
