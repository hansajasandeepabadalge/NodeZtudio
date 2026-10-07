"""Regression checks for the baked Bedrock biome tint (requires Pillow)."""
import json
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'public/texture-packs/minecraft-bedrock'


class GrassTexturesTest(unittest.TestCase):
    def test_green_fringe_preserves_brown_dirt_and_full_opacity(self):
        with Image.open(PACK / 'textures/grass_side.png') as image:
            image = image.convert('RGBA')
            r, g, b, a = image.getpixel((0, 0))
            self.assertGreater(g, r)
            self.assertGreater(g, b)
            self.assertEqual(a, 255)
            self.assertEqual(image.getpixel((0, 5)), (121, 85, 58, 255))
            self.assertEqual(image.getchannel('A').getextrema(), (255, 255))
            with Image.open(ROOT / 'public/textures/grass_block_side.png') as legacy:
                self.assertEqual(image.tobytes(), legacy.convert('RGBA').tobytes())

    def test_snowy_grass_is_opaque_and_material_metadata_matches(self):
        with Image.open(PACK / 'textures/grass_side_snowed.png') as image:
            self.assertEqual(image.convert('RGBA').getchannel('A').getextrema(), (255, 255))
        metadata = json.loads((PACK / 'pack.json').read_text(encoding='utf-8'))
        for key in ['bedrock:grass_side', 'bedrock:grass_side_snowed']:
            self.assertFalse(metadata['textures'][key]['alpha'])
            self.assertFalse(metadata['textures'][key]['transparent'])


if __name__ == '__main__':
    unittest.main()
