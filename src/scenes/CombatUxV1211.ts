import Phaser from 'phaser';
import { BattleScene } from './BattleScene';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

const MAX_SHIELD_EXTENSION_PX = 22;

export function applyCombatUxV1211(): void {
  const prototype = BattleScene.prototype as any;
  if (prototype.__combatUxV1211Applied) return;
  prototype.__combatUxV1211Applied = true;

  const originalUpdateHpUi = prototype.updateHpUi;
  const originalRenderStatusIcons = prototype.renderStatusIcons;

  prototype.updateHpUi = function (ui: any, hp: number, statuses: any[]): void {
    originalUpdateHpUi.call(this, ui, hp, statuses);

    // The original shield rectangle was created with a base width of 0 px.
    // Phaser cannot reliably scale a zero-width geometry, so keep that legacy
    // object hidden and draw the visible shield with a real 1 px base shape.
    ui.shieldFill?.setVisible(false);

    if (!ui.shieldExtension || !ui.shieldExtension.active) {
      ui.shieldExtension = this.add.rectangle(ui.barX, ui.barY, 1, 7, 0xf7fbff, 1)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x9fb4c4, 0.95)
        .setDepth((ui.fill?.depth ?? 0) + 1)
        .setVisible(false);
    }

    const shield = this.totalShield(statuses);
    if (shield <= 0) {
      ui.shieldExtension.setVisible(false);
      return;
    }

    const hpRatio = Phaser.Math.Clamp(hp / ui.maxHp, 0, 1);
    const hpWidth = ui.maxWidth * hpRatio;
    const naturalShieldWidth = ui.maxWidth * (shield / ui.maxHp);
    const shieldWidth = Math.max(4, Math.min(MAX_SHIELD_EXTENSION_PX, naturalShieldWidth));

    // Treat shield as temporary effective life. It begins exactly where the
    // current HP segment ends. At full HP it therefore extends beyond the
    // normal track instead of covering or replacing the green HP bar.
    ui.shieldExtension.setPosition(ui.barX + hpWidth, ui.barY);
    ui.shieldExtension.displayWidth = shieldWidth;
    ui.shieldExtension.setVisible(true);
  };

  // Once shield is represented directly in the HP bar, the extra shield icon
  // below the bar is redundant and makes the visual language less clear.
  prototype.renderStatusIcons = function (layer: any, statuses: any[]): void {
    originalRenderStatusIcons.call(this, layer, statuses.filter((status: any) => status.kind !== 'shield'));
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
