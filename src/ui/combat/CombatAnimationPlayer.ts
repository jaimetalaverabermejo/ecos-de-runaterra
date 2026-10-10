import Phaser from 'phaser';
import type { CombatAnimationProfile } from './CombatAnimationProfiles';

export type CombatSprite = Phaser.GameObjects.Image | Phaser.GameObjects.Container;
export interface AnimationOptions {
  impacts?: number;
  missed?: boolean;
  packet?: boolean;
  packetIndex?: number;
  packetCount?: number;
  reducedMotion?: boolean;
  targetIsAlly?: boolean;
}
const vertices = (points: Array<{x:number;y:number}>): Phaser.Math.Vector2[] => points.map(p => new Phaser.Math.Vector2(p.x, p.y));
const CANCELLED = Symbol('animation-cancelled');

/** One owner for temporary art, movement and cancellation in either battle scene. */
class AnimationRun {
  readonly art: Phaser.GameObjects.Container;
  readonly anchor: { x: number; y: number; alpha: number; scaleX: number; scaleY: number };
  readonly motor: { x: number; y: number; alpha: number; scaleX: number; scaleY: number };
  alive = true;
  private pending = new Set<(completed: boolean) => void>();
  private tweens: Phaser.Tweens.Tween[] = [];
  constructor(readonly scene: Phaser.Scene, readonly source: CombatSprite) {
    this.anchor = { x: source.x, y: source.y, alpha: source.alpha, scaleX: source.scaleX, scaleY: source.scaleY };
    this.motor = { ...this.anchor };
    this.art = scene.add.container(0, 0).setDepth(9000).setName('combat-animation');
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
  }
  graphics(x = 0, y = 0): Phaser.GameObjects.Graphics {
    if (!this.alive) throw CANCELLED;
    const graphic = this.scene.add.graphics({ x, y });
    this.art.add(graphic);
    return graphic;
  }
  async tween(targets: object, properties: Record<string, unknown>, duration: number, update?: () => void): Promise<void> {
    if (!this.alive) throw CANCELLED;
    const completed = await new Promise<boolean>(resolve => {
      this.pending.add(resolve);
      const tween = this.scene.tweens.add({ targets, ...properties, duration, ease: 'Sine.easeInOut',
        onUpdate: () => { if (this.alive) update?.(); },
        onComplete: () => { this.pending.delete(resolve); resolve(true); }
      });
      this.tweens.push(tween);
    });
    if (!completed || !this.alive) throw CANCELLED;
  }
  move(properties: Record<string, unknown>, duration: number): Promise<void> {
    return this.tween(this.motor, properties, duration, () => {
      if (this.source.active) this.source.setPosition(this.motor.x, this.motor.y).setAlpha(this.motor.alpha);
    });
  }
  async recover(): Promise<void> {
    try { await this.move({ ...this.anchor }, 160); }
    catch (error) { if (error !== CANCELLED) throw error; }
    finally { this.dispose(); }
  }
  dispose(): void {
    if (!this.alive) return;
    this.alive = false;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    for (const tween of this.tweens) tween.stop();
    for (const settle of this.pending) settle(false);
    this.pending.clear();
    if (this.source.active) this.source.setPosition(this.anchor.x, this.anchor.y).setAlpha(this.anchor.alpha);
    this.art.destroy(true);
  }
}

