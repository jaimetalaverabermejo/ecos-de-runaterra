import Phaser from 'phaser';
import type { DialogueDefinition } from '../../data/narrativeTypes';
import type { SaveGame } from '../../state/GameState';
import { SaveService } from '../save/SaveService';
import { WorldActionService } from './WorldActionService';

type PhysicsPlayer = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

export interface VeigarInteraction {
  id: string;
  action: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visual?: Phaser.GameObjects.Container;
}

export class VeigarSecretController {
  private door?: VeigarInteraction;
  private flame?: Phaser.GameObjects.Container;
  private flameActive = false;
  private flamePathIndex = 0;
  private flameResetAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly save: SaveGame,
    private readonly player: PhysicsPlayer,
    private readonly beginDialogue: (dialogue: DialogueDefinition) => void
  ) {}

  get chasingFlame(): boolean {
    return this.flameActive;
  }

  shouldSkipInteraction(action: string): boolean {
    if (action === 'veigar_rune') return this.flag('secret:veigar-rune');
    if (action === 'veigar_door') return this.flag('secret:veigar-door-open');
    return false;
  }

  decorate(interaction: VeigarInteraction): void {
    if (interaction.action === 'veigar_rune') {
      interaction.visual = this.runeMarker(interaction);
    } else if (interaction.action === 'veigar_door') {
      this.door = interaction;
      interaction.visual = this.doorSeals(interaction);
    }
  }

  handle(interaction: VeigarInteraction): { handled: boolean; consume?: boolean } {
    if (interaction.action === 'veigar_rune') {
      this.activateRune(interaction);
      return { handled: true, consume: true };
    }
    if (interaction.action === 'veigar_door') {
      this.inspectDoor();
      return { handled: true };
    }
    return { handled: false };
  }

  createRuntime(): void {
    if (this.save.currentMapId !== 'dark_forest') return;
    if (!this.flag('ability:sprint-unlocked')) return;
    if (!this.flag('secret:veigar-rune') || !this.flag('secret:veigar-combat')) return;
    if (this.flag('secret:veigar-flame') || this.flag('secret:veigar-door-open')) return;

    const glow = this.scene.add.circle(0, 0, 11, 0xa65cff, 0.22);
    const core = this.scene.add.circle(0, 0, 5, 0xd5a3ff, 0.95);
    const tail = this.scene.add.ellipse(-7, 7, 8, 15, 0x7a39bd, 0.58).setAngle(24);
    this.flame = this.scene.add.container(800, 1280, [glow, tail, core])
      .setDepth(2160)
      .setAlpha(0.78);
    this.scene.tweens.add({
      targets: [glow, core],
      scale: { from: 0.9, to: 1.12 },
      alpha: { from: 0.62, to: 1 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(delta: number): void {
    const flame = this.flame;
    if (!flame || this.flag('secret:veigar-flame')) return;

    if (this.flameResetAt > 0) {
      if (this.scene.time.now < this.flameResetAt) return;
      this.flameResetAt = 0;
      this.flameActive = false;
      this.flamePathIndex = 0;
      flame.setPosition(800, 1280).setAlpha(0.78).setVisible(true);
    }

    const distanceToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, flame.x, flame.y);
    if (!this.flameActive) {
      if (distanceToPlayer > 108) return;
      this.flameActive = true;
      this.flamePathIndex = 0;
      this.scene.tweens.add({
        targets: flame,
        scale: 1.18,
        duration: 100,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    if (distanceToPlayer <= 24) {
      this.catchFlame();
      return;
    }

    const path = [
      { x: 640, y: 1280 },
      { x: 480, y: 1280 },
      { x: 320, y: 1280 }
    ];
    const target = path[this.flamePathIndex];
    if (!target) {
      this.flameActive = false;
      flame.setVisible(false);
      this.flameResetAt = this.scene.time.now + 1100;
      return;
    }

    const dx = target.x - flame.x;
    const dy = target.y - flame.y;
    const distance = Math.hypot(dx, dy);
    const travel = 145 * (delta / 1000);
    if (distance <= travel) {
      flame.setPosition(target.x, target.y);
      this.flamePathIndex += 1;
    } else if (distance > 0) {
      flame.x += (dx / distance) * travel;
      flame.y += (dy / distance) * travel;
    }
    flame.setDepth(880 + Math.round(flame.y));

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, flame.x, flame.y) <= 24) {
      this.catchFlame();
    }
  }

  maybeShowHint(): void {
    if (this.save.currentMapId !== 'bandle-village') return;
    if (!this.flag('ability:sprint-unlocked') || !this.flag('story:veigar-house-mystery')) return;
    if (this.flag('secret:veigar-flame-hint-seen') || this.flag('secret:veigar-flame')) return;
    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, 1296, 516) > 120) return;

    this.setFlag('secret:veigar-flame-hint-seen');
    const spark = this.scene.add.circle(this.player.x - 24, this.player.y - 22, 5, 0xb66dff, 0.72)
      .setDepth(950 + Math.round(this.player.y));
    this.scene.tweens.add({
      targets: spark,
      x: spark.x - 96,
      y: spark.y + 8,
      alpha: 0,
      scale: 0.6,
      duration: 950,
      ease: 'Sine.easeInOut',
      onComplete: () => spark.destroy()
    });
  }

  onDialogueClosed(dialogueId?: string): void {
    if (dialogueId === 'veigar-rune-found') {
      this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
      SaveService.save(this.save);
      this.scene.time.delayedCall(80, () => this.scene.scene.restart());
    } else if (dialogueId === 'veigar-door-open') {
      this.save.playerPosition = { x: Math.round(this.player.x), y: Math.round(this.player.y + 28) };
      SaveService.save(this.save);
      this.scene.time.delayedCall(120, () => this.scene.scene.restart());
    }
  }

  private activateRune(interaction: VeigarInteraction): void {
    if (this.flag('secret:veigar-rune')) return;
    this.player.body.setVelocity(0, 0);
    this.setFlag('secret:veigar-rune');
    interaction.visual?.destroy(true);
    this.refreshDoor();
    this.scene.cameras.main.flash(160, 102, 48, 150);
    this.beginDialogue({
      id: 'veigar-rune-found',
      startNodeId: 'inicio',
      nodes: [{
        id: 'inicio',
        speaker: '',
        mode: 'narration',
        lines: [
          'El símbolo grabado en la superficie responde al acercar la mano.',
          'La luz morada se apaga. Desde algún lugar del bosque, la hierba cruje.'
        ]
      }]
    });
  }

  private inspectDoor(): void {
    this.player.body.setVelocity(0, 0);
    const cleared = this.sealCount();
    if (cleared < 3) {
      const line = cleared === 0
        ? 'Tres símbolos oscuros recorren la puerta. No hay cerradura ni pomo que parezca servir de nada.'
        : cleared === 1
          ? 'Uno de los tres símbolos ha perdido su luz. Los otros dos siguen respondiendo desde la madera.'
          : 'Dos símbolos están apagados. El último todavía pulsa con una luz morada tenue.';
      this.beginDialogue({
        id: 'veigar-door-sealed',
        startNodeId: 'inicio',
        nodes: [{
          id: 'inicio',
          speaker: '',
          mode: 'narration',
          lines: [line, 'Algo al otro lado parece estar esperando.']
        }]
      });
      return;
    }

    if (this.flag('secret:veigar-door-open')) return;
    this.setFlag('secret:veigar-door-open');
    this.door?.visual?.destroy(true);
    this.scene.cameras.main.shake(210, 0.003);
    this.scene.cameras.main.flash(190, 112, 70, 170);
    this.beginDialogue({
      id: 'veigar-door-open',
      startNodeId: 'inicio',
      nodes: [{
        id: 'inicio',
        speaker: '',
        mode: 'narration',
        lines: [
          'El último símbolo se apaga.',
          'Durante un instante no ocurre nada. Después, la puerta cede con un pequeño chasquido.'
        ]
      }]
    });
  }

  private catchFlame(): void {
    const flame = this.flame;
    if (!flame || this.flag('secret:veigar-flame')) return;
    this.flameActive = false;
    this.setFlag('secret:veigar-flame');
    this.refreshDoor();
    this.scene.cameras.main.flash(170, 105, 55, 155);
    this.scene.tweens.add({
      targets: flame,
      alpha: 0,
      scale: 0.35,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => {
        flame.destroy(true);
        this.flame = undefined;
      }
    });
    this.beginDialogue({
      id: 'veigar-flame-caught',
      startNodeId: 'inicio',
      nodes: [{
        id: 'inicio',
        speaker: '',
        mode: 'narration',
        lines: [
          'La llama se deshace entre tus manos sin quemarte.',
          'En dirección a la casa de Veigar, una última pulsación atraviesa el bosque.'
        ]
      }]
    });
  }

  private sealCount(): number {
    return ['secret:veigar-rune', 'secret:veigar-combat', 'secret:veigar-flame']
      .filter((id) => this.flag(id)).length;
  }

  private refreshDoor(): void {
    if (!this.door) return;
    this.door.visual?.destroy(true);
    this.door.visual = this.doorSeals(this.door);
  }

  private runeMarker(interaction: VeigarInteraction): Phaser.GameObjects.Container {
    const glyph = this.glyph(true);
    const x = interaction.x + interaction.width / 2;
    const y = interaction.y + interaction.height / 2;
    const marker = this.scene.add.container(x, y, [glyph]).setDepth(170 + Math.round(y));
    this.scene.tweens.add({
      targets: glyph,
      alpha: { from: 0.62, to: 1 },
      scale: { from: 0.92, to: 1.08 },
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return marker;
  }

  private doorSeals(interaction: VeigarInteraction): Phaser.GameObjects.Container {
    const states = [
      this.flag('secret:veigar-rune'),
      this.flag('secret:veigar-combat'),
      this.flag('secret:veigar-flame')
    ];
    const glyphs = states.map((cleared, index) => {
      const glyph = this.glyph(!cleared);
      glyph.setPosition((index - 1) * 24, 0);
      return glyph;
    });
    const x = interaction.x + interaction.width / 2;
    const y = interaction.y + interaction.height * 0.44;
    const container = this.scene.add.container(x, y, glyphs).setDepth(820 + Math.round(y));
    this.scene.tweens.add({
      targets: glyphs.filter((_glyph, index) => !states[index]),
      alpha: { from: 0.68, to: 1 },
      duration: 1050,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    return container;
  }

  private glyph(active: boolean): Phaser.GameObjects.Container {
    const glow = this.scene.add.circle(0, 0, 11, 0x6e35a8, active ? 0.22 : 0.05);
    const rune = this.scene.add.graphics();
    rune.lineStyle(2, active ? 0xc58cff : 0x75617f, active ? 0.95 : 0.32);
    rune.strokeCircle(0, 0, 8);
    rune.beginPath();
    rune.moveTo(0, -7);
    rune.lineTo(6, 0);
    rune.lineTo(0, 7);
    rune.lineTo(-6, 0);
    rune.closePath();
    rune.strokePath();
    rune.beginPath();
    rune.moveTo(0, -4);
    rune.lineTo(0, 4);
    rune.strokePath();
    return this.scene.add.container(0, 0, [glow, rune]);
  }

  private flag(id: string): boolean {
    return this.save.worldProgress.flags.includes(id);
  }

  private setFlag(id: string): void {
    WorldActionService.apply(this.save, { type: 'set-flag', id, value: true });
    SaveService.save(this.save);
  }
}
