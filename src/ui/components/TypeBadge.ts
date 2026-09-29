import Phaser from 'phaser';
import { DataRegistry } from '../../data/DataRegistry';
import type { AffinityId } from '../../data/types';
import { UI } from '../theme/UiTheme';

export const TYPE_VISUALS: Record<AffinityId, { color: number; hex: string; texture: string }> = {
  marcial: { color: 0xb44655, hex: '#B44655', texture: 'type-marcial' },
  arcano: { color: 0x287f86, hex: '#287F86', texture: 'type-arcano' },
  espiritual: { color: 0xb95183, hex: '#B95183', texture: 'type-espiritual' },
  tecnologico: { color: 0x438a45, hex: '#438A45', texture: 'type-tecnologico' },
  primordial: { color: 0x94684f, hex: '#94684F', texture: 'type-primordial' },
  sombrio: { color: 0x343b47, hex: '#343B47', texture: 'type-sombrio' },
  celestial: { color: 0x96772f, hex: '#96772F', texture: 'type-celestial' },
  vacio: { color: 0x7042a0, hex: '#7042A0', texture: 'type-vacio' },
  runico: { color: 0x426ea8, hex: '#426EA8', texture: 'type-runico' }
};

export interface TypeBadgeOptions {
  width?: number;
  height?: number;
  fontSize?: string;
  iconSize?: number;
  alpha?: number;
  showLabel?: boolean;
}

export class TypeBadge {
  static add(scene: Phaser.Scene, x: number, y: number, id: AffinityId, options: TypeBadgeOptions = {}): Phaser.GameObjects.Container {
    const visual = TYPE_VISUALS[id];
    const height = options.height ?? 24;
    const width = options.width ?? 112;
    const iconSize = options.iconSize ?? Math.max(14, height - 6);
    const showLabel = options.showLabel ?? true;
    const radius = Math.floor(height / 2);
    const bg = scene.add.graphics();
    bg.fillStyle(visual.color, options.alpha ?? 1);
    bg.fillRoundedRect(0, 0, width, height, radius);
    bg.lineStyle(1, 0xffffff, 0.9);
    bg.strokeRoundedRect(0.5, 0.5, width - 1, height - 1, Math.max(1, radius - 1));

    const iconX = showLabel ? Math.max(12, iconSize / 2 + 5) : width / 2;
    const icon = scene.add.image(iconX, height / 2, visual.texture)
      .setDisplaySize(iconSize, iconSize)
      .setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [bg, icon];
    if (showLabel) {
      const label = scene.add.text(iconX + iconSize / 2 + 6, height / 2, DataRegistry.affinity(id).name.toUpperCase(), {
        fontFamily: UI.font.family,
        fontSize: options.fontSize ?? (height <= 20 ? '9px' : '11px'),
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      children.push(label);
    }
    return scene.add.container(x, y, children);
  }

  static row(scene: Phaser.Scene, x: number, y: number, ids: AffinityId[], options: TypeBadgeOptions & { gap?: number } = {}): Phaser.GameObjects.Container {
    const width = options.width ?? 112;
    const gap = options.gap ?? 6;
    const badges = ids.map((id, index) => this.add(scene, index * (width + gap), 0, id, options));
    return scene.add.container(x, y, badges);
  }
}
