import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import {
  createNarrativeFrame,
  createNarrativeTitle,
  updateNarrativeFrame,
  type NarrativeFrame,
  type NarrativeMode
} from '../ui/narrative/NarrativeUi';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

type IntroFacing = 'up' | 'down' | 'left' | 'right';
type IntroLine = { speaker: string; text: string; mode: NarrativeMode; portraitChampionId?: string };

const INTRO_IDLE_FRAME: Record<IntroFacing, number> = { down: 1, up: 4, left: 7, right: 10 };

export class IntroScene extends Phaser.Scene {
  private save!: SaveGame;
  private dialogueIndex = -1;
  private dialoguePanel?: Phaser.GameObjects.Container;
  private dialogueFrame?: NarrativeFrame;
  private playerSprite?: Phaser.GameObjects.Sprite;
  private teemoSprite?: Phaser.GameObjects.Sprite;
  private villagerSprite?: Phaser.GameObjects.Sprite;
  private portal?: Phaser.GameObjects.Container;
  private inputArmAt = 0;
  private finished = false;

  constructor() {
    super('IntroScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    if (!this.save) {
      this.scene.start('ProfileSelectScene');
      return;
    }

    this.finished = false;
    this.dialogueIndex = -1;
    this.inputArmAt = this.time.now + 1400;

    this.add.image(480, 270, 'bandle-bg').setDisplaySize(960, 540).setTint(0x7c91a0);
    this.add.rectangle(0, 0, 960, 540, 0x020912, 0.22).setOrigin(0);

    createNarrativeTitle(this, 24, 22, 'PRÓLOGO · EL CLARO DEL PORTAL');
    Ui960Kit.label(this, 928, 28, 'S  Omitir', UI960_FONT.tiny, UI.text.muted, true).setOrigin(1, 0);

    this.createPortal();
    this.createActors();
    this.createDialogueUi();
    this.runOpeningSequence();

    this.input.keyboard?.on('keydown-S', () => this.finishIntro());
    this.input.keyboard?.on('keydown-A', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-ENTER', () => this.advanceDialogue());
    this.input.keyboard?.on('keydown-SPACE', () => this.advanceDialogue());
    this.input.on(Phaser.Input.Events.POINTER_UP, () => this.advanceDialogue());
  }

  update(): void {
    if (ConsoleInput.consumeA()) this.advanceDialogue();
    ConsoleInput.consumeB();
    ConsoleInput.consumeDirection();
  }

  private createPortal(): void {
    const glow = this.add.circle(0, 0, 84, 0x59dcff, 0.10);
    const outer = this.add.circle(0, 0, 62, 0x0f7daf, 0.18).setStrokeStyle(4, 0xa8f5ff, 0.96);
    const middle = this.add.circle(0, 0, 47, 0x155ec2, 0.19).setStrokeStyle(3, 0x68cfff, 0.92);
    const inner = this.add.circle(0, 0, 33, 0x1f91d0, 0.20).setStrokeStyle(2, 0xb8f7ff, 0.82);
    const core = this.add.circle(0, 0, 22, 0xb9f4ff, 0.52);

    const runes: Phaser.GameObjects.Rectangle[] = [];
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const rune = this.add.rectangle(
        Math.cos(angle) * 58,
        Math.sin(angle) * 58,
        7,
        7,
        index % 2 === 0 ? 0x8eeeff : 0x4fc9ff,
        0.88
      ).setAngle(45);
      runes.push(rune);
    }

    this.portal = this.add.container(480, 136, [glow, outer, middle, inner, core, ...runes])
      .setScale(0.08)
      .setAlpha(0)
      .setDepth(16);

    this.tweens.add({ targets: outer, angle: 360, duration: 2600, repeat: -1 });
    this.tweens.add({ targets: middle, angle: -360, duration: 1900, repeat: -1 });
    this.tweens.add({ targets: inner, angle: 360, duration: 1450, repeat: -1 });
    this.tweens.add({
      targets: glow,
      scale: 1.18,
      alpha: 0.20,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.tweens.add({
      targets: runes,
      alpha: { from: 0.45, to: 1 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      stagger: 55
    });
  }

  private createActors(): void {
    this.playerSprite = this.add.sprite(480, 118, 'player-overworld', INTRO_IDLE_FRAME.down)
      .setOrigin(0.5, 1)
      .setScale(0.65)
      .setAlpha(0)
      .setDepth(20);

    const teemoTexture = this.textures.exists('teemo-overworld') ? 'teemo-overworld' : 'player-overworld';
    this.teemoSprite = this.add.sprite(438, 350, teemoTexture, INTRO_IDLE_FRAME.right)
      .setOrigin(0.5, 1)
      .setScale(teemoTexture === 'teemo-overworld' ? 0.56 : 0.54)
      .setAlpha(1)
      .setDepth(18);

    const villagerTexture = this.textures.exists('world-actor-yordle-explorer')
      ? 'world-actor-yordle-explorer'
      : (this.textures.exists('world-actor-yordle-villager-woman') ? 'world-actor-yordle-villager-woman' : 'player-overworld');
    this.villagerSprite = this.add.sprite(582, 350, villagerTexture, INTRO_IDLE_FRAME.left)
      .setOrigin(0.5, 1)
      .setScale(villagerTexture === 'player-overworld' ? 0.52 : 0.56)
      .setAlpha(1)
      .setDepth(19);
  }

  private createDialogueUi(): void {
    const frame = createNarrativeFrame(
      this,
      20,
      350,
      920,
      170,
      '',
      '',
      'narration'
    );
    const hint = this.add.text(888, 486, 'A · CONTINUAR', {
      fontFamily: UI.font.family,
      fontSize: '11px',
      fontStyle: 'bold',
      color: UI.text.accent
    }).setOrigin(1, 0);

    this.dialogueFrame = frame;
    this.dialoguePanel = this.add.container(0, 0, [...frame.objects, hint]).setDepth(100).setAlpha(0);
  }

  private runOpeningSequence(): void {
    // The Clearing exists for a moment before anything strange happens.
    this.time.delayedCall(320, () => {
      if (this.teemoSprite) this.walkActor(this.teemoSprite, 462, 350, 'right', 720);
      if (this.villagerSprite) this.walkActor(this.villagerSprite, 558, 350, 'left', 760);
    });

    this.time.delayedCall(1180, () => {
      this.teemoSprite?.setFrame(INTRO_IDLE_FRAME.up);
      this.villagerSprite?.setFrame(INTRO_IDLE_FRAME.up);
    });

    // The blue runic portal slowly forms instead of popping in.
    this.time.delayedCall(1450, () => {
      this.portal?.setAlpha(1);
      this.tweens.add({
        targets: this.portal,
        scale: 0.82,
        duration: 760,
        ease: 'Back.easeOut'
      });
      this.cameras.main.flash(180, 70, 185, 255);
    });

    this.time.delayedCall(2260, () => {
      this.tweens.add({
        targets: this.portal,
        scale: 1.06,
        duration: 360,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      this.cameras.main.flash(140, 90, 215, 255);
    });

    // Both yordles notice the portal before the protagonist falls through it.
    this.time.delayedCall(2550, () => {
      this.teemoSprite?.setFrame(INTRO_IDLE_FRAME.up);
      this.villagerSprite?.setFrame(INTRO_IDLE_FRAME.up);
    });

    this.time.delayedCall(2860, () => {
      this.playerSprite?.setAlpha(1);
      this.tweens.add({
        targets: this.playerSprite,
        y: 348,
        angle: 8,
        duration: 690,
        ease: 'Quad.easeIn',
        onComplete: () => {
          if (this.teemoSprite) this.tweens.killTweensOf(this.teemoSprite);
          if (this.villagerSprite) this.tweens.killTweensOf(this.villagerSprite);
          this.playerSprite?.setAngle(0).setFrame(INTRO_IDLE_FRAME.down);
          this.teemoSprite?.setAngle(90).setY(360).setFrame(INTRO_IDLE_FRAME.down);
          this.villagerSprite?.setFrame(INTRO_IDLE_FRAME.left);
          this.cameras.main.shake(220, 0.009);
          this.cameras.main.flash(120, 180, 245, 255);
          this.portal?.setAlpha(0.30);
        }
      });
    });

    this.time.delayedCall(3740, () => {
      if (this.villagerSprite) this.walkActor(this.villagerSprite, 535, 350, 'left', 360);
    });

    this.time.delayedCall(4200, () => {
      this.dialoguePanel?.setAlpha(1);
      this.dialogueIndex = 0;
      this.renderDialogue();
      this.inputArmAt = this.time.now + 350;
    });
  }

  private walkActor(
    sprite: Phaser.GameObjects.Sprite,
    targetX: number,
    targetY: number,
    facing: IntroFacing,
    duration: number
  ): void {
    const rowStart = INTRO_IDLE_FRAME[facing] - 1;
    const frames = [0, 1, 2, 1];
    sprite.setFrame(INTRO_IDLE_FRAME[facing]);

    this.tweens.add({
      targets: sprite,
      x: targetX,
      y: targetY,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const phase = frames[Math.floor(this.time.now / 130) % frames.length];
        sprite.setFrame(rowStart + phase);
      },
      onComplete: () => sprite.setFrame(INTRO_IDLE_FRAME[facing])
    });
  }

  private lines(): IntroLine[] {
    const player = this.save.player.name || 'Viajero';
    return [
      {
        speaker: '',
        mode: 'narration',
        text: 'El portal te expulsa sobre el Claro de Bandle con bastante menos elegancia de la prevista.'
      },
      { speaker: player, mode: 'speech', text: '¿Qué... ha sido eso?' },
      { speaker: 'Yordle del Claro', mode: 'speech', text: '¡TEEMO! ¡Aparta, aparta! Está respirando, pero no responde.' },
      { speaker: player, mode: 'speech', text: 'Yo... he caído encima de él. No sabía que había alguien debajo.' },
      { speaker: 'Yordle del Claro', mode: 'speech', text: 'Las explicaciones luego. Ayúdame a llevarlo a la aldea. Lulu sabrá qué hacer.' },
      {
        speaker: '',
        mode: 'narration',
        text: 'Poco después, emprendes el camino hacia la Aldea de Bandle con Teemo inconsciente. Algo extraño ha quedado vibrando en el Claro.'
      }
    ];
  }

  private advanceDialogue(): void {
    if (this.finished || this.time.now < this.inputArmAt || this.dialogueIndex < 0) return;
    const lines = this.lines();
    if (this.dialogueIndex >= lines.length - 1) {
      this.finishIntro();
      return;
    }
    this.dialogueIndex += 1;
    this.renderDialogue();
    this.inputArmAt = this.time.now + 120;
  }

  private renderDialogue(): void {
    const line = this.lines()[this.dialogueIndex];
    if (!line) return;
    if (this.dialogueFrame) {
      updateNarrativeFrame(this, this.dialogueFrame, line.speaker, line.text, line.mode, line.portraitChampionId);
    }
  }

  private finishIntro(): void {
    if (this.finished) return;
    this.finished = true;
    this.dialoguePanel?.setAlpha(0);

    const travelers = [this.playerSprite, this.villagerSprite, this.teemoSprite].filter(
      (actor): actor is Phaser.GameObjects.Sprite => Boolean(actor)
    );
    this.teemoSprite?.setAngle(90).setAlpha(0.9);

    this.tweens.add({
      targets: travelers,
      y: '-=105',
      alpha: { from: 1, to: 0.78 },
      duration: 620,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(300, () => this.cameras.main.fadeOut(380, 8, 15, 24));
    this.time.delayedCall(700, () => {
      this.save.worldProgress.flags = this.save.worldProgress.flags.filter((flag) => flag !== 'story:intro-pending');
      for (const flag of ['story:intro-complete', 'story:first-echo-pending', 'story:teemo-in-care']) {
        if (!this.save.worldProgress.flags.includes(flag)) this.save.worldProgress.flags.push(flag);
      }

      const village = DataRegistry.map('bandle-village');
      this.save.currentMapId = village.id;
      this.save.playerPosition = { ...village.spawn };
      this.save.worldProgress.currentRegionId = 'bandle-city';
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) {
        this.save.worldProgress.unlockedZones.push('bandle-village');
      }
      SaveService.save(this.save);
      this.scene.start('WorldScene');
    });
  }
}
