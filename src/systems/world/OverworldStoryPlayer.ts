import Phaser from 'phaser';
import { DataRegistry } from '../../data/DataRegistry';
import type { StoryDefinition } from '../../data/storyTypes';
import { MusicManager } from '../audio/MusicManager';
import { worldBlocking } from './WorldStoryCatalog';
export interface WorldStoryActor {
  visual: Phaser.GameObjects.Container;
  sprite?: Phaser.GameObjects.Sprite;
  setPosition(x:number,y:number):void;
}

/** The live map, normal camera and normal dialogue remain in place throughout. */
export class OverworldStoryPlayer {
  private actors = new Map<string,WorldStoryActor>();
  private effects: Phaser.GameObjects.GameObject[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private pending = 0;
  private entered = -1;
  private alive = true;
  private cleanups: Array<()=>void> = [];
  get busy():boolean {return this.pending > 0;}
  constructor(private scene: Phaser.Scene, readonly story: StoryDefinition,
    private resolve: (id:string, championId?:string, actorId?:string)=>WorldStoryActor|undefined) {}

  enter(index:number):void {
    if (index === this.entered) return;
    this.entered=index;
    const blocking=worldBlocking[this.story.id];
    for(const [id,b]of Object.entries(blocking?.actors??{})) {
      if(this.actors.has(id)||(b.enterAt??0)>index)continue;
      let actor=this.resolve(b.npcId??id,b.championId,b.actorId);
      if(!actor&&b.x!==undefined&&b.y!==undefined) {
        const key=b.championId?`${b.championId}-overworld`:`world-actor-${b.actorId}`;
        if(!this.scene.textures.exists(key))continue;
        const scale=b.championId==='ahri'?.54:b.championId?.62:b.actorId?DataRegistry.worldActor(b.actorId).overworldScale??.54:.54;
        const sprite=this.scene.add.sprite(0,7,key,1).setOrigin(.5,1).setScale(scale);
        const visual=this.scene.add.container(b.x,b.y,[sprite]).setDepth(100+b.y);
        this.effects.push(visual);
        actor={visual,sprite,setPosition:(x,y)=>visual.setPosition(x,y).setDepth(100+y)};
      }
      if(actor)this.actors.set(id,actor);
    }
    for(const m of blocking?.motions?.[index]??[])this.move(m.actor,m.points);
    const effect=this.story.beats[index]?.effect;
    if(effect)this.effect(effect);
  }

  private move(id:string,points:Array<{x:number;y:number}>):void {
    const a=this.actors.get(id);if(!a)return;
    this.pending++;
    const next=(i:number):void=>{
      if(!this.alive)return;
      const target=points[i];if(!target){this.pending--;a.sprite?.setFrame(1);return;}
      const from={x:a.visual.x,y:a.visual.y},dx=target.x-from.x,dy=target.y-from.y;
      const row=Math.abs(dx)>Math.abs(dy)?(dx<0?6:9):(dy<0?3:0),progress={value:0};
      this.tweens.push(this.scene.tweens.add({targets:progress,value:1,duration:Math.max(180,Math.hypot(dx,dy)/90*1000),ease:'Linear',
        onUpdate:()=>{a.setPosition(from.x+dx*progress.value,from.y+dy*progress.value);a.sprite?.setFrame(row+[0,1,2,1][Math.floor(this.scene.time.now/130)%4]);},onComplete:()=>next(i+1)}));
    };next(0);
  }

  private effect(kind:string):void {
    const s=this.scene;
    if (kind === 'siege-flank' || kind === 'siege-support') {
      // The visible cast trades blows on the side while the player takes the main pair.
      const defender = this.actors.get('irelia');
      if (kind === 'siege-support' && defender?.sprite) {
        const sprite = defender.sprite;
        sprite.setTint(0xb6f5d8);
        const timer = s.time.delayedCall(1100, () => sprite.active && sprite.clearTint());
        this.cleanups.push(() => { timer.remove(); if (sprite.active) sprite.clearTint(); });
      }
      for (const id of ['enemy1', 'enemy2']) {
        const actor = this.actors.get(id);
        if (!actor?.sprite) continue;
        const sprite = actor.sprite;
        const timer = s.time.delayedCall(id === 'enemy1' ? 700 : 1100, () => {
          if (!sprite.active) return;
          sprite.setTint(0xffb2a2);
          this.tweens.push(s.tweens.add({ targets: sprite, angle: 7, duration: 110, yoyo: true, repeat: 1,
            onComplete: () => { if (sprite.active) sprite.clearTint(); } }));
        });
        this.cleanups.push(() => { timer.remove(); if (sprite.active) { sprite.clearTint(); sprite.setAngle(0); } });
      }
      return;
    }
    if(kind==='spheres'||kind==='surge') {
      const actor=this.actors.get('syndra');if(!actor)return;
      const count=kind==='spheres'?3:1;
      for(let i=0;i<count;i++){
        const orb=s.add.circle(actor.visual.x+28+i*15,actor.visual.y-35-i*9,kind==='spheres'?6:8,0x321746,.98).setStrokeStyle(2,0xb479ef,.9).setDepth(5000);
        this.effects.push(orb);this.tweens.push(s.tweens.add({targets:orb,y:orb.y-9,duration:700+i*130,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}));
        if(kind==='surge'){this.tweens.push(s.tweens.add({targets:orb,scale:5,alpha:0,duration:500,onComplete:()=>orb.destroy()}));s.cameras.main.shake(150,.0015);}
      }
    } else if(kind==='shot') {
      const a=this.actors.get('elan');if(!a)return;
      const streak=s.add.graphics().lineStyle(2,0xe8ddb9,.9).lineBetween(a.visual.x+300,a.visual.y-100,a.visual.x,a.visual.y-25).setDepth(5000);
      this.effects.push(streak);this.pending++;
      s.time.delayedCall(240,()=>{if(!this.alive)return;streak.destroy();this.shotSound();s.cameras.main.shake(120,.0015);a.sprite?.setOrigin(.5,.5).setY(-10);this.tweens.push(s.tweens.add({targets:a.sprite,angle:90,duration:350,onComplete:()=>{this.pending--;}}));});
    } else if(kind==='injury') {
      const a=this.actors.get('elan');if(a?.sprite)this.tweens.push(s.tweens.add({targets:a.sprite,angle:-12,duration:250}));
    } else if(kind==='awakening') {
      // Turn the existing sleeping actor; never overlay a second Daisy on her back.
      const d=this.actors.get('daisy')?.sprite;if(!d)return;
      d.setFrame(4);
      this.pending++;
      s.time.delayedCall(300,()=>{if(this.alive)d.setFrame(7);});
      s.time.delayedCall(650,()=>{if(this.alive){d.setFrame(1);this.pending--;}});
    } else if(kind==='syndra-attire') {
      this.weaveSyndraAttire();
    }
  }
  private weaveSyndraAttire():void {
    const actor=this.actors.get('syndra'),old=actor?.sprite;if(!actor||!old)return;
    const s=this.scene,x=actor.visual.x,y=actor.visual.y;
    const dressed=s.add.sprite(old.x,old.y,'syndra-overworld',1).setOrigin(.5,1).setScale(.5);
    actor.visual.add(dressed);this.effects.push(dressed);
    // Sprite cropping works in Phaser 4 WebGL and Canvas. Geometry masks do not.
    // Reveal one continuous silhouette from the feet up, keeping both feet anchored.
    this.cleanups.push(()=>old.setCrop());
    const ribbons=s.add.graphics().setDepth(actor.visual.depth+1);this.effects.push(ribbons);
    const progress={value:0};this.pending++;
    const draw=()=>{
      const cut=y-65+(1-progress.value)*80;
      const oldTop=y+old.y-old.displayHeight,newTop=y+dressed.y-dressed.displayHeight;
      const oldCut=Phaser.Math.Clamp(Math.round((cut-oldTop)/old.scaleY),0,96);
      const newCut=Phaser.Math.Clamp(Math.round((cut-newTop)/dressed.scaleY),0,96);
      old.setCrop(0,0,96,oldCut);dressed.setCrop(0,newCut,96,96-newCut);
      ribbons.clear().lineStyle(2,0xc7a0e7,.85);
      for(let i=0;i<3;i++)ribbons.strokeEllipse(x,cut+i*5,32+i*7,8);
    };draw();
    this.tweens.push(s.tweens.add({targets:progress,value:1,duration:2200,ease:'Sine.easeInOut',onUpdate:draw,
      onComplete:()=>{old.setCrop();old.setTexture('syndra-overworld',1).setScale(.5);dressed.destroy();ribbons.destroy();this.pending--;}}));
  }
  private shotSound():void {
    if(MusicManager.isMuted())return;
    try{const c=new AudioContext();void c.resume();const b=c.createBuffer(1,c.sampleRate*.15,c.sampleRate),v=b.getChannelData(0);for(let i=0;i<v.length;i++)v[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.025));const n=c.createBufferSource(),g=c.createGain();n.buffer=b;g.gain.value=.12;n.connect(g).connect(c.destination);n.onended=()=>{void c.close();};n.start();}catch{/* Browser audio is optional. */}
  }
  destroy():void {this.alive=false;for(const t of this.tweens)t.stop();for(const cleanup of this.cleanups)cleanup();for(const o of this.effects)if(o.active)o.destroy();}
}