function center(sprite: CombatSprite): { x: number; y: number } {
  return { x: sprite.x, y: sprite.y - Math.min(160, Math.abs(sprite.displayHeight || 96)) * 0.48 };
}
function diamond(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, alpha = 1): void {
  g.fillStyle(color, alpha).fillPoints(vertices([{ x, y: y - size }, { x: x + size, y }, { x, y: y + size }, { x: x - size, y }]), true);
}
function ring(g: Phaser.GameObjects.Graphics, radius: number, color: number, width = 3): void {
  g.lineStyle(width, color, 0.9).strokeCircle(0, 0, radius);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    diamond(g, Math.cos(a) * radius, Math.sin(a) * radius, 3, color);
  }
}
function glyph(g: Phaser.GameObjects.Graphics, profile: CombatAnimationProfile): void {
  const { color, accent, weapon, family } = profile;
  g.fillStyle(color, 0.12).fillCircle(0, 0, 20);
  if (weapon === 'mushroom') {
    g.fillStyle(0xf2dfb1).fillRect(-5, 0, 10, 17);
    g.fillStyle(color).fillEllipse(0, -5, 35, 22);
    g.fillStyle(accent).fillCircle(-8, -7, 4).fillCircle(8, -5, 3).fillCircle(0, -12, 3);
  } else if (weapon === 'grenade' || weapon === 'bomb') {
    g.fillStyle(0x332a34).fillCircle(0, 2, 14);
    g.fillStyle(color).fillCircle(0, 2, 11);
    g.fillStyle(accent).fillRect(-5, -15, 10, 7).fillRect(-6, -2, 4, 9);
    diamond(g, 4, -20, 4, 0xffe9b7);
  } else if (weapon === 'sword') {
    g.fillStyle(color).fillTriangle(32, 0, -8, -8, -8, 8);
    g.fillStyle(0xfff6dc).fillTriangle(31, 0, -8, -2, -8, 2);
    g.fillStyle(accent).fillRect(-15, -13, 6, 26).fillRect(-31, -3, 16, 6);
  } else if (weapon === 'heart') {
    g.fillStyle(color).fillPoints(vertices([{x:-15,y:-4},{x:-12,y:-12},{x:-4,y:-14},{x:0,y:-7},{x:5,y:-14},{x:13,y:-12},{x:16,y:-4},{x:0,y:17}]), true);
    g.fillStyle(0xffffff, 0.85).fillRect(-10, -8, 4, 4);
  } else if (weapon === 'shuriken') {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      g.fillStyle(accent).fillPoints(vertices([{x:Math.cos(a)*23,y:Math.sin(a)*23},{x:Math.cos(a+0.8)*7,y:Math.sin(a+0.8)*7},{x:Math.cos(a-0.5)*5,y:Math.sin(a-0.5)*5}]), true);
    }
    g.fillStyle(color).fillCircle(0, 0, 5);
  } else if (weapon === 'boomerang') {
    g.lineStyle(7, accent).strokePoints(vertices([{x:-17,y:12},{x:0,y:-11},{x:17,y:12}]));
    g.lineStyle(2, color).strokePoints(vertices([{x:-17,y:12},{x:0,y:-11},{x:17,y:12}]));
  } else if (weapon === 'feather') {
    g.fillStyle(color).fillPoints(vertices([{x:-21,y:0},{x:2,y:-9},{x:20,y:-2},{x:10,y:8},{x:-8,y:5}]), true);
    g.lineStyle(2, accent).lineBetween(-17, 1, 18, 0);
  } else if (weapon === 'rock') {
    g.fillStyle(0x534640).fillPoints(vertices([{x:-18,y:-9},{x:3,y:-19},{x:20,y:-3},{x:12,y:17},{x:-12,y:15}]), true);
    g.fillStyle(accent).fillPoints(vertices([{x:-15,y:-8},{x:3,y:-16},{x:10,y:-1},{x:-8,y:8}]), true);
  } else if (family === 'P2' || weapon === 'arrow' || weapon === 'dart' || weapon === 'missile') {
    g.fillStyle(accent).fillRect(-20, -3, 30, 6);
    g.fillStyle(color).fillTriangle(21, 0, 5, -8, 5, 8);
    if (weapon === 'arrow' || weapon === 'dart') {
      g.fillStyle(color).fillTriangle(-21, -8, -21, 8, -10, 0);
    } else g.fillStyle(0xffffff).fillRect(-14, -1, 18, 2);
  } else {
    g.fillStyle(color, 0.18).fillCircle(0, 0, 23);
    g.fillStyle(color, 0.45).fillCircle(0, 0, 16);
    g.fillStyle(color).fillCircle(0, 0, 10);
    diamond(g, -2, -3, 7, 0xffffff, 0.9);
    diamond(g, 17, -8, 3, accent);
    diamond(g, -15, 9, 3, accent);
  }
}

