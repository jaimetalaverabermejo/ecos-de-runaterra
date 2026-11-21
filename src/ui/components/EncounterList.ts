import type Phaser from 'phaser';
import { Ui960Kit } from './Ui960Kit';
import { UI } from '../theme/UiTheme';

export function showEncounterList(
  scene: Phaser.Scene, title: string, rows: string[], empty: string, onClose: () => void,
  returnLabel = 'CERRAR'
): Phaser.GameObjects.Container {
  const modal = scene.add.container(0, 0).setDepth(12000);
  modal.add(scene.add.rectangle(480, 270, 960, 540, 0x020912, 0.84).setInteractive());
  modal.add(scene.add.rectangle(480, 270, 748, 414, UI.colors.panel).setStrokeStyle(2, UI.colors.gold));
  modal.add(Ui960Kit.label(scene, 130, 85, title, '22px', UI.text.gold, true));
  const pageSize = 9;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  let page = 0;
  const labels = Array.from({ length: pageSize }, (_, index) => Ui960Kit.label(
    scene, 138, 134 + index * 30, '', '14px', UI.text.primary, true
  ).setWordWrapWidth(674));
  modal.add(labels);
  const counter = Ui960Kit.label(scene, 246, 434, '', '12px', UI.text.secondary, true).setOrigin(0.5);
  modal.add(counter);
  const render = (): void => {
    const visible = rows.slice(page * pageSize, (page + 1) * pageSize);
    labels.forEach((label, index) => label.setText(visible[index] ?? (!rows.length && index === 0 ? empty : '')));
    counter.setText(pageCount > 1 ? `${page + 1} / ${pageCount}` : '');
  };
  if (pageCount > 1) {
    for (const [x, delta, glyph] of [[170, -1, '‹'], [322, 1, '›']] as const) {
      const button = Ui960Kit.button(scene, x, 434, 58, 40, glyph, () => {
        page = Math.max(0, Math.min(page + delta, pageCount - 1));
        render();
      });
      modal.add([button.button, button.label]);
    }
  }
  const close = Ui960Kit.button(scene, 735, 434, 148, 40, returnLabel, onClose);
  modal.add([close.button, close.label]);
  render();
  return modal;
}
