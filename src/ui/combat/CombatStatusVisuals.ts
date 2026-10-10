import Phaser from 'phaser';
import type { CombatStatusInstance } from '../../systems/combat/StatusEngine';
import type { CombatSprite } from './CombatAnimationPlayer';

type Aura = { graphics: Phaser.GameObjects.Graphics; key: string; dispose: () => void };
const auras = new WeakMap<CombatSprite, Aura>();

/** Persistent art is keyed to actual statuses, not to the last spell's color. */
export function syncCombatStatusVfx(scene: Phaser.Scene, sprite: CombatSprite | undefined, statuses: CombatStatusInstance[]): void {
  if (!sprite?.active) return;
  const visible = statuses.filter(s => s.remainingTurns > 0 && ['shield','root','stun','charm','sleep','poison','burn','explosive','trap','banish','polymorph','airborne','evasion'].includes(s.kind));
  const key = visible.map(s => `${s.id}:${s.kind}:${s.stacks ?? 0}`).sort().join('|');
  const old = auras.get(sprite);
  if (old?.key === key) return;
  old?.dispose();
  if (!key) return;
  const graphic = scene.add.graphics().setDepth(8990).setName('combat-status-aura');
  const kinds = new Set(visible.map(s => s.kind));
  const draw = () => {
    if (!sprite.active) { dispose(); return; }
    const height = Math.min(160, Math.abs(sprite.displayHeight || 96));
    const t = scene.time.now / 650;
    graphic.clear().setPosition(sprite.x, sprite.y - height * 0.43);
    if (kinds.has('shield')) {
      graphic.lineStyle(2, 0x92dfec, 0.55 + Math.sin(t) * 0.1).strokeEllipse(0, 0, 88, height * 0.84);
      graphic.fillStyle(0x8bd5e6, 0.04).fillEllipse(0, 0, 88, height * 0.84);
    }
    if (kinds.has('root')) {
      graphic.lineStyle(3, 0x84c99e, 0.85);
      for (let i = -1; i <= 1; i++) {
        const x = i * 22;
        graphic.lineBetween(x, height * 0.4, x - 10, height * 0.25);
        graphic.lineBetween(x - 10, height * 0.25, x + 5, height * 0.14);
      }
    }
    if (kinds.has('stun') || kinds.has('airborne')) {
      for (let i=0;i<3;i++) {
        const a=t+i*Math.PI*2/3;
        graphic.fillStyle(0xffdc82,0.85).fillRect(Math.cos(a)*24-3,-height*0.5+Math.sin(a)*6,6,6);
      }
    }
    if (kinds.has('charm')) {
      for(let i=0;i<2;i++){const x=i*22-11,y=-height*0.5-Math.sin(t+i)*5;graphic.fillStyle(0xf2a0ce,0.9).fillCircle(x-3,y,4).fillCircle(x+3,y,4).fillTriangle(x-7,y+1,x+7,y+1,x,y+9);}
    }
    if (kinds.has('sleep')) graphic.lineStyle(3,0xc5b6f4,0.85).beginPath().arc(0,-height*0.52,9,-1.8,1.8,false).strokePath();
    if (kinds.has('poison') || kinds.has('burn')) {
      const color=kinds.has('burn')?0xffa76b:0xace176;
      for(let i=0;i<4;i++){const phase=(t*0.45+i/4)%1;graphic.fillStyle(color,(1-phase)*0.55).fillRect(-27+i*18,height*0.38-phase*25,4,6);}
    }
    if (kinds.has('explosive') || kinds.has('trap')) {
      graphic.lineStyle(2,kinds.has('trap')?0xd99dd0:0xffb974,0.75).strokeEllipse(0,height*0.42,62,15);
      graphic.fillStyle(0xffce93,0.65).fillRect(-4,height*0.42-5,8,8);
    }
    if (kinds.has('banish') || kinds.has('evasion')) {
      graphic.lineStyle(2,0xb59ade,0.35).strokeEllipse(0,height*0.35,75+Math.sin(t)*6,19);
    }
    if(kinds.has('polymorph'))graphic.fillStyle(0xe6b8ff,0.75).fillCircle(0,-height*0.52,6);
  };
  const dispose = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, draw);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, dispose);
    sprite.off(Phaser.GameObjects.Events.DESTROY, dispose);
    graphic.destroy();
    if(auras.get(sprite)?.graphics===graphic)auras.delete(sprite);
  };
  auras.set(sprite,{graphics:graphic,key,dispose});
  scene.events.on(Phaser.Scenes.Events.UPDATE,draw);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,dispose);
  sprite.once(Phaser.GameObjects.Events.DESTROY,dispose);
  draw();
}

/** Short non-blocking feedback for status ticks and passive recovery. */
export function pulseCombatEvent(scene: Phaser.Scene, sprite: CombatSprite | undefined, kind: 'heal' | 'poison' | 'burn' | 'explosion' | 'passive'): void {
  if(!sprite?.active)return;
  const color={heal:0x9fedba,poison:0xb0da7b,burn:0xffa76b,explosion:0xffc68d,passive:0xc7dffc}[kind];
  const graphic=scene.add.graphics({x:sprite.x,y:sprite.y-55}).setDepth(9000).setName('combat-event-pulse');
  const state={t:0};let done=false;
  const dispose=()=>{if(done)return;done=true;scene.events.off(Phaser.Scenes.Events.SHUTDOWN,dispose);graphic.destroy();};
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,dispose);
  scene.tweens.add({targets:state,t:1,duration:240,onUpdate:()=>{
    if(done)return;
    graphic.clear().setAlpha(1-state.t);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*(14+state.t*22),y=Math.sin(a)*(14+state.t*22)-(kind==='heal'?state.t*18:0);graphic.fillStyle(color,0.9).fillRect(x-3,y-3,6,6);}
    if(kind==='explosion')graphic.lineStyle(3,color,0.8).strokeCircle(0,0,15+state.t*33);
  },onComplete:dispose});
}
