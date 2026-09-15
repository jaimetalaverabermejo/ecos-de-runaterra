import Phaser from 'phaser';
import { BattleScene } from './BattleScene';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

const MAX_SHIELD_EXTENSION_PX = 18;

export function applyCombatUxV1211(): void {
  const prototype = BattleScene.prototype as any;
  if (prototype.__combatUxV1211Applied) return;
  prototype.__combatUxV1211Applied = true;

  const originalUpdateHpUi = prototype.updateHpUi;

  prototype.updateHpUi = function (ui: any, hp: number, statuses: any[]): void {
    originalUpdateHpUi.call(this, ui, hp, statuses);

    const shield = this.totalShield(statuses);
    if (shield <= 0) return;

    const hpRatio = Phaser.Math.Clamp(hp / ui.maxHp, 0, 1);
    const hpWidth = ui.maxWidth * hpRatio;
    const naturalShieldWidth = ui.maxWidth * (shield / ui.maxHp);
    const shieldWidth = Math.max(3, Math.min(MAX_SHIELD_EXTENSION_PX, naturalShieldWidth));

    // The shield is extra effective life: it starts exactly where current HP ends
    // and is allowed to extend beyond the normal HP track instead of being
    // squeezed back inside it.
    ui.shieldFill.setPosition(ui.barX + hpWidth, ui.barY);
    ui.shieldFill.displayWidth = shieldWidth;
    ui.shieldFill.setFillStyle(0xf7fbff, 1);
    ui.shieldFill.setStrokeStyle(1, 0x9fb4c4, 0.95);
    ui.shieldFill.setVisible(true);
  };

  prototype.awaitContinue = function (message: string): Promise<void> {
    this.setMessage(message);
    this.continueLayer?.destroy(true);
    this.awaitingContinue = true;

    return new Promise((resolve) => {
      let resolved = false;
      const keyboard = this.input.keyboard;

      const blocker = this.add.rectangle(256, 144, 512, 288, 0x000000, 0.001)
        .setInteractive();
      const hint = UiKit.label(this, 360, 211, '▼', UI.font.small, UI.text.accent, true)
        .setOrigin(1, 0);

      const done = (): void => {
        if (resolved) return;
        resolved = true;
        blocker.off(Phaser.Input.Events.POINTER_UP, done);
        keyboard?.off('keydown-A', done);
        keyboard?.off('keydown-ENTER', done);
        keyboard?.off('keydown-SPACE', done);
        this.continueLayer?.destroy(true);
        this.continueLayer = undefined;
        this.awaitingContinue = false;
        resolve();
      };

      blocker.once(Phaser.Input.Events.POINTER_UP, done);
      keyboard?.once('keydown-A', done);
      keyboard?.once('keydown-ENTER', done);
      keyboard?.once('keydown-SPACE', done);

      this.continueLayer = this.add.container(0, 0, [blocker, hint]).setDepth(11500);
    });
  };
}
