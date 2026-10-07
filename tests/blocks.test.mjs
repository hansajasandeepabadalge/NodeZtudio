import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import * as THREE from 'three';

// Node's native TS runner needs the same aliases as the application bundler.
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith('@/')) {
            return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
        }
        if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) {
            return nextResolve(`${specifier}.ts`, context);
        }
        return nextResolve(specifier, context);
    },
});

const { BLOCKS, blockFaces, blockEmission } = await import('../src/features/voxel/blocks.ts');
const { createVoxelEngine } = await import('../src/features/rendering/voxelEngine.ts');
const { createBlockMaterials } = await import('../src/features/rendering/blockMaterials.ts');
const { MAX_BLOCK_LIGHTS } = await import('../src/features/rendering/blockLights.ts');
const { addSceneLighting } = await import('../src/engine/core/lighting.ts');

test('scene lighting crosses the other axis and keeps shaded faces lit across the cycle', () => {
    const scene = new THREE.Scene();
    const lighting = addSceneLighting(scene);
    const sky = scene.children.find(child => child.isHemisphereLight);
    const [sun, moon, fill] = scene.children.filter(child => child.isDirectionalLight);
    try {
        lighting.update(12, 1);
        assert.ok(sun.position.x > 0 && sun.position.z > 0, 'midday sun must follow the rotated orbit');
        assert.ok(sun.intensity > 0 && fill.intensity > 0);
        const daylightFill = fill.intensity;
        const daylightSky = sky.intensity;
        lighting.update(6, 1);
        assert.ok(sun.position.x > 0 && Math.abs(sun.position.z) < 0.001, 'sunrise must start along positive X');
        lighting.update(18, 1);
        assert.ok(sun.position.x < 0 && Math.abs(sun.position.z) < 0.001, 'sunset must end along negative X');
        lighting.update(0, 1);
        assert.equal(sun.intensity, 0);
        assert.ok(moon.intensity > 0 && moon.position.y > 3);
        assert.equal(moon.position.x, -sun.position.x);
        assert.equal(moon.position.z, -sun.position.z);
        assert.ok(fill.intensity > 0 && fill.intensity < daylightFill);
        assert.ok(sky.intensity > 0 && sky.intensity < daylightSky);
        lighting.update(12, 2);
        assert.equal(fill.intensity, daylightFill * 2, 'brightness must also scale the fill');
    } finally {
        lighting.dispose();
    }
    assert.equal(scene.children.length, 0, 'disposing must remove the new fill light too');
});

// Image loading requires a browser; retain the requested URL for material assertions.
mock.method(THREE.TextureLoader.prototype, 'load', url => new THREE.Texture({ src: url }));

function setup(onHistoryChange, onPick) {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
    camera.up.set(0, 0, -1);
    camera.position.set(0.5, 10, 0.5);
    camera.lookAt(0.5, 0, 0.5);
    camera.updateMatrixWorld();
    const listeners = new Map();
    const dom = {
        ownerDocument: {
            addEventListener: (name, listener) => listeners.set(name, listener),
            removeEventListener: name => listeners.delete(name),
        },
        addEventListener: (name, listener) => listeners.set(name, listener),
        removeEventListener: name => listeners.delete(name),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    };
    const engine = createVoxelEngine(scene, camera, dom, '#896344', 'custom', onHistoryChange, onPick);
    return { engine, scene, listeners };
}

