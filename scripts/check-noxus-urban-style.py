"""Check authored Noxus references, street corners and Bastion flank access."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from collections import deque

ROOT=Path(__file__).resolve().parents[1]
ZONES=ROOT/'public/assets/world/regions/Noxus/Zones'
MANIFEST=json.loads((ZONES.parent/'manifest.json').read_text(encoding='utf8'))

def digest(m):
    return hashlib.sha256(json.dumps([l['data'] for l in m['layers'] if l['type']=='tilelayer'],separators=(',',':')).encode()).hexdigest()

for meta in MANIFEST['maps']:
    path=ZONES/meta['id']/(meta['id']+'.tmj')
    m=json.loads(path.read_text(encoding='utf8'))
    if meta.get('protectedTileDigest'):
        assert digest(m)==meta['protectedTileDigest'], 'Manual tiles changed: '+meta['id']
    sets=[]
    for s in m['tilesets']:
        if 'source' in s:
            ts=ET.parse(path.parent/s['source']).getroot()
            sets.append((ts.attrib['name'],s['firstgid'],int(ts.attrib['tilecount'])))
    street=next((s for s in sets if s[0]=='Noxus_calles_32'),None)
    if street:
        assert street[2]==60, 'Expanded street atlas must include the fifth row'
        data=next(l['data'] for l in m['layers'] if l['name']=='Paths')
        width=m['width'];cells={(i%width,i//width) for i,g in enumerate(data) if street[1]<=g<street[1]+60}
        checked=0
        for x,y in cells:
            if not all((x+dx,y+dy) in cells for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)]):continue
            missing=[(dx,dy,v) for dx,dy,v in [(-1,-1,56),(1,-1,57),(-1,1,59),(1,1,58)] if (x+dx,y+dy) not in cells]
            if len(missing)!=1:continue
            assert data[y*width+x]==street[1]+missing[0][2], f'Wrong urban inner corner: {meta["id"]} {x},{y}'
            checked+=1
        print(meta['id'],len(cells),'street cells;',checked,'inner corners OK')
    if meta['id'] in ['NO04_Suministros','NO05_Capital_Exterior','NO08_Frontera_Occidental','NO09_Delverhold']:
        decor=next(s for s in sets if s[0]=='Noxus_decoracion_32')
        obstacles=next(l['data'] for l in m['layers'] if l['name']=='Obstacles')
        runs=0
        for y in range(m['height']):
            x=0
            while x<m['width']:
                local=obstacles[y*m['width']+x]-decor[1]
                if local not in [216,217,218,219,220,221]:x+=1;continue
                row=[]
                while x<m['width'] and obstacles[y*m['width']+x]-decor[1] in [216,217,218,219,220,221]:
                    row.append(obstacles[y*m['width']+x]-decor[1]);x+=1
                if len(row)<3:continue
                assert row==[216]+[217]*(len(row)-2)+[218], f'Horizontal fence uses wrong pieces: {meta["id"]} row {y}'
                runs+=1
        print(meta['id'],runs,'complete horizontal fence spans OK')
    if meta['id']=='NO05_Capital_Exterior':
        layers={l['name']:l for l in m['layers']};w=m['width'];h=m['height']
        obs=layers['Obstacles']['data'];paths=layers['Paths']['data'];vallas=layers['Vallas']['data']
        solids=layers['Collisions']['objects']+layers['BridgeRails']['objects']
        def free(x,y):
            if not(0<=x<w and 0<=y<h):return False
            i=y*w+x
            if vallas[i] or obs[i] and not paths[i]:return False
            return not any(o['x']<=x*32+16<o['x']+o['width'] and o['y']<=y*32+16<o['y']+o['height'] for o in solids)
        # Check a continuous two-tile-wide loop, not just reachable endpoints.
        loop=meta['innerPrecinct']['loop'];left,top=loop[0];right,bottom=loop[2]
        route=[(left,y) for y in range(top,bottom+1)]+[(x,top) for x in range(left,right+1)]+[(right,y) for y in range(top,bottom+1)]+[(x,bottom) for x in range(left,right+1)]
        for x,y in route:
            assert all(free(x+dx,y+dy) for dx in [0,1] for dy in [0,1]), f'Bastion two-tile loop blocked at {x},{y}'
        bastion=next(s for s in sets if s[0]=='Noxus_Bastion_Inmortal_32')
        art=[[(i,g) for i,g in enumerate(l['data']) if bastion[1]<=(g&0x1fffffff)<bastion[1]+bastion[2]] for l in m['layers'] if l['type']=='tilelayer']
        actual=hashlib.sha256(json.dumps(art,separators=(',',':')).encode()).hexdigest()
        assert actual==meta['bastionArtDigest'], 'Approved Bastion sprite moved or changed'
        assert meta['innerPrecinct']['buildings']==4
        assert meta['streetWidths']=={'ceremonial':4,'district':3,'doorConnections':2}
        print('Bastion: original art and continuous two-tile rear/flank circuit OK')
print('Protected authored maps and imperial street geometry: OK')
