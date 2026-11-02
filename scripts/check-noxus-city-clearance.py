"""Keep decoration out of door approaches and the planned street widths."""
import json
from pathlib import Path
ZONES=Path(__file__).resolve().parents[1]/'public/assets/world/regions/Noxus/Zones'

for id in ['NO04_Suministros','NO05_Capital_Exterior','NO08_Frontera_Occidental','NO09_Delverhold']:
 m=json.loads((ZONES/id/(id+'.tmj')).read_text(encoding='utf8'));ls={a['name']:a for a in m['layers']};w=m['width'];h=m['height']
 solids=ls['Collisions']['objects']+ls['BridgeRails']['objects']
 def free(x,y):
  if not (0<=x<w and 0<=y<h):return False
  i=y*w+x
  if ls['Vallas']['data'][i] or ls['Obstacles']['data'][i] and not ls['Paths']['data'][i]:return False
  return not any(a['x']<=x*32+16<a['x']+a['width'] and a['y']<=y*32+16<a['y']+a['height'] for a in solids)
 bad=[]
 for o in ls['DesignNotes']['objects']:
  if not any('Entrada prevista' in str(p.get('value','')) for p in o.get('properties',[])):continue
  x=int(o['x']/32);y=int(o['y']/32)
  if not all(free(x+a,y+b) for a in [0,1] for b in [0,1]):bad.append(('entrance',o['name'],x,y))
 route=[]
 if id=='NO04_Suministros':route=[(x,37,2) for x in range(35,68)]+[(x,50,2) for x in range(35,68)]+[(x,y,2) for x in [35,67] for y in range(37,51)]
 if id=='NO09_Delverhold':route=[(x,y,2) for y in [24,37,42] for x in range(15,48)]+[(x,y,2) for x in [15,47] for y in range(24,43)]
 if id=='NO05_Capital_Exterior':route=[(x,y,3) for x in [26,83] for y in range(24,82)]+[(x,20,3) for x in range(14,99)]+[(54,y,4) for y in range(72,81)]
 for x,y,size in route:
  if not all(free(x+a,y+b) for a in range(size) for b in range(size)):bad.append(('corridor',x,y,size))
 assert not bad,(id,bad)
 print(id, 'two-tile entrances and full street clearance: OK')