test('box build previews two corners and adds an inclusive region as one undo action', () => {
    const { engine, scene, listeners } = setup();
    const click = (x, y) => listeners.get('mousedown')({ button: 0, clientX: x, clientY: y });
    try {
        engine.setMode('box');
        engine.setBlockType('stone');
        scene.updateMatrixWorld();
        click(140, 120);
        assert.deepEqual(engine.exportScene(), [], 'first corner must not edit the scene');
        assert.equal(engine.getHistoryState().canUndo, false);
        listeners.get('mousemove')({ clientX: 100, clientY: 100 });
        const outline = scene.children.find(child => child.isLineSegments && child.visible);
        assert.deepEqual(outline.scale.toArray(), [3, 1, 2]);
        click(100, 100);
        const placed = engine.exportScene();
        assert.equal(placed.length, 6);
        assert.deepEqual(placed.map(v => [v.x, v.y, v.z]), [
            [.5, .5, .5], [.5, .5, 1.5], [1.5, .5, .5],
            [1.5, .5, 1.5], [2.5, .5, .5], [2.5, .5, 1.5],
        ]);
        assert.ok(placed.every(v => v.blockType === 'stone'));
        engine.undo();
        assert.deepEqual(engine.exportScene(), []);
        assert.equal(engine.getHistoryState().canUndo, false);
        engine.redo();
        assert.deepEqual(engine.exportScene(), placed);
    } finally { engine.dispose(); }
});

test('box build fills height, preserves existing blocks, and restores them on undo', () => {
    const { engine, scene, listeners } = setup();
    const original = [{ x: 2.5, y: 2.5, z: .5, color: '#92958c', blockType: 'stone' }];
    try {
        engine.importScene(original);
        engine.setMode('box');
        engine.setBlockType('glow');
        engine.setColor('#33aaff');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        listeners.get('mousedown')({ button: 0, clientX: 140, clientY: 100 });
        const placed = engine.exportScene();
        assert.equal(placed.length, 12, '3 wide by 4 high, including the existing cell');
        assert.deepEqual(placed.find(v => v.x === 2.5 && v.y === 2.5), original[0]);
        assert.ok(placed.slice(1).every(v => v.blockType === 'glow' && v.color === '#33aaff'));
        engine.undo();
        assert.deepEqual(engine.exportScene(), original);
        engine.redo();
        assert.deepEqual(engine.exportScene(), placed);
    } finally { engine.dispose(); }
});

test('box build cancels pending corners on Escape, right-click, tool changes, and undo', () => {
    for (const cancel of [
        listeners => listeners.get('keydown')({ key: 'Escape' }),
        listeners => listeners.get('mousedown')({ button: 2, clientX: 100, clientY: 100 }),
        (_, engine) => { engine.setMode('draw'); engine.setMode('box'); },
        (_, engine) => engine.undo(),
        (_, engine) => engine.clearScene(),
    ]) {
        const { engine, scene, listeners } = setup();
        try {
            engine.setMode('box');
            scene.updateMatrixWorld();
            listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
            cancel(listeners, engine);
            listeners.get('mousedown')({ button: 0, clientX: 140, clientY: 100 });
            assert.deepEqual(engine.exportScene(), [], 'next click starts a new selection');
            listeners.get('mousedown')({ button: 0, clientX: 140, clientY: 100 });
            assert.equal(engine.exportScene().length, 1, 'same corner adds one block');
        } finally { engine.dispose(); }
        assert.equal(listeners.size, 0, 'all event handlers must be removed');
    }
});

test('grass and logs have the correct top, side, and bottom textures', () => {
    assert.equal(blockFaces('grass')[2], 'grass_block_top');
    assert.equal(blockFaces('grass')[3], 'dirt');
    assert.equal(blockFaces('grass')[0], 'grass_block_side');
    assert.equal(blockFaces('log')[2], 'log_oak_top');
    assert.equal(blockFaces('log')[3], 'log_oak_top');
    assert.equal(blockFaces('log')[4], 'log_oak');
});

test('oak leaves use a shared cutout texture on every face', () => {
    assert.deepEqual(blockFaces('leaves'), Array(6).fill('leaves_oak'));
    const library = createBlockMaterials();
    try {
        const faces = library.get('leaves', '#6b9f43');
        assert.ok(faces.every(material => material === faces[0]));
        assert.equal(faces[0].map.image.src, '/textures/leaves_oak.png');
        assert.equal(faces[0].alphaTest, 0.5);
        assert.equal(faces[0].side, THREE.DoubleSide);
        assert.equal(faces[0].transparent, false, 'cutout foliage should keep depth writing and avoid sorting artifacts');
    } finally { library.dispose(); }
});

