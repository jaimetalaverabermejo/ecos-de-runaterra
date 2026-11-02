"""Verify the authored canyon route and preservation of the other nine maps."""
from pathlib import Path
from collections import deque
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
REGION = ROOT / 'public/assets/world/regions/Noxus'
manifest = json.loads((REGION / 'manifest.json').read_text(encoding='utf8'))
entries = {m['id']: m for m in manifest['maps']}
meta = entries['NO10_Ironspike']
source = json.loads((ROOT / meta['path']).read_text(encoding='utf8'))
w, h = source['width'], source['height']
layers = {l['name']: l for l in source['layers']}
assert (w, h) == (152, 64)
protected = manifest['ironspikeProtectedSourceHashes']
assert len(protected) == 9 and 'NO10_Ironspike' not in protected
for key, digest in protected.items():
    raw = (ROOT / entries[key]['path']).read_bytes().replace(b'\r\n', b'\n')
    assert hashlib.sha256(raw).hexdigest() == digest, 'Changed protected source: ' + key

obstacles, paths, fences = [layers[n]['data'] for n in ['Obstacles', 'Paths', 'Vallas']]
rects = layers['Collisions']['objects'] + layers['BridgeRails']['objects']
blocked = set()
for y in range(h):
    for x in range(w):
        i = y*w+x
        if fences[i] or (obstacles[i] and not paths[i]) or any(
            r['x'] <= x*32+16 < r['x']+r['width'] and
            r['y'] <= y*32+16 < r['y']+r['height'] for r in rects
        ):
            blocked.add((x,y))

def flood(extra=()):
    solid = blocked | set(extra)
    seen = {(5,52)}
    assert not seen & solid, 'Blocked arrival'
    queue = deque(seen)
    while queue:
        x,y = queue.popleft()
        for a,b in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
            if 0 <= a < w and 0 <= b < h and (a,b) not in solid and (a,b) not in seen:
                seen.add((a,b)); queue.append((a,b))
    return seen

if 'approvedNavigationDigest' in meta['gorge']:
    ordered = [[x,y] for y in range(h) for x in range(w) if (x,y) in blocked]
    assert hashlib.sha256(json.dumps(ordered,separators=(',',':')).encode()).hexdigest() == meta['gorge']['approvedNavigationDigest'], 'Visual revision changed approved navigation'
    retained = {n:layers[n]['data'] for n in sorted(layers) if 'data' in layers[n] and n not in ['Obstacles','GroundDetails']}
    assert hashlib.sha256(json.dumps(retained,separators=(',',':')).encode()).hexdigest() == meta['gorge']['approvedRouteLayerDigest'], 'Approved route, stairs or terrain changed'

seen = flood()
exit_cell = (148,20)
assert exit_cell in seen, 'No route through gorge'
for point in meta['landmarks']:
    assert (point['x'],point['y']) in seen, 'Unreachable landmark: '+point['name']
for patch in meta['grassPatches']:
    assert all(tuple(p) in seen for p in patch['cells']), 'Unreachable grass'
bridges = meta['gorge']['orderedBridges']
assert len(bridges) == 3
for bridge in bridges:
    x,y,n = bridge['x'],bridge['y'],bridge['length']
    middle = y+n//2
    assert exit_cell not in flood([(x+1,middle),(x+2,middle)]), 'Bypass around required bridge'
    assert all((xx,yy) not in blocked for xx in [x+1,x+2] for yy in range(y,y+n)), 'Narrow bridge'
stairs = meta['stairs']
assert len(stairs) == 8
for stair in stairs:
    x,y = stair['x'],stair['y']
    assert all((xx,yy) not in blocked for xx in [x,x+1] for yy in range(y,y+5)), 'Blocked stair'
    assert exit_cell not in flood([(x,y+2),(x+1,y+2)]), 'Unintended bypass around terrace stair'
water = layers['Ground']['data']
bridge_cells = {(xx,yy) for b in bridges for xx in range(b['x'],b['x']+4) for yy in range(b['y'],b['y']+b['length'])}
for y in range(h):
    for x in range(w):
        if water[y*w+x] == 3680 and paths[y*w+x]:
            assert (x,y) in bridge_cells, 'Road painted across water'
print(f'Ironspike: {len(seen)} reachable tiles; three required bridges; eight required stairs; nine other source maps unchanged.')
