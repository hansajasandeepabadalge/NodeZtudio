"""Build the editor pack from a pinned Mojang archive (Python + Pillow).

Usage: python scripts/import-bedrock-pack.py .cache/bedrock-samples.zip
No network access is needed. Original assets and Mojang's notice stay in the ZIP.
"""
import io
import json
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'texture-packs' / 'minecraft-bedrock'
SOURCE_URL = 'https://github.com/Mojang/bedrock-samples'


def load_json(raw):
    return json.loads(re.sub(r'^\s*//.*$', '', raw.decode('utf-8-sig'), flags=re.M))


def category(name):
    if any(word in name for word in ('leaves', 'sapling', 'flower', 'grass', 'vine', 'moss', 'mushroom', 'coral', 'fern', 'bush', 'azalea', 'crop', 'wheat')):
        return 'Nature'
    if any(word in name for word in ('log', 'wood', 'planks', 'bamboo', 'stem', 'hyphae')):
        return 'Wood'
    if any(word in name for word in ('wool', 'concrete', 'terracotta', 'glass', 'stained', 'carpet')):
        return 'Color & Glass'
    if any(word in name for word in ('ore', 'diamond', 'gold', 'iron', 'copper', 'emerald', 'lapis', 'coal', 'netherite', 'redstone', 'quartz')):
        return 'Ores & Metals'
    if any(word in name for word in ('stone', 'brick', 'sand', 'dirt', 'gravel', 'deepslate', 'tuff', 'basalt', 'obsidian', 'netherrack', 'mud', 'clay', 'ice', 'snow', 'bedrock')):
        return 'Stone & Terrain'
    return 'Decorative & Utility'


def label(name):
    return name.replace('_', ' ').title().replace('Tnt', 'TNT')


