import Phaser from 'phaser';
import type { ItemDefinition } from '../../data/types';
import { UI } from '../theme/UiTheme';

export function itemTextureKey(scene: Phaser.Scene, itemId: string): string | null {
  const key = `item-${itemId}`;
  return scene.textures.exists(key) ? key : null;
}

export function drawItemIcon(
  scene: Phaser.Scene,
  item: ItemDefinition,
  x: number,
  y: number,
  size = 40,
  selected = false
): Phaser.GameObjects.GameObject {
  const textureKey = itemTextureKey(scene, item.id);
  if (textureKey) {
    return scene.add.image(x, y, textureKey).setDisplaySize(size, size);
  }

  const border = item.tier === 'legendary' ? UI.colors.gold : item.tier === 'epic' ? UI.colors.purple : UI.colors.cyanGlow;
  const bg = scene.add.rectangle(x, y, size, size, UI.colors.panelAlt, 1).setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : border);
  scene.add.text(x, y, item.name.slice(0, 1).toUpperCase(), {
    fontFamily: UI.font.family,
    fontSize: `${Math.max(12, Math.floor(size * 0.42))}px`,
    fontStyle: 'bold',
    color: item.tier === 'legendary' ? UI.text.gold : item.tier === 'epic' ? UI.text.purple : UI.text.accent
  }).setOrigin(0.5);
  return bg;
}
