"""Render the six authored Tiled maps for narrative/layout review (requires Pillow)."""
import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
IDS = ['jo16_orders_village', 'jo17_kinkou', 'jo18_shadow_ravine', 'jo19_wanderers', 'jo20_trial_shrine', 'jo21_reunion']
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_path, 19) if Path(font_path).exists() else ImageFont.load_default()
small = ImageFont.truetype(font_path, 13) if Path(font_path).exists() else ImageFont.load_default()
output = Image.new('RGB', (1280, 1740), '#102b33')
draw = ImageDraw.Draw(output)
draw.text((30, 18), 'JONIA · LAS ÓRDENES Y LA RUNA DEL ESPÍRITU', font=font, fill='#f3d99b')
draw.text((30, 48), 'Seis exteriores conectados · catorce interiores · plano de revisión, no mapa de viaje rápido', font=small, fill='#d5e5dd')
manifest = json.loads(Path('docs/diseno/jonia/interiores/ordenes.json').read_text())['instances']
for index, id in enumerate(IDS):
    cfg = json.loads(Path(f'src/data/world/regions/ionia/zones/{id}/map.json').read_text())
    path = Path('public/' + cfg['tiled']['url'].removeprefix('./').replace('.runtime.json', '.tmj'))
    m = json.loads(path.read_text())
    sets = []
    for s in m['tilesets']:
        tsx = (path.parent / s['source']).resolve()
        t = ET.parse(tsx).getroot()
        sets.append((s['firstgid'], int(t.get('columns')), Image.open(tsx.parent / t.find('image').get('source')).convert('RGBA')))
    sets.sort(key=lambda x: x[0])
    canvas = Image.new('RGBA', (m['width'] * 32, m['height'] * 32))
    for l in m['layers']:
        if l['type'] != 'tilelayer' or not l.get('visible', True):
            continue
        for i, raw in enumerate(l['data']):
            gid = raw & 0x1fffffff
            if not gid:
                continue
            first, cols, atlas = next(s for s in reversed(sets) if s[0] <= gid)
            local = gid - first
            tile = atlas.crop((local % cols * 32, local // cols * 32, local % cols * 32 + 32, local // cols * 32 + 32))
            if raw & 0x20000000:
                tile = tile.transpose(Image.Transpose.TRANSPOSE)
            if raw & 0x80000000:
                tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if raw & 0x40000000:
                tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            canvas.alpha_composite(tile, (i % m['width'] * 32, i // m['width'] * 32))
    x = 30 + index % 2 * 635
    y = 90 + index // 2 * 545
    factor = min(600 / canvas.width, 475 / canvas.height)
    preview = canvas.resize((round(canvas.width * factor), round(canvas.height * factor)), Image.Resampling.NEAREST)
    px = x + (600 - preview.width) // 2
    py = y + 35
    output.paste(preview, (px, py), preview)
    draw.text((x, y), cfg['name'].replace('Jonia — ', ''), font=font, fill='#f3d99b')
    for n, e in enumerate([e for e in manifest if e['zoneId'] == id], 1):
        dx = px + e['door']['x'] * factor
        dy = py + e['door']['y'] * factor
        draw.ellipse((dx-7, dy-7, dx+7, dy+7), fill='#173b50', outline='#ffe4a2', width=2)
        draw.text((dx+9, dy-8), str(n), font=small, fill='#fff0b0', stroke_width=1, stroke_fill='#102b33')
    draw.text((x, y+515), f"JO{index+16} · {len([e for e in manifest if e['zoneId'] == id])} interiores · puertas numeradas", font=small, fill='#c5d8d1')
path = Path('docs/diseno/jonia/ordenes-vista-general.png')
output.save(path)
print(path)
