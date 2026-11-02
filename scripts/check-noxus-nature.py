"""Validate the scoped Noxus nature revision and preserve Jaime's closed maps."""
import hashlib
import json
from pathlib import Path
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
REGION=ROOT/'public/assets/world/regions/Noxus'
META=json.loads((REGION/'manifest.json').read_text(encoding='utf8'))
MAPS={a['id']:a for a in META['maps']}

def source(id):return json.loads((REGION/'Zones'/id/(id+'.tmj')).read_text(encoding='utf8'))
def digest(data):return hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()

for id,expected in META['manualSourceHashes'].items():
    raw=(REGION/'Zones'/id/(id+'.tmj')).read_bytes().replace(b'\r\n',b'\n')
    assert hashlib.sha256(raw).hexdigest()==expected,'Closed authored source changed: '+id
for id in ['NO01_Puerto','NO03_Basilich']:
    assert not any(next(l['data'] for l in source(id)['layers'] if l['name']=='TallGrass'))

def ground_water(g):return (g&0x1fffffff)==3680
def island_digest(m):
    layers={l['name']:l for l in m['layers']};w=m['width'];ground=layers['Ground']['data'];data=[]
    for l in m['layers']:
        if 'data' not in l:continue
        values=[(i,g) for i,g in enumerate(l['data']) if i%w>=50 and not(l['name']=='Obstacles' and ground_water(ground[i]) and 3655<=(g&0x1fffffff)<5047)]
        data.append((l['name'],values))
    return digest(data)

for id in ['NO02_Cruce_Caravanas','NO04_Suministros','NO07_Memorial_Sion','NO08_Frontera_Occidental']:
    m=source(id);meta=MAPS[id];ls={l['name']:l for l in m['layers']};w=m['width'];h=m['height']
    solids=ls['Collisions']['objects']+ls['BridgeRails']['objects'];paths=ls['Paths']['data'];obs=ls['Obstacles']['data']
    def free(x,y):
        if not(0<=x<w and 0<=y<h):return False
        i=y*w+x
        if ls['Vallas']['data'][i] or obs[i] and not paths[i]:return False
        return not any(o['x']<=x*32+16<o['x']+o['width'] and o['y']<=y*32+16<o['y']+o['height'] for o in solids)
    spawn=ls['Spawns']['objects'][0];start=(int((spawn['x']+spawn['width']/2)/32),int((spawn['y']+spawn['height']/2)/32))
    seen={start};q=deque([start])
    while q:
        x,y=q.popleft()
        for a,b in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
            if (a,b) in seen or not free(a,b):continue
            if b<y and (ls['Ledges_down']['data'][b*w+a] or ls['Ledges_down']['data'][y*w+x]):continue
            seen.add((a,b));q.append((a,b))
    grass={(i%w,i//w) for i,g in enumerate(ls['TallGrass']['data']) if g}
    assert grass,'No grass in '+id
    assert grass<=seen,(id,'Unreachable tall grass',sorted(grass-seen)[:12])
    for x,y in grass:
        i=y*w+x
        assert not ground_water(ls['Ground']['data'][i]) and not paths[i] and not obs[i]
        if id=='NO04_Suministros':assert not(29<=x<75 and 22<=y<62)
        if id=='NO07_Memorial_Sion':assert x<50,'Grass reached the memorial island'
        if id=='NO08_Frontera_Occidental':assert not(99<=x and 10<=y<=41)
    for patch in meta['grassPatches']:
        assert patch['cells'] and all(tuple(p) in grass for p in patch['cells'])
    for item in meta['natureRevision']['relief']:
        if 'ledge' not in item:continue
        x,y,n=item['ledge']
        for xx in range(x,x+n):
            assert free(xx,y-1) and free(xx,y+1),(id,'Blocked ledge approach or landing',xx,y)
    if id=='NO04_Suministros':
        interior=[(l['name'],[(i,g) for i,g in enumerate(l['data']) if 29<=i%w<75 and 22<=i//w<62]) for l in m['layers'] if 'data' in l]
        assert digest(interior)==meta['protectedUrbanTileDigest'],'Authored supply compound changed'
    if id=='NO07_Memorial_Sion':
        assert island_digest(m)==meta['protectedIslandTileDigest'],'Memorial island changed'
        def water_cell(x,y):
            return 0<=x<w and 0<=y<h and ground_water(ls['Ground']['data'][y*w+x]) and 3655<=(obs[y*w+x]&0x1fffffff)<5047
        water_seen={(20,51)};q=deque(water_seen)
        while q:
            x,y=q.popleft()
            for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if p not in water_seen and water_cell(*p):water_seen.add(p);q.append(p)
        assert (99,60) in water_seen,'River does not reach the sea'
    print(id,len(grass),'reachable grass tiles;',len(meta['grassPatches']),'clearings; relief and authored protection OK')
print('Closed maps unchanged; grass remains outside towns and the memorial island: OK')
