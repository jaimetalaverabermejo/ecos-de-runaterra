"""Render authored Tiled before/after details; no generated imagery."""
import argparse,json,subprocess,os,xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
os.chdir(ROOT)
def render(path,m):
 sets=[]
 for s in m['tilesets']:
  tsx=(path.parent/s['source']).resolve();t=ET.parse(tsx).getroot();sets.append((s['firstgid'],int(t.get('columns')),Image.open(tsx.parent/t.find('image').get('source')).convert('RGBA')))
 sets.sort(key=lambda s:s[0])
 out=Image.new('RGBA',(m['width']*32,m['height']*32))
 for l in m['layers']:
  if l['type']!='tilelayer' or not l.get('visible',True):continue
  for i,raw in enumerate(l['data']):
   g=raw&0x1fffffff
   if not g:continue
   f,c,a=next(s for s in reversed(sets) if s[0]<=g);v=g-f;t=a.crop((v%c*32,v//c*32,v%c*32+32,v//c*32+32))
   for flag,op in [(0x20000000,Image.Transpose.TRANSPOSE),(0x80000000,Image.Transpose.FLIP_LEFT_RIGHT),(0x40000000,Image.Transpose.FLIP_TOP_BOTTOM)]:
    if raw&flag:t=t.transpose(op)
   out.alpha_composite(t,(i%m['width']*32,i//m['width']*32))
 return out

parser=argparse.ArgumentParser()
parser.add_argument('--baseline',default='7d99625')
args=parser.parse_args()
spec=json.load(open('docs/diseno/jonia/patrones-exteriores.json'))
out=Image.new('RGB',(1000,2100),'#102b33');draw=ImageDraw.Draw(out)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
for row,e in enumerate(spec['maps']):
 p=Path(e['path']);stair=next(s for s in e['stairs'] if s['orientation']=='vertical' and s['y']<50);x,y=stair['x'],stair['y']
 for col,m in enumerate([json.loads(subprocess.check_output(['git','show',args.baseline+':'+str(p)])),json.load(open(p))]):
  im=render(p,m).crop(((x-5)*32,(y-2)*32,(x+9)*32,(y+7)*32))
  px=18+col*500;py=12+row*350
  draw.text((px,py),f"JO{e['zone']} · "+('ANTES' if col==0 else 'SKILL APLICADA'),font=font,fill='#f3d99b')
  out.paste(im,(px,py+28))
path=Path('docs/diseno/jonia/ordenes-skill-comparativa.png');out.save(path);print(path)
