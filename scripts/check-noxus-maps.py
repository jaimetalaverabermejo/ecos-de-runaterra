from pathlib import Path
import json,sys,hashlib,xml.etree.ElementTree as ET
from collections import deque
REPO=Path(__file__).resolve().parents[1];ZONES=REPO/'public/assets/world/regions/Noxus/Zones';ENTRIES={m['id']:m for m in json.loads((ZONES.parent/'manifest.json').read_text(encoding='utf-8'))['maps']}
maps={p.stem:(p,json.loads(p.with_suffix('.runtime.json').read_text(encoding='utf-8'))) for p in sorted(ZONES.glob('*/*.tmj'))}
report=[]
def inspect(id,p,m):
 w,h=m['width'],m['height'];layers={l['name']:l for l in m['layers']};meta=ENTRIES[id]
 errors=[]
 source=json.loads(p.read_text(encoding='utf-8'))
 for l in source['layers']:
  if 'data' in l and l['data']!=layers[l['name']]['data']:errors.append('Stale runtime '+l['name'])
 for s in source['tilesets']:
  for field in ['source','image']:
   if s.get(field) and not (p.parent/s[field]).is_file():errors.append('Missing source dependency '+s[field])
 for l in m['layers']:
  if 'data' in l:
   if len(l['data'])!=w*h:errors.append('Malformed layer '+l['name'])
   for g in l['data']:
    if not g:continue
    v=g&0x1fffffff;s=max((s for s in m['tilesets'] if s['firstgid']<=v),key=lambda s:s['firstgid'])
    if v>=s['firstgid']+s['tilecount']:errors.append('Invalid GID '+str(v));break
 obstacles=layers['Obstacles']['data'];paths=layers['Paths']['data'];vallas=layers['Vallas']['data'];collisions=layers['Collisions']['objects']+layers.get('BridgeRails',{}).get('objects',[])
 def blocked(x,y):
  if not(0<=x<w and 0<=y<h):return True
  i=y*w+x
  if vallas[i] or (obstacles[i] and not paths[i]):return True
  px=x*32+16;py=y*32+16
  return any(c['x']<=px<c['x']+c['width'] and c['y']<=py<c['y']+c['height'] for c in collisions)
 starts=layers['Spawns']['objects'];s=starts[0];start=(int((s['x']+s['width']/2)//32),int((s['y']+s['height']/2)//32))
 seen={start};q=deque([start])
 if blocked(*start):errors.append('Initial spawn blocked '+str(start))
 while q:
  x,y=q.popleft()
  for a,b in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
   if (a,b) in seen or blocked(a,b):continue
   if b<y and (layers['Ledges_down']['data'][b*w+a] or layers['Ledges_down']['data'][y*w+x]):continue
   seen.add((a,b));q.append((a,b))
 for s in starts:
  a=int((s['x']+s['width']/2)//32);b=int((s['y']+s['height']/2)//32)
  if (a,b) not in seen:errors.append('Unreachable spawn '+s['name']+' '+str((a,b)))
 runtime_links=[]
 for portal in layers['Portals']['objects']:
  props={p['name']:p['value'] for p in portal.get('properties',[])}
  runtime_links.append({'name':portal['name'],'target':props.get('targetMap'),'spawn':props.get('targetSpawn'),'x':int(portal['x']/32),'y':int(portal['y']/32),'w':int(portal['width']/32),'h':int(portal['height']/32),'blocked':bool(props.get('requiredFlag'))})
 for link in runtime_links:
  target=link['target'];spawn=link['spawn']
  if target not in maps:errors.append('Missing target '+target);continue
  tm=maps[target][1];sl=next(l for l in tm['layers'] if l['name']=='Spawns')['objects']
  if not any(o['name']==spawn for o in sl):errors.append('Missing target spawn '+target+'/'+spawn)
  reverse=next(l for l in tm['layers'] if l['name']=='Portals')['objects']
  if not any(any(v['name']=='targetMap' and v['value']==id for v in o.get('properties',[])) for o in reverse):errors.append('Missing return from '+target)
  if not link.get('blocked') and not any((x,y) in seen for x in range(link['x'],link['x']+link['w']) for y in range(link['y'],link['y']+link['h'])):errors.append('Unreachable exit '+link['name'])
 for goal in meta['landmarks']:
  x,y=goal['x'],goal['y']
  if (x,y) not in seen:errors.append('Unreachable landmark '+goal['name']+' '+str((x,y)))
 for stair in meta.get('stairs',[]):
  x,y=stair['x'],stair['y']
  for yy in [y,y+4]:
   if any(obstacles[yy*w+xx] for xx in [x,x+1]):errors.append('Rock on stair landing '+str((x,yy)))
  rows=[paths[yy*w+x:yy*w+x+2] for yy in range(y+1,y+4)]
  if rows[0]!=rows[1] or rows[1]!=rows[2]:errors.append('Unequal stair central rows '+str((x,y)))
  for yy in range(y+1,y+4):
   if not all(obstacles[yy*w+xx] for xx in [x-1,x,x+1,x+2]):errors.append('Missing stair wall/body '+str((x,yy)))
 if id=='NO01_Puerto':
  source=json.loads(p.read_text(encoding='utf-8'));digest=hashlib.sha256(json.dumps([l['data'] for l in source['layers'] if l['type']=='tilelayer'],separators=(',',':')).encode()).hexdigest()
  if digest!=meta['protectedTileDigest']:errors.append('NO01 authored tiles changed')
 return {'id':id,'size':[w,h],'reachableTiles':len(seen),'spawns':len(starts),'landmarks':len(meta['landmarks']),'errors':errors}
for id,(p,m) in maps.items():
 r=inspect(id,p,m);report.append(r);print(id,'reachable',r['reachableTiles'],'errors',len(r['errors']))
 for error in r['errors']:print('  '+error)
assert len(maps)==10, 'Expected ten regional Tiled maps'
sys.exit(1 if any(r['errors'] for r in report) else 0)