def build(archive):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'textures').mkdir(exist_ok=True)
    with zipfile.ZipFile(archive) as source:
        prefix = source.namelist()[0]
        revision = prefix.removeprefix('bedrock-samples-').rstrip('/')
        pack = prefix + 'resource_pack/'
        blocks = load_json(source.read(pack + 'blocks.json'))
        terrain = load_json(source.read(pack + 'textures/terrain_texture.json'))['texture_data']
        names = set(source.namelist())
        notice = source.read(prefix + 'LICENSE.md')
        (OUT / 'LICENSE.md').write_bytes(notice)

        # Browser-safe color textures. Exclude PBR data maps; prefer TGA where it
        # contains the foliage alpha missing from the corresponding PNG.
        candidates = {}
        for name in sorted(names):
            if not name.startswith(pack + 'textures/blocks/') or not name.endswith(('.png', '.tga')):
                continue
            relative = name[len(pack):]
            stem = relative.rsplit('.', 1)[0]
            if stem.endswith(('_mers', '_heightmap')):
                continue
            if stem not in candidates or name.endswith('.tga'):
                candidates[stem] = name

        textures = {}
        normalized = {}
        for stem, name in candidates.items():
            image = Image.open(io.BytesIO(source.read(name))).convert('RGBA')
            # Animated strips use the first square frame in the cube editor.
            animated = image.height > image.width and image.height % image.width == 0
            if animated:
                image = image.crop((0, 0, image.width, image.width))
            base = Path(stem).name
            # On grass sides, Bedrock's TGA alpha is a biome-tint mask, not
            # transparency. Bake the green fringe while preserving the dirt.
            if base == 'grass_side':
                rgb = image.convert('RGB')
                green = ImageChops.multiply(rgb, Image.new('RGB', image.size, '#79a83b'))
                image = Image.composite(green, rgb, image.getchannel('A')).convert('RGBA')
            elif base == 'grass_side_snowed':
                image.putalpha(255)
            # Bedrock applies biome colors at runtime. Supply a fixed plains tint
            # for its grayscale masks, leaving the original files in the archive.
            rgb = image.convert('RGB')
            stats = ImageStat.Stat(rgb).mean
            grayscale = max(stats) - min(stats) < 12
            tint = None
            if grayscale and any(word in base for word in ('leaves', 'grass_top', 'vine', 'fern', 'lily', 'grass_carried')):
                tint = '#79a83b'
            elif 'water' in base and ('grey' in base or grayscale):
                tint = '#4285d4'
            if tint:
                tinted = ImageChops.multiply(rgb, Image.new('RGB', image.size, tint)).convert('RGBA')
                tinted.putalpha(image.getchannel('A'))
                image = tinted
            relative = stem.removeprefix('textures/blocks/') + '.png'
            destination = OUT / 'textures' / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.save(destination)
            key = 'bedrock:' + stem.removeprefix('textures/blocks/')
            alpha = image.getchannel('A').getextrema()[0] < 255
            transparent = any(word in base for word in ('glass', 'water', 'ice', 'slime', 'honey_block', 'portal'))
            textures[key] = {
                'url': '/texture-packs/minecraft-bedrock/textures/' + relative,
                'alpha': alpha, 'transparent': transparent, 'animated': animated,
                'color': '#%02x%02x%02x' % tuple(round(v) for v in ImageStat.Stat(image.convert('RGB'), image.getchannel('A')).mean),
            }
            normalized[stem] = key

        def texture_paths(value):
            if isinstance(value, str):
                return [value]
            if isinstance(value, list):
                return [path for item in value for path in texture_paths(item)]
            if isinstance(value, dict) and 'path' in value:
                return [value['path']]
            return []

        def resolve(texture):
            entry = terrain.get(texture, {})
            for path in texture_paths(entry.get('textures', texture)):
                if path in normalized:
                    return normalized[path]
            return None

        catalog = []
        skipped = []
        used = set()
        for name, definition in sorted(blocks.items()):
            if not isinstance(definition, dict):
                continue
            specification = definition.get('textures')
            if specification is None and name in terrain:
                specification = name
            if specification is None and name == 'shelf_mushroom':
                specification = 'shelf_mushroom_small'
            if specification is None:
                skipped.append({'id': name, 'reason': 'No visible texture definition in the upstream metadata.'})
                continue
            if isinstance(specification, str):
                faces = [resolve(specification)] * 6
            else:
                # Three.js order: east, west, up, down, south, north.
                faces = [resolve(specification.get(face, specification.get('side', 'missing')))
                         for face in ('east', 'west', 'up', 'down', 'south', 'north')]
            if any(face is None for face in faces):
                skipped.append({'id': name, 'reason': 'References textures outside the supplied block collection.'})
                continue
            used.update(faces)
            catalog.append({'id': 'minecraft:' + name, 'label': label(name),
                            'color': textures[faces[2]]['color'], 'category': category(name),
                            'description': 'Minecraft Bedrock ' + label(name) + '. Cube representation.',
                            'faces': faces})

        # Include every remaining color texture as an explicitly named texture
        # variant, rather than mistaking per-face/animation assets for real blocks.
        variants = []
        for stem, key in sorted(normalized.items()):
            if key not in used:
                name = stem.removeprefix('textures/blocks/')
                faces = [key] * 6
                display_name = label(name)
                description = 'Official texture variant applied to all six cube faces.'
                if name in ('grass_block_snow', 'grass_side_snowed'):
                    # These are snowy dirt SIDE textures, not a complete snow
                    # block. Preserve saved IDs but give their cubes a snow top.
                    faces = [key, key, normalized['textures/blocks/snow'],
                             normalized['textures/blocks/dirt'], key, key]
                    display_name = 'Snowy Grass' if name == 'grass_block_snow' else 'Snowy Grass (Side Texture)'
                    description = 'Snow-covered grass with a white snow top and dirt below the snowy sides.'
                variants.append({'id': 'minecraft:texture/' + name, 'label': display_name,
                                 'color': textures[key]['color'], 'category': 'Texture Variants',
                                 'description': description, 'faces': faces})
        metadata = {
            'id': 'minecraft-bedrock', 'name': 'Minecraft Bedrock', 'revision': revision,
            'source': SOURCE_URL + '/tree/' + revision + '/resource_pack/textures/blocks',
            'blockCount': len(catalog), 'variantCount': len(variants), 'textureCount': len(textures),
            'geometry': 'cube', 'animation': 'first frame', 'skipped': skipped,
        }
        payload = {'pack': metadata, 'blocks': catalog + variants, 'textures': textures}
        # Keep existing scene IDs and URLs, replacing their starter artwork with
        # the matching official pixels so old saves also use the new pack.
        aliases = {
            'grass_block_top': 'grass_top', 'grass_block_side': 'grass_side',
            'dirt': 'dirt', 'stone': 'stone', 'sand': 'sand',
            'log_oak': 'log_oak', 'log_oak_top': 'log_oak_top',
            'planks_oak': 'planks_oak', 'leaves_oak': 'leaves_oak',
        }
        for target, original in aliases.items():
            (ROOT / 'public/textures' / (target + '.png')).write_bytes((OUT / 'textures' / (original + '.png')).read_bytes())
        (OUT / 'pack.json').write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')
        generated = ROOT / 'src/features/voxel/bedrockPack.ts'
        generated.write_text('// Generated by scripts/import-bedrock-pack.py. Do not edit by hand.\n'
                             + 'export const BEDROCK_PACK = ' + json.dumps(payload, separators=(',', ':')) + ';\n', encoding='utf-8')
        readme = ('Minecraft Bedrock texture pack for NodeZtudio\n\n'
                  f'Source: {metadata["source"]}\nRevision: {revision}\n'
                  f'{len(catalog)} block definitions, {len(variants)} texture variants, {len(textures)} color textures.\n'
                  'The editor uses cube geometry, static first animation frames, and fixed foliage/water colors.\n'
                  'Invisible blocks and unresolved upstream definitions are listed in pack.json.\n'
                  'Original Mojang assets are retained under original/. Normalized browser PNGs are under textures/.\n'
                  'Minecraft textures (c) Mojang AB. See LICENSE.md for the upstream terms.\n')
        (OUT / 'README.txt').write_text(readme, encoding='utf-8')
        with zipfile.ZipFile(OUT / 'minecraft-bedrock.zip', 'w', zipfile.ZIP_DEFLATED) as output:
            for path in sorted(OUT.rglob('*')):
                if path.is_file() and path.suffix != '.zip':
                    output.write(path, path.relative_to(OUT).as_posix())
            for name in sorted(names):
                if name.startswith(pack + 'textures/blocks/') and not name.endswith('/'):
                    output.writestr('original/' + name[len(pack):], source.read(name))
            for relative in ('blocks.json', 'textures/terrain_texture.json', 'textures/flipbook_textures.json'):
                output.writestr('original/' + relative, source.read(pack + relative))
        print(json.dumps(metadata, indent=2))


if __name__ == '__main__':
    build(Path(sys.argv[1]))
