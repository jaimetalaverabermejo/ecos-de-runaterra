import Phaser from 'phaser';
import { IONIA_LAND_ROUTES } from '../data/IoniaTravelRoutes';
import ports from '../data/world/regions/ionia/ferries.json';
import { atlasView, atlasPoints, atlasAncestors, atlasContains, currentAtlasZone, type AtlasPoint, type AtlasView } from '../data/MapAtlas';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { RegionMapPointDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { Ui960Kit } from '../ui/components/Ui960Kit';
import { ConsoleInput } from '../input/ConsoleInput';
import { FerryService } from '../systems/world/FerryService';

const MAP = {x:16,y:94,w:672,h:378};
const GOLD=0xf4ce75, CYAN=0x68f5ed;

/** Browsing changes the atlas view only. It never changes the save or travels. */
export class RegionMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private view!: AtlasView;
  private definitions: RegionMapPointDefinition[]=[];
  private points: AtlasPoint[]=[];
  private selectedPointId='';
  private currentZone?: string;
  private selection!: Phaser.GameObjects.Arc;
  private detailName!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[]=[];
  private sea!: Phaser.GameObjects.Graphics;
  private connections!: Phaser.GameObjects.Graphics;
  private detailStatus!: Phaser.GameObjects.Text;
  constructor() { super('RegionMapScene'); }

  create(data: {viewId?: string; selectedId?: string} = {}): void {
    configureSceneLayout(this,'native-960');
    this.save=this.registry.get('save') as SaveGame;
    this.view=atlasView(data.viewId ?? (this.save.worldProgress.currentRegionId==='ionia'?'ionia':'bandle-city'));
    this.definitions=DataRegistry.regionMap(this.view.regionId==='ionia'?'ionia-region-map':'bandle-city-region-map').points;
    // Do not show a false location when browsing a different region.
    this.currentZone=this.view.regionId===this.save.worldProgress.currentRegionId
      ? currentAtlasZone(this.save.currentMapId,this.save.worldProgress.currentZoneId,this.definitions) : undefined;
    this.points=atlasPoints(this.view,this.definitions);
    this.selectedPointId=data.selectedId ?? this.points.find(p=>atlasContains(p,this.currentZone))?.id ?? this.points[0].id;
    this.rows=[];
    this.cameras.main.setBackgroundColor('#071a27');
    this.add.rectangle(0,0,960,64,0x0e2938).setOrigin(0);
    let crumbX=18;
    for (const crumb of atlasAncestors(this.view.id)) {
      const label=this.text(crumbX,12,crumb.name.toUpperCase(),13,'#f4ce75');
      label.setInteractive({useHandCursor:true}).on('pointerup',()=>this.open(crumb.id));
      crumbX+=label.width+22;
    }
    this.text(18,38,'ATLAS  /  '+(this.view.parent==='ionia'?'DETALLE DE ZONAS':'VISTA REGIONAL')+(this.currentZone?'  ·  '+(this.definitions.find(p=>p.id===this.currentZone)?.name ?? ''):''),11,'#91afbd');
    Ui960Kit.button(this,868,32,148,38,'MI UBICACIÓN',()=>this.locate(),{fontSize:'11px'});
    this.text(18,73,'● Paso a pie     ⚓ Embarque     ┄ Barco (gris: pendiente)     ◆ Portal     ◉ Tú',12,'#d5e8ed');
    const art=this.add.image(MAP.x+MAP.w/2,MAP.y+MAP.h/2,this.view.texture!);
    const source=art.texture.getSourceImage();
    art.setScale(Math.min(MAP.w/source.width,MAP.h/source.height));
    this.add.rectangle(MAP.x,MAP.y,MAP.w,MAP.h,0x000000,0).setOrigin(0).setStrokeStyle(1,0x527382);
    this.connections=this.add.graphics();
    this.drawLand();
    this.sea=this.add.graphics();
    this.points.forEach((p,i)=>this.drawPoint(p,i));
    this.drawPorts();
    this.selection=this.add.circle(0,0,18,0,0).setStrokeStyle(3,GOLD);
    this.drawCurrent();
    this.add.rectangle(704,72,240,400,0x102d3c).setOrigin(0).setStrokeStyle(1,0x345566);
    this.text(720,84,this.view.id==='ionia'?'ELIGE UNA ISLA':'ZONAS Y CONEXIONES',12,'#f4ce75');
    this.points.forEach((p,i)=>{
      const y=112+i*32;
      const hit=this.add.rectangle(716,y,216,29,0x1a3d4d).setOrigin(0).setInteractive({useHandCursor:true});
      const row=this.text(723,y+7,`${String(i+1).padStart(2,'0')}  ${this.name(p)}`,11,'#d4e2e9');
      this.rows.push(row);
      hit.on('pointerup',()=>{this.select(p);if(p.child)this.open(p.child,p.zones?.[0]);});
    });
    this.detailStatus=this.text(720,380,'',11,'#68f5ed');
    this.detailName=this.text(720,400,'',14,'#f4ce75').setWordWrapWidth(208);
    this.detailDescription=this.text(24,489,'',12,'#d0e4ec').setWordWrapWidth(706);
    this.text(24,520,'Dirección: elegir · A: abrir isla · B: subir nivel · El atlas no permite viajar',10,'#91afbd');
    Ui960Kit.button(this,864,503,148,38,'ATRÁS',()=>this.back(),{fontSize:'12px'});
    this.refresh();
    const keys=(event:KeyboardEvent)=>{
      if(event.repeat)return;
      if(event.key==='Escape'||event.key==='Backspace')this.back();
      else if(event.key==='Enter'||event.key===' '){const p=this.points.find(p=>p.id===this.selectedPointId);if(p?.child)this.open(p.child,p.zones?.[0]);}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))this.cycle(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1);
    };
    this.input.keyboard?.on('keydown',keys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',keys));
  }
  private text(x:number,y:number,value:string,size:number,color:string): Phaser.GameObjects.Text {
    return Ui960Kit.label(this,x,y,value,`${size}px`,color,true);
  }
  private xy(p:AtlasPoint): {x:number;y:number} { return {x:MAP.x+p.x*MAP.w,y:MAP.y+p.y*MAP.h}; }
  private name(p:AtlasPoint): string { return p.name ?? this.definitions.find(d=>d.id===p.id)?.name ?? p.id; }
  private select(p:AtlasPoint): void { this.selectedPointId=p.id;this.refresh(); }
  private open(id:string,selectedId?:string):void {
    if(id==='runeterra') {this.scene.start('WorldMapScene');return;}
    this.scene.restart({viewId:id,selectedId});
  }
  private back():void { if(this.view.parent)this.open(this.view.parent);else this.scene.start('MenuScene'); }
  private locate():void {
    const region=this.save.worldProgress.currentRegionId==='ionia'?'ionia':'bandle-city';
    const defs=DataRegistry.regionMap(region==='ionia'?'ionia-region-map':'bandle-city-region-map').points;
    const zone=currentAtlasZone(this.save.currentMapId,this.save.worldProgress.currentZoneId,defs);
    const child=atlasView(region).points.find(p=>atlasContains(p,zone))?.child;
    this.open(child ?? region,zone);
  }
  private drawPoint(p:AtlasPoint,i:number):void {
    const {x,y}=this.xy(p);
    const visited=this.save.worldProgress.unlockedZones.some(z=>atlasContains(p,z));
    const hit=this.add.circle(x,y,14,visited?0x215e5c:0x102838).setStrokeStyle(2,GOLD)
      .setInteractive(new Phaser.Geom.Circle(14,14,22),Phaser.Geom.Circle.Contains);
    this.text(x,y-7,String(i+1),12,'#ffffff').setOrigin(.5,0);
    hit.on('pointerup',()=>{if(this.selectedPointId===p.id&&p.child)this.open(p.child,p.zones?.[0]);else this.select(p);});
    if(p.child) this.text(x,y+19,this.name(p),11,'#ffffff').setOrigin(.5,0).setBackgroundColor('#092333').setPadding(5,3);

    if(p.id==='jo01_koeshin')this.text(x-29,y+11,'◆',20,'#d69dff').setStroke('#082332',4);
  }
  private drawCurrent():void {
    const p=this.points.find(p=>atlasContains(p,this.currentZone));if(!p)return;
    const {x,y}=this.xy(p);
    const halo=this.add.circle(x,y,23,CYAN,.15).setStrokeStyle(4,CYAN);
    this.tweens.add({targets:halo,alpha:.35,scale:1.25,duration:950,yoyo:true,repeat:-1});
    this.text(x,y<MAP.y+50?y+30:y-47,'ESTÁS AQUÍ',11,'#071a27').setOrigin(.5,0).setBackgroundColor('#68f5ed').setPadding(7,4);
    this.text(x,y-25,'▼',19,'#ffffff').setOrigin(.5,0).setStroke('#092333',3);
  }
  private drawLand():void {
    if(this.view.regionId!=='ionia'||this.view.id==='ionia')return;
    for(const [from,to] of IONIA_LAND_ROUTES){
      const a=this.points.find(p=>p.id===from),b=this.points.find(p=>p.id===to);if(!a||!b)continue;
      const start=this.xy(a),end=this.xy(b);
      this.connections.lineStyle(6,0x071a27,.85).lineBetween(start.x,start.y,end.x,end.y);
      this.connections.lineStyle(2,GOLD,.9).lineBetween(start.x,start.y,end.x,end.y);
      this.connections.fillStyle(GOLD).fillCircle((start.x+end.x)/2,(start.y+end.y)/2,4);
    }
  }
  private refresh():void {
    const p=this.points.find(p=>p.id===this.selectedPointId) ?? this.points[0];
    this.drawSea(p);
    const pos=this.xy(p);this.selection.setPosition(pos.x,pos.y);
    this.rows.forEach((row,i)=>row.setColor(this.points[i].id===p.id?'#f4ce75':'#d4e2e9'));
    this.detailName.setText(this.name(p));
    this.detailStatus.setText(atlasContains(p,this.currentZone)?'◉ ESTÁS AQUÍ':p.child?'A · ABRIR DETALLE':this.save.worldProgress.unlockedZones.includes(p.id)?'ZONA VISITADA':'POR EXPLORAR');
    if(p.child){this.detailDescription.setText('Selecciona una isla y pulsa A, o tócala otra vez, para abrir su mapa de detalle.');return;}
    const neighbors=IONIA_LAND_ROUTES.filter(e=>e.includes(p.id)).map(e=>e[0]===p.id?e[1]:e[0]);
    const names=neighbors.map(id=>this.definitions.find(d=>d.id===id)?.name ?? id);
    const ferry=ports.find(port=>port.mapId===p.id);
    const destinations=ferry?ports.filter(port=>FerryService.destination(p.id,`sail:${port.mapId}`,this.save.worldProgress.flags)).map(port=>port.name):[];
    const locked=ferry?ports.filter(port=>port.mapId!==p.id&&!destinations.includes(port.name)).length:0;
    this.detailDescription.setText([names.length?`A pie: ${names.join(' · ')}`:this.definitions.find(d=>d.id===p.id)?.description ?? '',ferry?`⚓ Barco: ${destinations.join(' · ')}${locked?` · ${locked} destino(s) pendiente(s)` : ''}`:''].filter(Boolean).join('\n'));
  }
  private drawPorts():void {
    for(const port of this.view.harbors ?? []){
      const pos=this.xy(port);
      const icon=this.text(pos.x,pos.y,'⚓',21,'#68f5ed').setOrigin(.5).setStroke('#082332',4);
      icon.setInteractive({useHandCursor:true}).on('pointerup',()=>{
        const point=this.points.find(p=>atlasContains(p,port.id));if(point)this.select(point);
      });
    }
  }
  private drawSea(selected:AtlasPoint):void {
    this.sea.clear();
    const harbors=this.view.harbors ?? [];
    const source=harbors.find(p=>atlasContains(selected,p.id));if(!source)return;
    for(const destination of harbors){
      if(source.id===destination.id)continue;
      const available=Boolean(FerryService.destination(source.id,`sail:${destination.id}`,this.save.worldProgress.flags));
      const a=this.xy(source),b=this.xy(destination);
      for(let t=0;t<1;t+=.065){
        const end=Math.min(1,t+.032);
        this.sea.lineStyle(3,available?CYAN:0x78939d,available?.95:.5)
          .lineBetween(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.x+(b.x-a.x)*end,a.y+(b.y-a.y)*end);
      }
    }
  }
  private cycle(delta:number):void {
    const index=this.points.findIndex(p=>p.id===this.selectedPointId);
    this.select(this.points[Phaser.Math.Wrap(index+delta,0,this.points.length)]);
  }
  update():void {
    const direction=ConsoleInput.consumeDirection();
    if(direction&&this.points.length)this.cycle(direction==='up'||direction==='left'?-1:1);
    if(ConsoleInput.consumeA()){const p=this.points.find(p=>p.id===this.selectedPointId);if(p?.child)this.open(p.child,p.zones?.[0]);}
    if(ConsoleInput.consumeB())this.back();
  }
}