test('stale block selections cannot crash placement or save an invalid block type', () => {
    const { engine, scene, listeners } = setup();
    const library = createBlockMaterials();
    try {
        for (const type of ['old-block', undefined, 'toString', 'custom', 'glow']) {
            assert.equal(blockFaces(type), undefined);
            assert.ok(library.get(type, '#123456').isMeshStandardMaterial);
        }
        engine.setMode('draw');
        engine.setBlockType('old-block');
        scene.updateMatrixWorld();
        assert.doesNotThrow(() => listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 }));
        assert.equal(engine.exportScene()[0].blockType, 'custom');
        engine.setBlockType('leaves');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        assert.equal(engine.exportScene()[1].blockType, 'leaves');
        engine.undo();
        engine.redo();
        assert.equal(engine.exportScene()[1].blockType, 'leaves');
    } finally {
        library.dispose();
        engine.dispose();
    }
});

test('typed and legacy solid-color blocks survive JSON save/load', () => {
    const { engine } = setup();
    try {
        const data = BLOCKS.map((block, index) => ({ x: index + 0.5, y: 0.5, z: 0.5, color: block.color, blockType: block.id }));
        engine.importScene(data);
        engine.importScene(JSON.parse(JSON.stringify(engine.exportScene())));
        assert.deepEqual(engine.exportScene(), data);
        engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#123456' }]);
        assert.equal(engine.exportScene()[0].blockType, 'custom');
        assert.equal(engine.exportScene()[0].color, '#123456');
    } finally { engine.dispose(); }
});

