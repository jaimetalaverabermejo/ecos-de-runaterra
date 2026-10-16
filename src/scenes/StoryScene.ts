import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { WORLD_PLAYER_VISUAL_SIZE } from '../config/AssetStandards';
import { DataRegistry } from '../data/DataRegistry';
import type { StoryActor, StoryDefinition } from '../data/storyTypes';
import type { SaveGame } from '../state/GameState';
import { ConsoleInput } from '../input/ConsoleInput';
import { SaveService } from '../systems/save/SaveService';
import { WorldActionService } from '../systems/world/WorldActionService';
import { MusicManager } from '../systems/audio/MusicManager';
import { worldMusic } from '../systems/audio/MusicCatalog';

const stories = Object.values(import.meta.glob('../data/stories/*.json', { eager: true, import: 'default' })) as StoryDefinition[];
const idle = { down: 1, up: 4, left: 7, right: 10 };

/** Directed scenes use the game's live maps and sprites. No world/input simulation
 * runs underneath them; completion is atomic and also runs when explicitly skipped. */
export class StoryScene extends Phaser.Scene {
  private story!: StoryDefinition;
  private save!: SaveGame;
  private beatIndex = -1;
  private stage?: Phaser.GameObjects.Container;
  private stageKey = '';
  private stageMapScale = 2;
  private actors = new Map<string, Phaser.GameObjects.Sprite>();
  private subtitle!: Phaser.GameObjects.Text;
  private speaker!: Phaser.GameObjects.Text;
  private title!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private beatTimer?: Phaser.Time.TimerEvent;
  private advanceAt = 0;
  private finished = false;
  private shotHappened = false;
  private gray?: Phaser.Filters.ColorMatrix;
  private audio?: AudioContext;

