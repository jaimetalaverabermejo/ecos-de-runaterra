from PIL import Image, ImageDraw
from pathlib import Path
import json

ROOT=Path('public/assets/ui/ui_960_v1')
ROOT.mkdir(parents=True, exist_ok=True)
C={'ink':'#050d19','bg':'#101f30','top':'#1b3447','edge':'#315063','gold':'#b79a63','hi':'#f1d899','shade':'#665338','cyan':'#83d8d6','white':'#e7ece0'}

def new(w,h): return Image.new('RGBA',(w,h),(0,0,0,0))
def dia(d,x,y,r,c): d.polygon([(x,y-r),(x+r,y),(x,y+r),(x-r,y)],fill=c)
def frame(w,h,state='base',ornament=True,alt=False,uniform=False):
    im=new(w,h); d=ImageDraw.Draw(im); disabled=state=='disabled'; selected=state=='selected'
    def poly(n,c,k):
        x=y=n; r=w-1-n; b=h-1-n
        d.polygon([(x+k,y),(r-k,y),(r,y+k),(r,b-k),(r-k,b),(x+k,b),(x,b-k),(x,y+k)],fill=c)
    gold='#59616a' if disabled else '#9bdad8' if alt else C['gold']; hi='#77848a' if disabled else '#edfff0' if selected else C['hi']; shadow='#2b3942' if disabled else C['shade']
    poly(0,C['ink'],6); poly(1,shadow,5); poly(2,gold,4); poly(3,'#334c5b',3); poly(4,C['ink'],2); poly(5,C['bg'] if not alt else '#152b38',1)
    if not uniform:
        for yy,c in [(6,'#1a3144'),(10,'#182e40'),(17,'#15293b'),(h//2,'#122436'),(h-13,'#102131')]:
            if 6<=yy<h-6: d.rectangle((6,yy,w-7,h-7),fill=c if not disabled else '#202c36')
    d.line((7,2,w-8,2),fill=hi); d.line((2,7,2,h-8),fill=gold); d.line((7,h-3,w-8,h-3),fill=shadow); d.line((w-3,7,w-3,h-8),fill=shadow)
    if selected:
        d.line((9,4,w-10,4),fill=C['cyan']); d.line((4,9,4,h-10),fill='#4c919b'); d.line((9,h-5,w-10,h-5),fill='#477982')
    if ornament:
        for sx,sy in [(1,1),(-1,1),(1,-1),(-1,-1)]:
            def xy(x,y): return (x if sx==1 else w-1-x, y if sy==1 else h-1-y)
            d.line([xy(6,18),xy(6,9),xy(9,6),xy(18,6)],fill=gold); d.line([xy(7,15),xy(7,10),xy(10,7),xy(15,7)],fill=shadow); d.polygon([xy(8,8),xy(11,8),xy(8,11)],fill=hi)
    return im

PAL=[['#322e40','#655363','#b49a9d','#e5d4c1','#fff4d7'],['#251d47','#503974','#8560ae','#bf97e3','#eee0ff'],['#123f49','#236f74','#44ad9e','#8bdfc3','#ddffdc'],['#493c31','#84603c','#c09452','#ecc884','#fff0bc'],['#173e37','#30694c','#569655','#91c765','#d9ef9a'],['#28283b','#4c465d','#81788d','#bdb2be','#eee1d8'],['#583d39','#a77240','#deb05e','#ffe095','#fff7d1'],['#2b1742','#59245e','#96439c','#d07cce','#ffd1f6'],['#17374f','#2e637d','#509bab','#8bd2d2','#d4fff0']]

def type_icon(kind):
    p=PAL[kind]; im=new(24,24); d=ImageDraw.Draw(im)
    if kind==0:
        d.polygon([(15,2),(20,2),(20,6),(10,16),(7,13)],fill=p[0]); d.polygon([(16,3),(19,3),(19,6),(10,15),(8,13)],fill=p[2]); d.line((17,4,9,12),fill=p[4],width=2); d.line((6,12,12,18),fill='#e4b865',width=2); d.line((8,17,4,21),fill='#bd8451',width=3)
    elif kind==1:
        d.polygon([(12,2),(18,8),(16,16),(12,22),(7,16),(6,8)],fill=p[0]); d.polygon([(12,4),(16,8),(15,15),(12,20),(9,15),(8,8)],fill=p[2]); d.polygon([(12,4),(12,13),(8,8)],fill=p[4]); d.line((2,15,20,8),fill=p[3],width=1)
    elif kind==2:
        d.ellipse((5,6,19,20),fill=p[0]); d.ellipse((7,7,17,17),fill=p[2]); d.polygon([(11,1),(13,7),(9,9)],fill=p[3]); d.arc((2,9,17,23),30,230,fill=p[4],width=2)
    elif kind==3:
        d.ellipse((4,4,20,20),fill=p[0]); d.ellipse((6,6,18,18),fill=p[2]); d.rectangle((10,0,14,6),fill=p[2]); d.rectangle((10,18,14,23),fill=p[2]); d.rectangle((0,10,6,14),fill=p[2]); d.rectangle((18,10,23,14),fill=p[2]); d.ellipse((9,9,15,15),fill='#17374f'); d.rectangle((11,11,13,13),fill='#9cf1e4')
    elif kind==4:
        d.polygon([(21,2),(18,14),(12,20),(5,18),(3,13),(7,8),(14,6)],fill=p[0]); d.polygon([(19,4),(17,13),(12,18),(7,17),(5,13),(9,9),(15,7)],fill=p[2]); d.line((4,22,18,5),fill=p[4],width=2); d.line((10,15,9,10),fill=p[3],width=1)
    elif kind==5:
        d.ellipse((4,2,20,17),fill=p[2]); d.rectangle((8,13,16,21),fill=p[2]); d.ellipse((7,8,11,12),fill=p[0]); d.ellipse((14,8,18,12),fill=p[0]); d.polygon([(12,12),(14,16),(10,16)],fill=p[0]); d.line((9,19,15,19),fill=p[4],width=1)
    elif kind==6:
        d.polygon([(12,0),(15,7),(23,5),(18,12),(23,19),(15,17),(12,24),(9,17),(1,19),(6,12),(1,5),(9,7)],fill=p[0]); d.ellipse((6,6,18,18),fill=p[2]); d.ellipse((8,8,16,16),fill=p[3]); d.polygon([(12,8),(16,12),(12,16),(8,12)],fill=p[4])
    elif kind==7:
        d.polygon([(1,12),(7,6),(12,3),(17,6),(23,12),(17,18),(12,21),(7,18)],fill=p[0]); d.polygon([(4,12),(8,8),(12,6),(17,9),(20,12),(16,16),(12,18),(8,16)],fill=p[2]); d.ellipse((9,8,15,16),fill=p[4]); d.rectangle((11,9,13,15),fill='#3d164f')
    else:
        d.polygon([(7,2),(17,2),(20,6),(18,20),(14,22),(6,20),(4,16),(5,6)],fill=p[0]); d.polygon([(8,4),(16,4),(18,7),(16,18),(13,20),(8,18),(6,15),(7,7)],fill=p[2]); d.line((12,6,12,17),fill=p[4],width=2); d.line((12,7,16,10,12,13,9,10),fill=p[4],width=1)
    return im

def action_icon(kind):
    im=new(24,24); d=ImageDraw.Draw(im); o='#091728'; a='#468d9d'; b='#8bd8d5'; c='#e3fff0'
    if kind=='switch':
        d.polygon([(2,5),(15,5),(15,2),(22,8),(15,14),(15,11),(2,11)],fill=a); d.polygon([(22,14),(9,14),(9,11),(2,17),(9,22),(9,19),(22,19)],fill=b); d.line((3,6,15,6),fill=c)
    elif kind=='items':
        d.rectangle((8,2,15,6),fill='#99744d'); d.polygon([(7,6),(16,6),(20,11),(20,19),(17,22),(6,22),(3,19),(3,11)],fill=o); d.polygon([(5,13),(18,13),(18,18),(16,20),(7,20),(5,18)],fill='#38aba9'); d.line((6,13,17,13),fill=b)
    else:
        d.ellipse((14,1,19,6),fill=b); d.line((13,8,9,14,15,17,12,22),fill=a,width=3); d.line((11,9,6,9,3,13),fill=b,width=2); d.line((15,10,19,13,22,11),fill=c,width=2); d.line((9,14,6,19,2,19),fill=b,width=3)
    return im

def status_icon(kind):
    im=new(16,16); d=ImageDraw.Draw(im)
    if kind=='poison': d.polygon([(8,1),(13,8),(12,13),(8,15),(3,13),(2,9),(5,4)],fill='#75bb64'); d.polygon([(8,4),(10,8),(8,12),(5,10)],fill='#c6e68d')
    elif kind=='blind': d.polygon([(1,8),(5,4),(11,4),(15,8),(11,12),(5,12)],fill='#8ac6cf'); d.ellipse((6,6,10,10),fill='#dae8d8'); d.line((3,14,13,2),fill='#e79b76',width=2)
    elif kind=='stun': d.polygon([(8,0),(10,5),(15,5),(11,9),(13,15),(8,12),(3,15),(4,9),(0,5),(6,5)],fill='#e3bd6e')
    elif kind=='shield': d.polygon([(8,1),(14,4),(13,10),(8,15),(2,10),(1,4)],fill='#468ba9'); d.polygon([(8,2),(8,12),(4,9),(3,5)],fill='#a0dce0')
    elif kind=='evasion': d.line((1,4,11,4,15,7,11,11,5,11),fill='#84d5c8',width=2); d.line((1,14,9,14),fill='#477d86',width=2)
    elif kind=='polymorph': d.ellipse((2,5,12,12),fill='#e2d6de'); d.rectangle((10,4,14,8),fill='#786b95'); d.line((4,12,4,14),fill='#776387'); d.line((10,12,10,14),fill='#776387')
    else: d.line((4,2,1,6,1,10,4,14),fill='#966cae',width=2); d.line((11,2,14,6,14,10,11,14),fill='#966cae',width=2); d.polygon([(7,1),(11,7),(8,7),(9,14),(4,7),(7,7)],fill='#d4afe0')
    return im

def bomb(state):
    im=new(28,28); d=ImageDraw.Draw(im); d.ellipse((4,8,23,26),fill='#071522'); d.ellipse((5,9,22,25),fill=['#344c5a','#615454','#955743','#c66941'][state]); d.ellipse((6,10,18,21),fill=['#526b75','#88735b','#bd8050','#eaaa55'][state]); d.rectangle((10,6,17,9),fill='#586675'); d.line((14,6,14,3,19,3,21,6),fill='#edca87',width=2)
    for n in range(3): d.rectangle((8+n*4,21,10+n*4,23),fill='#ffdb83' if n<state else '#223545')
    if state: dia(d,21,6,3,'#b76c40'); dia(d,21,6,1,'#fff4b3')
    return im

assets={}
def put(name,im): assets[name]=im
put('02_panel_enemy.png',frame(420,102)); put('03_panel_player.png',frame(368,94)); put('04_dialog_panel.png',frame(938,64))
for n,st in [('05_skill_card_base.png','base'),('06_skill_card_selected.png','selected'),('07_skill_card_disabled.png','disabled')]: put(n,frame(144,110,st,False))
for n,st in [('08_side_button_base.png','base'),('09_side_button_selected.png','selected'),('10_side_button_disabled.png','disabled')]: put(n,frame(168,48,st,False))
for n,h in [('23_hp_bar_frame_enemy.png',17),('24_hp_bar_frame_player.png',17),('26_exp_bar_frame_player.png',12)]:
    im=new(288,h); d=ImageDraw.Draw(im); d.polygon([(3,0),(284,0),(287,3),(287,h-4),(284,h-1),(3,h-1),(0,h-4),(0,3)],fill=C['ink']); d.line([(3,1),(284,1),(286,3),(286,h-4),(284,h-2),(3,h-2),(1,h-4),(1,3),(3,1)],fill=C['gold'] if h==17 else '#487783'); yy=4 if h==17 else 2; d.rectangle((4,yy,283,yy+7),fill='#0a1926'); put(n,im)
for n,filled in [('29_rank_dot_filled.png',True),('30_rank_dot_empty.png',False)]:
    im=new(8,8); d=ImageDraw.Draw(im); d.polygon([(2,0),(5,0),(7,2),(7,5),(5,7),(2,7),(0,5),(0,2)],fill=C['ink']); d.rectangle((1,1,6,6),fill=C['gold'] if filled else '#355461'); d.rectangle((2,2,5,5),fill='#ebce86' if filled else '#112334'); put(n,im)
for i,name in enumerate(['marcial','arcano','espiritual','tecnologico','primordial','sombrio','celestial','vacio','runico']): put(f'{11+i:02d}_type_{name}.png',type_icon(i))
for n,k in [('20_action_switch.png','switch'),('21_action_items.png','items'),('22_action_flee.png','flee')]: put(n,action_icon(k))
for i,k in enumerate(['poison','blind','stun','shield','evasion','polymorph','banish']): put(f'{31+i:02d}_status_{k}.png',status_icon(k))
for i in range(4): put(f'{38+i:02d}_bomb_charge_{i}.png',bomb(i))

W=1024; pad=2; x=y=pad; rowh=0; placements=[]
for name,im in assets.items():
    w,h=im.size
    if x+w+pad>W: x=pad; y+=rowh+pad; rowh=0
    placements.append((name,im,x,y)); x+=w+pad; rowh=max(rowh,h)
H=y+rowh+pad; atlas=new(W,H); frames={}
for name,im,x,y in placements:
    atlas.alpha_composite(im,(x,y)); frames[name]={'frame':{'x':x,'y':y,'w':im.width,'h':im.height},'rotated':False,'trimmed':False,'spriteSourceSize':{'x':0,'y':0,'w':im.width,'h':im.height},'sourceSize':{'w':im.width,'h':im.height}}
atlas.save(ROOT/'ui960-atlas.png',optimize=True)
json.dump({'frames':frames,'meta':{'app':'Ecos de Runaterra','version':'16.1','image':'ui960-atlas.png','format':'RGBA8888','size':{'w':W,'h':H},'scale':'1'}},open(ROOT/'ui960-atlas.json','w'),separators=(',',':'))
print('Generated',len(frames),'UI960 frames',atlas.size)