test('invalid imports leave the current scene intact', () => {
    const { engine } = setup();
    try {
        engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#896344', blockType: 'dirt' }]);
        const before = engine.exportScene();
        assert.throws(() => engine.importScene([{ x: NaN, y: 0.5, z: 0.5, color: '#ffffff' }]));
        assert.throws(() => engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#ffffff', blockType: 'unknown' }]));
        assert.deepEqual(engine.exportScene(), before);
    } finally { engine.dispose(); }
});

test('drawing places the selected preset and switching back restores custom colors', () => {
    const { engine, scene, listeners } = setup();
    try {
        engine.setMode('draw');
        engine.setBlockType('grass');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        assert.equal(engine.exportScene()[0].blockType, 'grass');
        engine.setBlockType('custom');
        engine.setColor('#123456');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        const blocks = engine.exportScene();
        assert.equal(blocks.length, 2);
        assert.equal(blocks[1].blockType, 'custom');
        assert.equal(blocks[1].color, '#123456');
        assert.equal(blocks[1].y, 1.5, 'blocks should stack');
    } finally { engine.dispose(); }
});

test('paint replaces the clicked block in place and supports undo', () => {
    const { engine, scene, listeners } = setup();
    const original = [{ x: .5, y: .5, z: .5, color: '#896344', blockType: 'dirt' }];
    try {
        engine.importScene(original);
        engine.setBlockType('leaves');
        engine.setColor('#6b9f43');
        engine.setMode('paint');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        assert.deepEqual(engine.exportScene(), [{ ...original[0], color: '#6b9f43', blockType: 'leaves' }]);
        engine.undo();
        assert.deepEqual(engine.exportScene(), original);
    } finally { engine.dispose(); }
});

test('fill changes only connected matching blocks and is one undo action', () => {
    const { engine, scene, listeners } = setup();
    const original = [
        { x: .5, y: .5, z: .5, color: '#896344', blockType: 'dirt' },
        { x: 1.5, y: .5, z: .5, color: '#896344', blockType: 'dirt' },
        { x: 2.5, y: .5, z: .5, color: '#92958c', blockType: 'stone' },
        { x: .5, y: .5, z: 1.5, color: '#123456', blockType: 'dirt' },
        { x: 5.5, y: .5, z: .5, color: '#896344', blockType: 'dirt' },
    ];
    try {
        engine.importScene(original);
        engine.setBlockType('glow');
        engine.setColor('#33aaff');
        engine.setMode('fill');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        const filled = engine.exportScene();
        assert.deepEqual(filled, original.map((voxel, index) => index < 2 ? { ...voxel, color: '#33aaff', blockType: 'glow' } : voxel));
        assert.equal(scene.children.filter(child => child.isPointLight && child.intensity > 0).length, 2);
        engine.undo();
        assert.deepEqual(engine.exportScene(), original);
        assert.equal(scene.children.filter(child => child.isPointLight && child.intensity > 0).length, 0);
        engine.redo();
        assert.deepEqual(engine.exportScene(), filled);
    } finally { engine.dispose(); }
});

test('sample returns the clicked material and color without editing the scene or history', () => {
    const samples = [];
    const { engine, scene, listeners } = setup(undefined, voxel => samples.push(voxel));
    const original = [{ x: .5, y: .5, z: .5, color: '#33aaff', blockType: 'glow' }];
    try {
        engine.importScene(original);
        const history = engine.getHistoryState();
        engine.setMode('pick');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        assert.deepEqual(samples, original);
        samples[0].color = '#ffffff';
        assert.deepEqual(engine.exportScene(), original);
        assert.deepEqual(engine.getHistoryState(), history);
    } finally { engine.dispose(); }
});

test('block materials are reused and textures are released once on disposal', () => {
    const library = createBlockMaterials();
    const first = library.get('grass', '#ffffff');
    const second = library.get('grass', '#123456');
    assert.equal(first[0], second[0]);
    assert.equal(first[0].map.magFilter, THREE.NearestFilter);
    assert.equal(first[0].map.flipY, true, 'grass fringe must appear at the top');
    assert.deepEqual(first.map(material => material.map.image.src), [
        '/textures/grass_block_side.png', '/textures/grass_block_side.png',
        '/textures/grass_block_top.png', '/textures/dirt.png',
        '/textures/grass_block_side.png', '/textures/grass_block_side.png',
    ]);
    for (const type of ['dirt', 'stone', 'sand']) {
        assert.equal(library.get(type, '#ffffff')[0].map.image.src, `/textures/${type}.png`);
    }
    assert.deepEqual(library.get('log', '#ffffff').map(material => material.map.image.src), [
        '/textures/log_oak.png', '/textures/log_oak.png',
        '/textures/log_oak_top.png', '/textures/log_oak_top.png',
        '/textures/log_oak.png', '/textures/log_oak.png',
    ]);
    assert.ok(library.get('planks', '#ffffff').every(material => material.map.image.src === '/textures/planks_oak.png'));
    let disposed = 0;
    const textures = new Set(first.map(material => material.map));
    textures.forEach(texture => texture.addEventListener('dispose', () => disposed++));
    library.dispose();
    assert.equal(disposed, textures.size);
});

test('one frameless glow material follows its color without changing other blocks', () => {
    const library = createBlockMaterials();
    try {
        assert.deepEqual(BLOCKS.filter(block => blockEmission(block.id)).map(block => block.id), ['glow']);
        for (const color of ['#ffad42', '#40eaff', '#b755ef']) {
            const material = library.get('glow', color);
            assert.ok(material.emissiveIntensity > 1);
            assert.equal(material.map, null, 'there must be no frame texture');
            assert.equal(material.emissiveMap, null, 'the whole face must glow');
            assert.equal(material.color.getHexString(), color.slice(1));
            assert.equal(material.emissive.getHexString(), color.slice(1));
        }
        assert.notEqual(library.get('glow', '#ffad42'), library.get('glow', '#40eaff'));
        assert.equal(library.get('glow', '#ffad42'), library.get('glow', '#FFAD42'));
        assert.equal(library.get('custom', '#ffad42').emissive.getHex(), 0);
        assert.equal(library.get('stone', '#ffffff')[0].emissive.getHex(), 0);
    } finally { library.dispose(); }
});

test('placing, erasing, replacing, and clearing lamps updates their illumination', () => {
    const { engine, scene, listeners } = setup();
    const activeLights = () => scene.children.filter(child => child.isPointLight && child.intensity > 0);
    try {
        engine.setMode('draw');
        engine.setBlockType('glow');
        engine.setColor('#ffad42');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        engine.updateLighting();
        assert.equal(activeLights().length, 1);
        assert.equal(activeLights()[0].color.getHexString(), 'ffad42');
        assert.deepEqual(activeLights()[0].position.toArray(), [0.5, 0.5, 0.5]);
        engine.setMode('erase');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        engine.updateLighting();
        assert.equal(activeLights().length, 0);
        engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#40eaff', blockType: 'glow' }]);
        engine.updateLighting();
        assert.equal(activeLights().length, 1);
        engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#92958c', blockType: 'stone' }]);
        engine.updateLighting();
        assert.equal(activeLights().length, 0, 'import must remove the old light');
        engine.importScene([{ x: 0.5, y: 0.5, z: 0.5, color: '#40eaff', blockType: 'glow' }]);
        engine.updateLighting();
        engine.clearScene();
        assert.equal(activeLights().length, 0);
    } finally { engine.dispose(); }
    assert.equal(scene.children.filter(child => child.isPointLight).length, 0);
});

test('large light installations keep a bounded light pool and save every source', () => {
    const { engine, scene } = setup();
    try {
        const data = Array.from({ length: 64 }, (_, index) => ({
            x: index % 8 + 0.5, y: Math.floor(index / 8) + 0.5, z: 0.5,
            color: '#ffc5ff', blockType: 'glow',
        }));
        engine.importScene(data);
        engine.updateLighting();
        assert.equal(scene.children.filter(child => child.isPointLight && child.intensity > 0).length, MAX_BLOCK_LIGHTS);
        assert.deepEqual(engine.exportScene(), data);
    } finally { engine.dispose(); }
});

test('glow blocks keep individual colors in their saved data, materials, and lights', () => {
    const { engine, scene, listeners } = setup();
    try {
        engine.setMode('draw');
        engine.setBlockType('glow');
        for (const color of ['#ff8833', '#33aaff']) {
            engine.setColor(color);
            scene.updateMatrixWorld();
            listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        }
        const saved = engine.exportScene();
        assert.deepEqual(saved.map(block => [block.blockType, block.color]), [['glow', '#ff8833'], ['glow', '#33aaff']]);
        engine.importScene(JSON.parse(JSON.stringify(saved)));
        engine.updateLighting();
        assert.deepEqual(engine.exportScene(), saved);
        const lights = scene.children.filter(child => child.isPointLight && child.intensity > 0);
        assert.deepEqual(lights.map(light => light.color.getHexString()), ['ff8833', '33aaff']);
        const meshes = scene.children.filter(child => child.userData.voxel);
        assert.deepEqual(meshes.map(mesh => mesh.material.emissive.getHexString()), ['ff8833', '33aaff']);
    } finally { engine.dispose(); }
});

test('old lantern saves migrate to the single glow block with their original light colors', () => {
    const { engine, scene } = setup();
    try {
        const oldTypes = ['amber-light', 'cyan-light', 'jade-light', 'portal-light'];
        const expectedColors = ['#ffad42', '#40eaff', '#73ff9e', '#ffc5ff'];
        engine.importScene(oldTypes.map((blockType, index) => ({ x: index + 0.5, y: 0.5, z: 0.5, color: '#ffffff', blockType })));
        engine.updateLighting();
        assert.deepEqual(engine.exportScene().map(block => block.blockType), Array(4).fill('glow'));
        assert.deepEqual(engine.exportScene().map(block => block.color), expectedColors);
        const lights = scene.children.filter(child => child.isPointLight && child.intensity > 0);
        assert.deepEqual(lights.map(light => '#' + light.color.getHexString()), expectedColors);
    } finally { engine.dispose(); }
});

test('undo and redo restore placed/erased blocks, their colors, and their lights', () => {
    const states = [];
    const { engine, scene, listeners } = setup(state => states.push(state));
    try {
        assert.deepEqual(engine.getHistoryState(), { canUndo: false, canRedo: false });
        engine.undo();
        engine.redo();
        engine.setMode('draw');
        engine.setBlockType('glow');
        engine.setColor('#33aaff');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        const placed = engine.exportScene();
        engine.undo();
        assert.deepEqual(engine.exportScene(), []);
        assert.equal(scene.children.filter(child => child.isPointLight && child.intensity > 0).length, 0);
        assert.deepEqual(states.at(-1), { canUndo: false, canRedo: true });
        engine.setColor('#ffaa33');
        engine.redo();
        assert.deepEqual(engine.exportScene(), placed, 'redo must retain the original color');
        assert.equal(scene.children.find(child => child.isPointLight && child.intensity > 0).color.getHexString(), '33aaff');
        assert.deepEqual(states.at(-1), { canUndo: true, canRedo: false });
        engine.setMode('erase');
        scene.updateMatrixWorld();
        listeners.get('mousedown')({ button: 0, clientX: 100, clientY: 100 });
        assert.deepEqual(engine.exportScene(), []);
        engine.undo();
        assert.deepEqual(engine.exportScene(), placed);
        engine.redo();
        assert.deepEqual(engine.exportScene(), []);
    } finally { engine.dispose(); }
});

test('loading and clearing scenes are each one reversible action', () => {
    const { engine } = setup();
    const original = [{ x: .5, y: .5, z: .5, color: '#33aaff', blockType: 'glow' }];
    const loaded = [
        { x: .5, y: .5, z: .5, color: '#92958c', blockType: 'stone' },
        { x: 1.5, y: .5, z: .5, color: '#ffaa33', blockType: 'glow' },
    ];
    try {
        engine.importScene(original);
        engine.importScene(loaded);
        engine.undo();
        assert.deepEqual(engine.exportScene(), original);
        engine.redo();
        assert.deepEqual(engine.exportScene(), loaded);
        engine.clearScene();
        assert.deepEqual(engine.exportScene(), []);
        engine.undo();
        assert.deepEqual(engine.exportScene(), loaded);
        engine.redo();
        assert.deepEqual(engine.exportScene(), []);
    } finally { engine.dispose(); }
});

test('new edits discard redo, but empty, identical, and invalid edits preserve history', () => {
    const { engine } = setup();
    const first = [{ x: .5, y: .5, z: .5, color: '#896344', blockType: 'dirt' }];
    try {
        engine.importScene(first);
        engine.undo();
        engine.clearScene();
        assert.throws(() => engine.importScene([{ x: NaN, y: .5, z: .5, color: '#ffffff' }]));
        assert.deepEqual(engine.getHistoryState(), { canUndo: false, canRedo: true });
        engine.redo();
        engine.importScene(first);
        engine.undo();
        assert.deepEqual(engine.exportScene(), [], 'identical import must not add a history step');
        engine.importScene([{ ...first[0], color: '#92958c', blockType: 'stone' }]);
        assert.equal(engine.getHistoryState().canRedo, false);
        engine.redo();
        assert.equal(engine.exportScene()[0].blockType, 'stone');
    } finally { engine.dispose(); }
});

test('history keeps the latest 100 actions and import snapshots cannot be mutated externally', () => {
    const { engine } = setup();
    try {
        for (let index = 0; index < 105; index++) {
            const data = [{ x: .5, y: .5, z: .5, color: '#' + index.toString(16).padStart(6, '0'), blockType: 'custom' }];
            engine.importScene(data);
            data[0].color = '#ffffff';
        }
        for (let index = 0; index < 100; index++) engine.undo();
        assert.equal(engine.exportScene()[0].color, '#000004');
        assert.equal(engine.getHistoryState().canUndo, false);
        for (let index = 0; index < 100; index++) engine.redo();
        assert.equal(engine.exportScene()[0].color, '#000068');
        assert.equal(engine.getHistoryState().canRedo, false);
    } finally { engine.dispose(); }
});
