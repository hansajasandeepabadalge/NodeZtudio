import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('@/')) {
            return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
        }
        if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) {
            return nextResolve(`${specifier}.ts`, context);
        }
        return nextResolve(specifier, context);
    },
});

const { LOCAL_SESSION_KEY, readLocalSession, saveLocalSession } = await import('../src/features/voxel/localSession.ts');
const snapshot = {
    voxels: [{ x: 0.5, y: 0.5, z: 0.5, color: '#6b9f43', blockType: 'leaves' }],
    activeTool: 'draw', activeBlock: 'leaves', activeColor: '#6b9f43', glowColor: '#ffad42',
    lighting: { automatic: true, time: 21.5, cycleSeconds: 600, brightness: 1.25 },
};

function memoryStorage() {
    const entries = new Map();
    return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}

test('local sessions restore blocks, tools, colors, and the latest cycle time', () => {
    const storage = memoryStorage();
    assert.equal(readLocalSession(storage), undefined);
    assert.equal(saveLocalSession(storage, snapshot), true);
    assert.deepEqual(readLocalSession(storage), snapshot);
});

test('saving an empty scene replaces previous blocks instead of bringing them back', () => {
    const storage = memoryStorage();
    saveLocalSession(storage, snapshot);
    saveLocalSession(storage, { ...snapshot, voxels: [] });
    assert.deepEqual(readLocalSession(storage).voxels, []);
});

test('new tool selections and grid visibility persist while older sessions still load', () => {
    const storage = memoryStorage();
    for (const activeTool of ['paint', 'fill', 'pick', 'box', 'box-erase', 'move', 'rotate']) {
        const session = { ...snapshot, activeTool, showGrid: false };
        saveLocalSession(storage, session);
        assert.deepEqual(readLocalSession(storage), session);
    }
    saveLocalSession(storage, snapshot);
    assert.deepEqual(readLocalSession(storage), snapshot);
});

test('rotation settings and rotated objects persist in local sessions', () => {
    const storage = memoryStorage();
    const session = { ...snapshot, placementRotation: 3, voxels: [{ ...snapshot.voxels[0], rotation: 2 }] };
    saveLocalSession(storage, session);
    assert.deepEqual(readLocalSession(storage), session);
    for (const placementRotation of [-1, 4, .5, '1']) {
        saveLocalSession(storage, { ...session, placementRotation });
        assert.equal(readLocalSession(storage), undefined);
    }
});

test('official materials and texture variants survive local session restoration', () => {
    const storage = memoryStorage();
    for (const activeBlock of ['minecraft:diamond_block', 'minecraft:texture/grass_side_carried']) {
        const session = { ...snapshot, activeBlock, voxels: [{ ...snapshot.voxels[0], blockType: activeBlock }] };
        assert.equal(saveLocalSession(storage, session), true);
        assert.deepEqual(readLocalSession(storage), session);
    }
});

test('corrupt or incompatible sessions are rejected without partially restoring settings', () => {
    const storage = memoryStorage();
    const invalid = [
        'broken JSON',
        JSON.stringify({ ...snapshot, version: 2 }),
        JSON.stringify({ ...snapshot, version: 1, activeBlock: 'unknown' }),
        JSON.stringify({ ...snapshot, version: 1, activeColor: 'red' }),
        JSON.stringify({ ...snapshot, version: 1, voxels: [{ ...snapshot.voxels[0], x: null }] }),
        JSON.stringify({ ...snapshot, version: 1, lighting: { ...snapshot.lighting, time: 24 } }),
    ];
    for (const value of invalid) {
        storage.setItem(LOCAL_SESSION_KEY, value);
        assert.equal(readLocalSession(storage), undefined);
    }
});

test('blocked or full storage never throws or replaces the last good snapshot', () => {
    const storage = memoryStorage();
    saveLocalSession(storage, snapshot);
    assert.equal(saveLocalSession({ setItem() { throw new Error('Quota exceeded'); } }, { ...snapshot, voxels: [] }), false);
    assert.deepEqual(readLocalSession(storage), snapshot);
    assert.equal(readLocalSession({ getItem() { throw new Error('Storage blocked'); } }), undefined);
});