  constructor() { super('StoryScene'); }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    const id = this.registry.get('story.activeId') as string;
    const definition = stories.find(story => story.id === id);
    if (!definition) { console.error(`Cinemática desconocida: ${id}`); this.scene.start('WorldScene'); return; }
    this.story = definition;
    this.beatIndex = -1; this.finished = false; this.shotHappened = false; this.stageKey = '';
    this.actors.clear(); this.gray = undefined;
    ConsoleInput.clearTransient();
    MusicManager.play(id === 'karma-flashback' ? 'intro' : worldMusic(this.save.currentMapId));
    MusicManager.setCinematicLevel(0.45);
    this.cameras.main.setBackgroundColor('#08131d');
    this.add.rectangle(0, 0, 960, 54, 0x030a10).setOrigin(0).setDepth(900);
    this.add.rectangle(0, 406, 960, 134, 0x030a10, 0.96).setOrigin(0).setDepth(900);
    this.title = this.add.text(28, 17, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#dbc995' }).setDepth(901);
    this.speaker = this.add.text(36, 423, '', { fontFamily: 'Georgia, serif', fontSize: '19px', color: '#dbc995' }).setDepth(901);
    this.subtitle = this.add.text(36, 453, '', { fontFamily: 'Arial, sans-serif', fontSize: '21px', color: '#f1eee5', wordWrap: { width: 870 } }).setDepth(901);
    this.counter = this.add.text(926, 390, '', { fontSize: '12px', color: '#ddd5be' }).setOrigin(1, 1).setDepth(901);
    this.add.text(930, 30, 'Omitir escena · S', { fontSize: '15px', color: '#e1d8c5' }).setOrigin(1, 0.5).setDepth(902)
      .setInteractive({ useHandCursor: true }).on('pointerup', (_pointer: unknown, _x: unknown, _y: unknown, e: Phaser.Types.Input.EventData) => { e.stopPropagation(); this.finish(); });
    this.add.text(926, 528, 'A / Enter · Avanzar', { fontSize: '12px', color: '#bbb5a6' }).setOrigin(1, 1).setDepth(901);
    this.input.keyboard?.on('keydown-S', () => this.finish());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-A', () => this.advance());
    this.input.on('pointerup', () => this.advance());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.beatTimer?.remove(); this.audio?.close().catch(() => undefined); this.audio = undefined;
      MusicManager.setCinematicLevel(1); ConsoleInput.clearTransient();
    });
    this.nextBeat();
  }

  update(): void {
    if (ConsoleInput.consumeA()) this.advance();
    ConsoleInput.consumeB(); ConsoleInput.consumeMenu(); ConsoleInput.consumeDirection();
  }

  private advance(): void { if (!this.finished && this.time.now >= this.advanceAt) this.nextBeat(); }

  private nextBeat(): void {
    if (this.finished) return;
    this.beatTimer?.remove();
    this.beatIndex += 1;
    if (this.beatIndex >= this.story.beats.length) { this.finish(); return; }
    const beat = this.story.beats[this.beatIndex];
    this.advanceAt = this.time.now + (beat.effect === 'shot' ? 3400 : 650);
    this.title.setText(beat.title); this.speaker.setText(beat.speaker); this.subtitle.setText(beat.text);
    this.counter.setText(`${this.beatIndex + 1} / ${this.story.beats.length}`);
    if (beat.grayscale && !this.gray) {
      this.gray = this.cameras.main.filters.external.addColorMatrix();
      this.gray.colorMatrix.desaturate();
    } else if (!beat.grayscale && this.gray) {
      this.cameras.main.filters.external.remove(this.gray); this.gray.destroy(); this.gray = undefined;
    }
    this.stageMapScale = Phaser.Math.Clamp(beat.mapScale ?? 2, 0.75, 2);
    const key = `${this.stageMapScale}:${beat.mapId}:${beat.focus.x}:${beat.focus.y}:${beat.actors.map(a => a.id).join(',')}`;
    if (key !== this.stageKey) {
      this.stageKey = key;
      if (this.stage) { this.tweens.killTweensOf(this.stage.getAll()); this.stage.destroy(true); }
      this.stage = this.add.container(0, 0).setDepth(0); this.actors.clear();
      const tiled = DataRegistry.map(beat.mapId).tiled;
      if (tiled) {
        const map = this.make.tilemap({ key: tiled.key });
        const sets = tiled.tilesets.map(set => map.addTilesetImage(set.name, set.key)).filter((s): s is Phaser.Tilemaps.Tileset => Boolean(s));
        for (const [index, data] of map.layers.entries()) {
          if (data.name === 'Collision' || data.name.startsWith('Ledges_')) continue;
          const layer = map.createLayer(index, sets, 480 - beat.focus.x * this.stageMapScale, 245 - beat.focus.y * this.stageMapScale);
          if (layer) this.stage.add(layer.setScale(this.stageMapScale));
        }
      }
      if (this.story.id === 'jhin-third-shot') {
        const atlas = this.textures.get('jo07_wehle-Jonia_urbana-1');
        if (!atlas.has('story-farol')) atlas.add('story-farol', 0, 416, 0, 32, 96);
        this.stage.add(this.add.image(600, 280, atlas.key, 'story-farol').setOrigin(0.5, 1).setScale(1.25));
      }
      for (const actor of beat.actors) this.createActor(actor);
      this.cameras.main.fadeIn(350, 5, 10, 15);
    }
    if (this.shotHappened && this.actors.has('elan')) this.actors.get('elan')!.setAngle(90).setAlpha(0.65);
    if (beat.effect) this.playEffect(beat.effect);
    this.beatTimer = this.time.delayedCall(beat.durationMs, () => this.nextBeat());
  }

  private createActor(actor: StoryActor): void {
    const config = actor.championId ? DataRegistry.visualOverworld(actor.championId) : undefined;
    const texture = actor.player ? 'player-overworld' : actor.championId ? `${actor.championId}-overworld` : `world-actor-${actor.actorId}`;
    if (!texture || !this.textures.exists(texture)) throw new Error(`Falta el sprite de la cinemática: ${actor.id}`);
    const scale = actor.player ? WORLD_PLAYER_VISUAL_SIZE / 96 : config?.overworldScale ?? (actor.actorId ? DataRegistry.worldActor(actor.actorId).overworldScale : 0.54) ?? 0.54;
    const sprite = this.add.sprite(actor.x, actor.y, texture, idle[actor.facing ?? 'down']).setOrigin(0.5, 1).setScale(scale * this.stageMapScale);
    this.stage!.add(sprite); this.actors.set(actor.id, sprite);
    if (actor.toX !== undefined || actor.toY !== undefined) {
      this.walk(sprite, actor.toX ?? actor.x, actor.toY ?? actor.y, actor.moveMs ?? 2600);
    }
  }

  private walk(sprite: Phaser.GameObjects.Sprite, x: number, y: number, duration: number): void {
    this.tweens.killTweensOf(sprite);
    const direction = Math.abs(x - sprite.x) > Math.abs(y - sprite.y) ? (x < sprite.x ? 'left' : 'right') : (y < sprite.y ? 'up' : 'down');
    const anim = `story-walk-${sprite.texture.key}-${direction}`;
    if (!this.anims.exists(anim)) {
      const first = { down: 0, up: 3, left: 6, right: 9 }[direction];
      this.anims.create({ key: anim, frames: this.anims.generateFrameNumbers(sprite.texture.key, { start: first, end: first + 2 }), frameRate: 7, repeat: -1 });
    }
    sprite.play(anim);
    this.tweens.add({ targets: sprite, x, y, duration, ease: 'Linear', onComplete: () => { sprite.anims.stop(); sprite.setFrame(idle[direction]); } });
  }

  private playEffect(effect: NonNullable<StoryDefinition['beats'][number]['effect']>): void {
    if (effect === 'surge' || effect === 'spheres') {
      const center = this.actors.get('syndra');
      if (!center) return;
      const count = effect === 'spheres' ? 3 : 1;
      for (let i = 0; i < count; i++) {
        const orb = this.add.circle(center.x + 80 + i * 40, center.y - 95 - i * 14, effect === 'spheres' ? 12 : 8, 0x3b155c, 0.95).setStrokeStyle(2, 0xb479ef, 0.85);
        this.stage!.add(orb);
        this.tweens.add({ targets: orb, y: orb.y - 18, duration: 1200 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        if (effect === 'surge') {
          this.tweens.add({ targets: orb, scale: 16, alpha: 0, duration: 550, delay: 600, onComplete: () => orb.destroy() });
          this.time.delayedCall(650, () => { this.cameras.main.shake(180, 0.002); this.cameras.main.flash(100, 73, 24, 104); });
        }
      }
    } else if (effect === 'injury') {
      const wounded = this.actors.get('elan');
      if (wounded) this.tweens.add({ targets: wounded, angle: -22, y: wounded.y + 8, duration: 350 });
    } else if (effect === 'awakening') {
      const daisy = this.add.sprite(485, 315, 'ivern-summon-daisy-overworld', 1).setOrigin(0.5, 1).setScale(2.4);
      this.stage!.add(daisy);
      this.tweens.add({ targets: daisy, y: 295, duration: 700, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    } else if (effect === 'shot') {
      MusicManager.setCinematicLevel(0);
      const line = this.add.graphics().lineStyle(1, 0xdfc394, 0.65).lineBetween(900, 95, 474, 288);
      this.stage!.add(line); line.setAlpha(0);
      this.tweens.add({ targets: line, alpha: 1, duration: 420, delay: 600 });
      this.time.delayedCall(1800, () => {
        this.shotHappened = true; this.shotSound(); line.destroy();
        this.cameras.main.flash(90, 245, 235, 215); this.cameras.main.shake(110, 0.001);
        const elan = this.actors.get('elan');
        if (elan) { this.tweens.killTweensOf(elan); elan.anims.stop(); this.tweens.add({ targets: elan, angle: 90, alpha: 0.65, duration: 230 }); }
        const player = this.actors.get('player'); if (player) this.walk(player, 560, 350, 300);
      });
    } else if (effect === 'evacuation') {
      for (let i = 0; i < 10; i++) {
        const ember = this.add.rectangle(80 + i * 83, 355, 2, 3, 0xd4b29a, 0.7);
        this.stage!.add(ember); this.tweens.add({ targets: ember, y: 75, x: ember.x + 45, alpha: 0, duration: 1600 + i * 120, onComplete: () => ember.destroy() });
      }
      this.cameras.main.shake(180, 0.0005);
    } else if (effect === 'names') {
      const names = this.add.text(480, 162, 'REN', { fontFamily: 'Georgia', fontSize: '18px', color: '#f1e7cf' }).setOrigin(0.5).setAlpha(0);
      this.stage!.add(names); this.tweens.add({ targets: names, alpha: 1, duration: 1300 });
    } else if (effect === 'restitution') {
      if (this.story.id === 'karma-memorial') {
        const atlas = this.textures.get('jo05_placidium-Jonia_urbana-1');
        if (!atlas.has('story-rice')) atlas.add('story-rice', 0, 480, 192, 32, 32);
        const bowl = this.add.image(430, 320, atlas.key, 'story-rice').setScale(1.5);
        this.stage!.add(bowl);
        this.tweens.add({ targets: bowl, x: 520, duration: 2200, ease: 'Sine.easeInOut' });
      }
      const left = this.actors.get('lian') ?? this.actors.get('meilin');
      const right = this.actors.get('collector') ?? this.actors.get('tao');
      if (left) this.walk(left, left.x + 20, left.y, 1000);
      if (right) this.walk(right, right.x - 20, right.y, 1000);
    } else if (effect === 'departure') {
      const ren = this.actors.get('ren');
      if (ren) this.walk(ren, -80, ren.y, 5500);
    } else if (effect === 'escort') {
      for (const [id, sprite] of this.actors) {
        if (id === 'player') continue;
        this.walk(sprite, sprite.x, this.story.id === 'jhin-arrest' ? 470 : 90, 4500);
      }
    }
  }

  private shotSound(): void {
    if (MusicManager.isMuted()) return;
    try {
      this.audio ??= new AudioContext();
      const context = this.audio;
      void context.resume();
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.25), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.035));
      const source = context.createBufferSource(); source.buffer = buffer;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 950;
      const gain = context.createGain(); gain.gain.value = 0.2;
      source.connect(filter).connect(gain).connect(context.destination); source.start();
    } catch { /* The scene remains playable if the browser refuses audio. */ }
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true; this.beatTimer?.remove();
    if (!this.save.worldProgress.flags.includes(this.story.completionFlag)) {
      WorldActionService.applyAll(this.save, this.story.completionActions);
      SaveService.save(this.save);
      if (this.story.returnDialogueId) this.registry.set('world.pendingDialogueId', this.story.returnDialogueId);
    }
    this.registry.remove('story.activeId');
    this.scene.start('WorldScene');
  }
}