function impact(run: AnimationRun, x: number, y: number, profile: CombatAnimationProfile, strength = 1, missed = false): void {
  const graphic = run.graphics(x, y);
  const color = missed ? 0x9ab2bc : profile.color;
  const state = { t: 0 };
  const draw = () => {
    graphic.clear().setAlpha(1 - state.t);
    if (missed) {
      graphic.lineStyle(2, color, 0.75);
      for (let i = 0; i < 3; i++) graphic.lineBetween(-18 + state.t * 40, i * 8 - 8, 4 + state.t * 40, i * 8 - 16);
      return;
    }
    const size = (12 + state.t * 24) * strength;
    graphic.lineStyle(3, color, 0.9).strokeCircle(0, 0, size);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const distance = (9 + state.t * 33) * strength;
      diamond(graphic, Math.cos(a) * distance, Math.sin(a) * distance, (5 - state.t * 3) * strength, i % 2 ? color : profile.accent);
    }
    if (state.t < 0.35) diamond(graphic, 0, 0, 13 * strength * (1 - state.t), 0xfff6dc);
  };
  draw();
  void run.tween(state, {t: 1}, 155, draw).catch(() => undefined);
  playImpactSound(run.scene, profile, missed);
}

/** Quiet procedural sounds respect Phaser's mute/volume and browser audio activation. */
function playImpactSound(scene: Phaser.Scene, profile: CombatAnimationProfile, missed: boolean): void {
  const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = manager.context;
  if (!ctx || ctx.state !== 'running' || manager.mute || manager.volume <= 0) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  const soft = profile.family.startsWith('S');
  osc.type = soft ? 'sine' : profile.family === 'P2' ? 'square' : 'triangle';
  const frequency = missed ? 130 : soft ? 650 : profile.family === 'P2' ? 190 : profile.family === 'P5' || profile.family === 'P8' ? 120 : 360;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(soft ? frequency * 1.5 : 55, ctx.currentTime + 0.13);
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime((soft ? 0.018 : 0.026) * manager.volume, ctx.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.17);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
}

async function projectile(run: AnimationRun, from: {x:number;y:number}, to: {x:number;y:number}, profile: CombatAnimationProfile, arcing = false): Promise<void> {
  const graphic = run.graphics(from.x, from.y), trail = run.graphics();
  glyph(graphic, profile);
  const state = { t: 0 };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  await run.tween(state, {t: 1}, profile.family === 'P2' ? 180 : 270, () => {
    const x = Phaser.Math.Linear(from.x, to.x, state.t);
    const y = Phaser.Math.Linear(from.y, to.y, state.t) - (arcing ? Math.sin(state.t * Math.PI) * 55 : 0);
    graphic.setPosition(Math.round(x), Math.round(y));
    graphic.setRotation(profile.weapon === 'shuriken' || profile.weapon === 'boomerang' ? state.t * Math.PI * 4 : angle);
    trail.clear();
    for (let i = 1; i <= 5; i++) {
      const t = Math.max(0, state.t - i * 0.024);
      const tx = Phaser.Math.Linear(from.x, to.x, t), ty = Phaser.Math.Linear(from.y, to.y, t) - (arcing ? Math.sin(t * Math.PI) * 55 : 0);
      trail.fillStyle(i % 2 ? profile.color : profile.accent, (6 - i) * 0.1).fillRect(Math.round(tx) - 4, Math.round(ty) - 4, 8, 8);
    }
  });
  graphic.destroy(); trail.destroy();
}

async function slash(run: AnimationRun, to: {x:number;y:number}, profile: CombatAnimationProfile, index: number): Promise<void> {
  const graphic = run.graphics(to.x, to.y), state = { t: 0 };
  await run.tween(state, {t: 1}, 125, () => {
    graphic.clear();
    const a = (index % 2 ? -0.75 : 0.75) + state.t * 0.3;
    const length = 50 + state.t * 26;
    graphic.setRotation(a);
    graphic.fillStyle(profile.color, 0.16).fillTriangle(-length, -17, length, 0, -length + 15, 17);
    graphic.fillStyle(profile.color, 0.8).fillTriangle(-length, -7, length, 0, -length + 16, 7);
    graphic.fillStyle(0xfff6dc, 0.95).fillTriangle(-length + 12, -2, length, 0, -length + 22, 2);
    diamond(graphic, length * 0.3, -11, 4, profile.accent);
  });
}

