import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import { atlasView } from '../data/MapAtlas';
import type { SaveGame } from '../state/GameState';
import { Ui960Kit } from '../ui/components/Ui960Kit';
import { ConsoleInput } from '../input/ConsoleInput';

/** Root of the atlas. Region sheets can later sit over a world illustration
 * without changing local views, location resolution or save data. */
export class WorldMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedRegionId='ionia';
  private regions=['ionia','bandle-city'];
  private focus!: Phaser.GameObjects.Rectangle;
  private status!: Phaser.GameObjects.Text;
  constructor(){super('WorldMapScene');}
  create():void {
    configureSceneLayout(this,'native-960');
    this.save=this.registry.get('save') as SaveGame;
    this.selectedRegionId=this.regions.includes(this.save.worldProgress.currentRegionId)?this.save.worldProgress.currentRegionId:'ionia';
    this.cameras.main.setBackgroundColor('#071a27');
    Ui960Kit.label(this,24,22,'ATLAS DE RUNATERRA','25px','#f4ce75',true);
    Ui960Kit.label(this,24,59,'REGIÓN  /  ISLA  /  ZONA · Selecciona una región para consultar sus mapas','12px','#a9c6d2');
    this.regions.forEach((id,i)=>{
      const x=24+i*464, view=atlasView(id);
      const image=this.add.image(x+220,225,view.texture!);
      const source=image.texture.getSourceImage();image.setScale(Math.min(440/source.width,248/source.height));
      this.add.rectangle(x,101,440,248,0,0).setOrigin(0).setStrokeStyle(1,0x345566);
      this.add.rectangle(x,349,440,62,0x102d3c).setOrigin(0);
      Ui960Kit.label(this,x+16,361,view.name.toUpperCase(),'20px','#ffffff',true);
      const current=this.save.worldProgress.currentRegionId===id;
      Ui960Kit.label(this,x+16,390,current?'◉ ESTÁS AQUÍ':this.available(id)?'CONSULTAR MAPAS':'REGIÓN PENDIENTE','11px',current?'#68f5ed':'#a9c6d2',true);
      const hit=this.add.rectangle(x,101,440,310,0,0).setOrigin(0).setInteractive({useHandCursor:true});
      hit.on('pointerup',()=>{this.selectedRegionId=id;this.refreshDetails();this.openSelectedRegion();});
    });
    this.focus=this.add.rectangle(24,101,440,310,0,0).setOrigin(0).setStrokeStyle(3,0xf4ce75);
    this.status=Ui960Kit.label(this,24,429,'','13px','#68f5ed',true);
    const future=DataRegistry.worldRegions().filter(r=>!this.regions.includes(r.id)).map(r=>r.name);
    Ui960Kit.label(this,24,454,'OTRAS REGIONES · '+future.join(' · '),'11px','#829eac').setWordWrapWidth(904);
    Ui960Kit.label(this,24,513,'Dirección: elegir · A: abrir · B: menú','11px','#a9c6d2');
    Ui960Kit.button(this,864,511,144,38,'MENÚ',()=>this.scene.start('MenuScene'),{fontSize:'12px'});
    this.refreshDetails();
    const key=(e:KeyboardEvent)=>{
      if(e.repeat)return;
      if(e.key==='Escape')this.scene.start('MenuScene');
      else if(e.key==='Enter'||e.key===' ')this.openSelectedRegion();
      else if(e.key.startsWith('Arrow'))this.cycle();
    };
    this.input.keyboard?.on('keydown',key);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.input.keyboard?.off('keydown',key));
  }
  private available(id:string):boolean {
    return id===this.save.worldProgress.currentRegionId || this.save.worldProgress.unlockedRegions.includes(id)||DataRegistry.worldRegion(id).enabled;
  }
  private cycle():void {this.selectedRegionId=this.regions[(this.regions.indexOf(this.selectedRegionId)+1)%this.regions.length];this.refreshDetails();}
  private refreshDetails():void {
    this.focus.setX(24+this.regions.indexOf(this.selectedRegionId)*464);
    this.status.setText(this.available(this.selectedRegionId)?'A · ABRIR '+atlasView(this.selectedRegionId).name.toUpperCase():'Continúa la aventura para descubrir esta región.');
  }
  private openSelectedRegion():void {
    if(this.available(this.selectedRegionId))this.scene.start('RegionMapScene',{viewId:this.selectedRegionId});
  }
  update():void {
    if(ConsoleInput.consumeDirection())this.cycle();
    if(ConsoleInput.consumeA())this.openSelectedRegion();
    if(ConsoleInput.consumeB())this.scene.start('MenuScene');
  }
}
