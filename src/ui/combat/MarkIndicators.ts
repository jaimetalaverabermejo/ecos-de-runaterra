import Phaser from 'phaser';
import type { CombatMarkState } from '../../systems/combat/CombatMechanicsEngine';
import { UiKit } from '../components/UiKit';
import { UI } from '../theme/UiTheme';

const names: Record<string, string> = {
  'xayah-feather': 'Plumas', 'varus-blight': 'Infección',
  'syndra-sphere': 'Esferas', 'akali-e': 'Shuriken', 'akali-combo': 'Combo'
};

/** Marks belong to the affected echo; never merge marks from different casters. */
export function addMarkIndicators(scene: Phaser.Scene, layer: Phaser.GameObjects.Container,
  marks: CombatMarkState[], x = 0, y = 0, compact = false): void {
  marks.filter(mark => mark.stacks > 0 && mark.remainingTurns > 0).forEach((mark, index) => {
    const width = compact ? 28 : 72;
    const badge = scene.add.container(x + index * width, y);
    const feather = mark.markId === 'xayah-feather';
    const icon = scene.add.graphics().fillStyle(feather ? 0xdb88cf : 0x79d4e4, 1);
    if (feather) {
      icon.fillTriangle(1, 11, 5, 1, 11, 1);
      icon.lineStyle(1, 0xffffff).lineBetween(1, 12, 9, 3);
    } else icon.fillCircle(6, 6, 5).lineStyle(1, 0xffffff).strokeCircle(6, 6, 5);
    const name = names[mark.markId] ?? 'Marca';
    const text = UiKit.label(scene, 15, 0, compact ? `${mark.stacks}` : `${name.toUpperCase()} ${mark.stacks}`, '7px', UI.text.gold, true);
    badge.add([icon, text]);
    // Hover reveals the mark's stack count and remaining duration.
    const hint = UiKit.label(scene, 0, -16, `${name} · ${mark.stacks} · ${mark.remainingTurns}T`, '9px', UI.text.primary, true)
      .setBackgroundColor('#07131e').setPadding(3).setVisible(false);
    badge.add(hint);
    badge.setSize(width - 2, 12).setInteractive(new Phaser.Geom.Rectangle(0, 0, width - 2, 12), Phaser.Geom.Rectangle.Contains);
    badge.on('pointerover', () => hint.setVisible(true));
    badge.on('pointerout', () => hint.setVisible(false));
    layer.add(badge);
  });
}
