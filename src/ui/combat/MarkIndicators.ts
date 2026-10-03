import Phaser from 'phaser';
import type { CombatMarkState } from '../../systems/combat/CombatMechanicsEngine';
import { UiKit } from '../components/UiKit';
import { UI } from '../theme/UiTheme';

/** Marks belong to the affected echo; never merge marks from different casters. */
export function addMarkIndicators(scene: Phaser.Scene, layer: Phaser.GameObjects.Container,
  marks: CombatMarkState[], x = 0, y = 0): void {
  marks.filter(mark => mark.stacks > 0 && mark.remainingTurns > 0).forEach((mark, index) => {
    const width = 28;
    const badge = scene.add.container(x + index * width, y);
    const icon = scene.add.graphics().lineStyle(1, 0x79d4e4)
      .strokeCircle(6, 6, 5).lineBetween(6, 0, 6, 12).lineBetween(0, 6, 12, 6);
    const text = UiKit.label(scene, 15, 0, `${mark.stacks}`, '7px', UI.text.gold, true);
    badge.add([icon, text]);
    // Hover reveals the mark's stack count and remaining duration.
    const hint = UiKit.label(scene, 0, -16, `Marcas · ${mark.stacks} · ${mark.remainingTurns}T`, '9px', UI.text.primary, true)
      .setBackgroundColor('#07131e').setPadding(3).setVisible(false);
    badge.add(hint);
    badge.setSize(width - 2, 12).setInteractive(new Phaser.Geom.Rectangle(0, 0, width - 2, 12), Phaser.Geom.Rectangle.Contains);
    badge.on('pointerover', () => hint.setVisible(true));
    badge.on('pointerout', () => hint.setVisible(false));
    layer.add(badge);
  });
}