async function support(run: AnimationRun, target: CombatSprite, profile: CombatAnimationProfile): Promise<void> {
  const point = center(target), graphic = run.graphics(point.x, point.y), state = {t: 0};
  await run.tween(state, {t: 1}, 330, () => {
    graphic.clear();
    const radius = 22 + state.t * 25;
    if (profile.family === 'S1') {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const x = Math.cos(a) * (35 - state.t * 20), y = Math.sin(a) * 18 - state.t * 40;
        graphic.fillStyle(0x9af2b5, 0.9).fillRect(x-2,y-6,4,12).fillRect(x-6,y-2,12,4);
      }
      graphic.lineStyle(2, 0x9af2b5, 0.5).strokeEllipse(0, 36, radius*2, 15);
    } else if (profile.family === 'S2') {
      graphic.fillStyle(profile.color, 0.13).fillCircle(0, 0, radius);
      graphic.lineStyle(3, profile.color, 0.85).strokePoints(vertices([{x:0,y:-radius},{x:radius,y:-radius*0.4},{x:radius*0.8,y:radius*0.5},{x:0,y:radius},{x:-radius*0.8,y:radius*0.5},{x:-radius,y:-radius*0.4},{x:0,y:-radius}]));
      diamond(graphic, 0, 0, 10, profile.accent, 0.9);
    } else if (profile.family === 'S4') {
      graphic.lineStyle(4, profile.color, 0.8).strokeEllipse(0, 35, radius*2.5, radius*0.7);
      for (let i=0;i<6;i++) diamond(graphic,Math.cos(i)*radius,35-Math.sin(state.t*Math.PI)*35-i*5,6,profile.accent,0.8);
    } else {
      ring(graphic, radius, profile.color);
      for (let i=0;i<4;i++) diamond(graphic, Math.cos(i*Math.PI/2+state.t*2)*radius, Math.sin(i*Math.PI/2+state.t*2)*radius, 7, profile.accent);
    }
  });
}

