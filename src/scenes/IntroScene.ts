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

type IntroLine = { speaker: string; text: string; mode: NarrativeMode; portraitChampionId?: string };

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
    this.inputArmAt = this.time.now + 900;

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
    const glow = this.add.circle(0, 0, 78, 0x66e7ff, 0.14);
    const outer = this.add.circle(0, 0, 58, 0x1d6f8d, 0.24).setStrokeStyle(4, 0x7cecff, 0.9);
    const middle = this.add.circle(0, 0, 42, 0x5d4fb6, 0.18).setStrokeStyle(3, 0xd2c6ff, 0.8);
    const core = this.add.circle(0, 0, 24, 0xdffcff, 0.5);
    this.portal = this.add.container(480, 136, [glow, outer, middle, core]).setScale(0.05).setAlpha(0);

    this.tweens.add({
      targets: outer,
      angle: 360,
      duration: 2300,
      repeat: -1
    });
    this.tweens.add({
      targets: middle,
      angle: -360,
      duration: 1700,
      repeat: -1
    });
    this.tweens.add({
      targets: glow,
      scale: 1.15,
      alpha: 0.06,
      duration: 620,
      yoyo: true,
      repeat: -1
    });
  }

  private createActors(): void {
    this.playerSprite = this.add.sprite(480, 118, 'player-overworld', 1)
      .setOrigin(0.5, 1)
      .setScale(0.65)
      .setAlpha(0)
      .setDepth(20);

    const teemoTexture = this.textures.exists('teemo-overworld') ? 'teemo-overworld' : 'player-overworld';
    this.teemoSprite = this.add.sprite(480, 350, teemoTexture, 7)
      .setOrigin(0.5, 1)
      .setScale(teemoTexture === 'teemo-overworld' ? 0.56 : 0.54)
      .setAlpha(0)
      .setDepth(18);

    const villagerTexture = this.textures.exists('world-actor-yordle-explorer')
      ? 'world-actor-yordle-explorer'
      : (this.textures.exists('world-actor-yordle-villager-woman') ? 'world-actor-yordle-villager-woman' : 'player-overworld');
    this.villagerSprite = this.add.sprite(620, 350, villagerTexture, 7)
      .setOrigin(0.5, 1)
      .setScale(villagerTexture === 'player-overworld' ? 0.52 : 0.56)
      .setAlpha(0)
      .setDepth(19);

    this.add.ellipse(480, 354, 58, 16, 0x07131e, 0.28).setDepth(10);
  }

  private createDialogueUi(): void {
    const frame = createNarrativeFrame(
      this,
      20,
      350,
      920,
      170,
      'NARRACIÓN',
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
    this.time.delayedCall(280, () => {
      this.portal?.setAlpha(1);
      this.tweens.add({
        targets: this.portal,
        scale: 1,
        duration: 650,
        ease: 'Back.easeOut'
      });
      this.cameras.main.flash(160, 150, 230, 255);
    });

    this.time.delayedCall(720, () => {
      this.teemoSprite?.setAlpha(1).setFrame(7);
    });

    this.time.delayedCall(980, () => {
      this.playerSprite?.setAlpha(1);
      this.tweens.add({
        targets: this.playerSprite,
        y: 348,
        angle: 8,
        duration: 520,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.playerSprite?.setAngle(0).setFrame(1);
          this.teemoSprite?.setAngle(90).setY(360);
          this.cameras.main.shake(220, 0.009);
          this.cameras.main.flash(120, 255, 245, 220);
          this.portal?.setAlpha(0.25);
        }
      });
    });

    this.time.delayedCall(1380, () => {
      this.villagerSprite?.setAlpha(1);
      this.tweens.add({
        targets: this.villagerSprite,
        x: 555,
        duration: 420,
        ease: 'Sine.easeOut'
      });
    });

    this.time.delayedCall(1840, () => {
      this.dialoguePanel?.setAlpha(1);
      this.dialogueIndex = 0;
      this.renderDialogue();
      this.inputArmAt = this.time.now + 350;
    });
  }

  private lines(): IntroLine[] {
    const player = this.save.player.name || 'Viajero';
    return [
      {
        speaker: 'NARRACIÓN',
        mode: 'narration',
        text: 'El portal te expulsa sobre el Claro de Bandle con bastante menos elegancia de la prevista.'
      },
      { speaker: player, mode: 'speech', text: '¿Qué... ha sido eso?' },
      { speaker: 'Yordle del Claro', mode: 'speech', text: '¡TEEMO! ¡Aparta, aparta! Está respirando, pero no responde.' },
      { speaker: player, mode: 'speech', text: 'Yo... he caído encima de él. No sabía que había alguien debajo.' },
      { speaker: 'Yordle del Claro', mode: 'speech', text: 'Las explicaciones luego. Ayúdame a llevarlo a la aldea. Lulu sabrá qué hacer.' },
      {
        speaker: 'NARRACIÓN',
        mode: 'narration',
        text: 'Poco después, llegas a la Aldea de Bandle con Teemo inconsciente. Algo extraño ha quedado vibrando en el Claro.'
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
    this.teemoSprite?.setAngle(0).setFrame(1).setAlpha(0.9);

    this.tweens.add({
      targets: travelers,
      y: '-=105',
      alpha: { from: 1, to: 0.78 },
      duration: 520,
      ease: 'Sine.easeInOut'
    });

    this.time.delayedCall(260, () => this.cameras.main.fadeOut(360, 8, 15, 24));
    this.time.delayedCall(640, () => {
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