async function strike(run: AnimationRun, target: CombatSprite, profile: CombatAnimationProfile, index: number, options: AnimationOptions): Promise<void> {
  const from = center(run.source), destination = center(target);
  const to = options.missed ? {x:destination.x+32,y:destination.y-26} : destination;
  const family = profile.family;
  if (['P1','P2','P3'].includes(family)) {
    const reversed = profile.skillId === 'xayah-bladecaller' || profile.skillId === 'ahri-orb-of-deception:return';
    if(profile.skillId==='ahri-fox-fire') {
      await Promise.all([-1,0,1].map(i=>projectile(run,{x:from.x+i*12,y:from.y+i*18},to,profile)));
    } else await projectile(run, reversed ? to : from, reversed ? from : to, profile);
  } else if (family === 'P6' || family === 'P7') {
    if(family==='P7'&&profile.championId==='ahri') await projectile(run,from,to,{...profile,family:'P3'});
    else if(family==='P7'&&['lee-sin','wukong'].includes(profile.championId)) {
      await strike(run,target,{...profile,family:'P5'},index,options);return;
    } else if(family==='P7'&&profile.championId==='kennen') {
      await strike(run,target,{...profile,family:'P4'},index,options);return;
    } else if(profile.skillId==='yone-r') await Promise.all([slash(run,to,profile,0),slash(run,to,profile,1)]);
    else await slash(run, to, profile, index);
  } else if (family === 'P5') {
    const graphic=run.graphics(to.x,to.y),state={t:0};
    if(profile.weapon==='staff'||profile.weapon==='branch') {
      graphic.fillStyle(0x392931).fillRect(-55,-7,110,14);
      graphic.fillStyle(profile.color).fillRect(-52,-4,104,8);
      graphic.fillStyle(profile.accent).fillRect(-52,-6,12,12).fillRect(40,-6,12,12);
      graphic.setRotation(-0.5);
    } else if(profile.weapon==='hammer') {
      graphic.fillStyle(0x4a3340).fillRect(-5,-12,10,50);
      graphic.fillStyle(profile.accent).fillRoundedRect(-27,-28,54,26,4);
      graphic.fillStyle(profile.color).fillRect(-22,-23,44,4);
      graphic.lineStyle(3,0x4a3340).strokeRoundedRect(-27,-28,54,26,4);
    } else {
      graphic.fillStyle(0x352732).fillRoundedRect(-23,-16,43,36,6);
      graphic.fillStyle(profile.color).fillRoundedRect(-19,-12,35,28,4);
      graphic.fillStyle(profile.accent).fillRoundedRect(8,0,13,19,4);
      for(let i=0;i<4;i++)graphic.fillStyle(profile.accent).fillRoundedRect(-18+i*8,-17,6,12,2);
      graphic.fillStyle(0xffe9bd,0.8).fillRect(-15,-10,4,4);
    }
    await run.tween(state,{t:1},135,()=>graphic.setScale(0.7+state.t*0.4));
  } else if (family === 'P8') {
    const landing = run.graphics(target.x,target.y-8);ring(landing,35,profile.color);
    if (!options.reducedMotion) {
      await run.move({x:target.x-36,y:target.y-100},180);
      await run.move({y:target.y-6},125);
    } else await run.tween({t:0},{t:1},140);
  } else if (family === 'P9') {
    const graphic=run.graphics(to.x,to.y),state={t:0};
    await run.tween(state,{t:1},220,()=>{graphic.clear().setRotation(state.t*Math.PI*2);for(let j=0;j<3;j++)graphic.lineStyle(4-j, j?profile.color:profile.accent,0.85-j*0.15).beginPath().arc(0,0,30+j*12,j*2,j*2+Math.PI*1.4,false).strokePath();});
  } else if (family === 'P4') {
    const graphic=run.graphics(),state={t:0};
    await run.tween(state,{t:1},240,()=>{
      graphic.clear();const x=Phaser.Math.Linear(from.x,to.x,state.t),y=Phaser.Math.Linear(from.y,to.y,state.t);
      if(profile.championId==='rumble'||profile.skillId==='sett-w') {
        const a=Math.atan2(to.y-from.y,to.x-from.x),nx=-Math.sin(a)*26,ny=Math.cos(a)*26;
        graphic.fillStyle(profile.color,0.3).fillTriangle(from.x,from.y,x+nx,y+ny,x-nx,y-ny);
        graphic.fillStyle(profile.accent,0.7).fillTriangle(from.x,from.y,x+nx*0.4,y+ny*0.4,x-nx*0.4,y-ny*0.4);
      } else {
        graphic.lineStyle(12,profile.color,0.2).lineBetween(from.x,from.y,x,y);
        graphic.lineStyle(4,profile.color,0.9).lineBetween(from.x,from.y,x,y);
        graphic.lineStyle(2,0xfff6dc,0.9).lineBetween(from.x,from.y,x,y);
        if(profile.championId==='kennen')graphic.lineStyle(3,profile.accent).strokePoints(vertices([{x:from.x,y:from.y},{x:(from.x+x)*0.5+12,y:(from.y+y)*0.5-18},{x:(from.x+x)*0.5-12,y:(from.y+y)*0.5+16},{x,y}]));
      }
    });
  } else if (family === 'P10') {
    await projectile(run,from,to,{...profile,weapon:profile.weapon==='mushroom'?'mushroom':profile.championId==='jhin'?'grenade':'bomb'},true);
  } else if (family === 'P11') {
    const warning=run.graphics(to.x,target.y-5);warning.lineStyle(2,profile.color,0.7).strokeEllipse(0,0,70,18);
    const graphic=run.graphics(to.x,to.y-110);glyph(graphic,{...profile,weapon:profile.championId==='garen'?'sword':'orb',family:'P1'});graphic.setRotation(Math.PI/2).setScale(profile.ultimate?1.6:1.2);
    await run.tween(graphic,{y:to.y},240);
  } else if (family === 'P12') {
    const graphic=run.graphics(to.x,target.y-12),state={t:0};
    await run.tween(state,{t:1},300,()=>{graphic.clear();ring(graphic,20+state.t*30,profile.color);if(profile.championId==='veigar'){for(let j=0;j<5;j++){const a=j*Math.PI*2/5,x=Math.cos(a)*42,y=Math.sin(a)*12;graphic.lineStyle(4,profile.accent).lineBetween(x,y,x,y-state.t*65);diamond(graphic,x,y-state.t*65,5,profile.color);}}else for(let j=0;j<6;j++){const a=j*Math.PI/3+state.t;diamond(graphic,Math.cos(a)*35,Math.sin(a)*20-state.t*18,7,profile.accent);}});
  } else if (family === 'P13') {
    const graphic=run.graphics(),state={t:0};
    await run.tween(state,{t:1},280,()=>{graphic.clear();graphic.lineStyle(4,profile.color,0.8).lineBetween(from.x,from.y,Phaser.Math.Linear(from.x,to.x,state.t),Phaser.Math.Linear(from.y,to.y,state.t));for(let j=1;j<=5;j++)diamond(graphic,Phaser.Math.Linear(from.x,to.x,j*state.t/5),Phaser.Math.Linear(from.y,to.y,j*state.t/5),4,profile.accent);});
    ring(run.graphics(to.x,to.y),28,profile.color);
  } else if (family === 'P14') {
    await Promise.all(Array.from({length:3},(_,i)=>projectile(run,{x:to.x-50+i*50,y:to.y-105},{x:to.x-17+i*17,y:to.y},profile)));
  } else await support(run,target,profile);
  const fourthShot = profile.skillId === 'jhin-curtain-call' && (options.packetIndex ?? index) === 3;
  impact(run,to.x,to.y,profile,fourthShot?1.8:profile.ultimate?1.3:0.85,Boolean(options.missed));
  run.scene.events.emit('combat-animation:impact', { skillId: profile.skillId, family: profile.family, target, missed: Boolean(options.missed), index: options.packetIndex ?? index });
}

export async function playAnimation(scene: Phaser.Scene, source: CombatSprite, targets: CombatSprite[], profile: CombatAnimationProfile, options: AnimationOptions = {}): Promise<void> {
  const ownSupport = profile.self || (profile.friendly && !options.targetIsAlly && profile.family.startsWith('S'));
  const unique = [...new Set(ownSupport ? [source] : targets)].filter(s=>s.active);
  if (!unique.length || !source.active) return;
  scene.events.emit('combat-animation:start', { skillId: profile.skillId, family: profile.family, source, targets: unique });
  const run = new AnimationRun(scene,source);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const count = Phaser.Math.Clamp(options.packet ? 1 : options.impacts ?? 1,1,8);
  try {
    const direction = unique[0].x >= source.x ? 1 : -1;
    const charge=run.graphics(source.x,center(source).y);
    diamond(charge,0,0,profile.ultimate?17:10,profile.accent,0.7);
    await run.tween(charge,{scale:1.4,alpha:0},options.packet?35:profile.ultimate?150:80);
    if (!reduceMotion && !options.packet) {
      if (['P5','P6','P7','P9'].includes(profile.family)) {
        if(profile.skillId==='master-yi-alpha-strike'||profile.championId==='zed')await run.move({alpha:0.25},60);
        const target=unique[0];
        await run.move({x:target.x-direction*Math.min(85,Math.abs(target.displayWidth||130)*0.5),y:target.y+12,alpha:run.anchor.alpha},profile.family==='P7'?170:220);
      } else if(profile.family==='P2') await run.move({x:run.anchor.x-direction*8},55);
    }
    for(let index=0;index<count;index++) {
      await Promise.all(unique.map(target=>strike(run,target,profile,index,{...options,reducedMotion:reduceMotion,packetIndex:options.packetIndex??index})));
      if(index<count-1)await run.tween({t:0},{t:1},75);
    }
    // Resolve at the final contact so the battle applies damage while sparks dissipate.
    // Recovery remains owned/cancellable, without blocking UI or retaining actor offsets.
    void run.recover();
  } catch(error) {
    run.dispose();
    if(error!==CANCELLED)throw error;
  }
}
