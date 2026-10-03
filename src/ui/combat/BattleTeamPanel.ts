import Phaser from 'phaser';
import type { AffinityId } from '../../data/types';
import { TypeBadge } from '../components/TypeBadge';
import { UiKit } from '../components/UiKit';
import { UI } from '../theme/UiTheme';

export const TEAM_PANEL_WIDTH = 384;
export const CHAMPION_ROW_HEIGHT = 46;
export const SUMMON_ROW_HEIGHT = 32;

export function createTeamPanel(scene: Phaser.Scene, x: number, y: number, height: number, player: boolean): Phaser.GameObjects.Container {
  const frame = scene.add.image(0, 0, 'battle-ui-960', player ? '03_panel_player.png' : '02_panel_enemy.png')
    .setOrigin(0).setDisplaySize(TEAM_PANEL_WIDTH, height);
  return scene.add.container(x, y, [frame]).setDepth(620);
}

export function addHealthRow(scene: Phaser.Scene, panel: Phaser.GameObjects.Container, y: number, options: {
  name: string; hp: number; maxHp: number; player: boolean;
  mastery?: number; types?: AffinityId[]; status?: string; summon?: boolean;
}): { fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text } {
  const compact = Boolean(options.summon);
  const objects: Phaser.GameObjects.GameObject[] = [];
  objects.push(UiKit.label(scene, compact ? 24 : 12, y + 3, options.name.toUpperCase(), compact ? '10px' : '12px',
    compact ? UI.text.gold : UI.text.primary, true));
  if (options.mastery !== undefined) {
    objects.push(UiKit.label(scene, 158, y + 5, `M${options.mastery}`, '9px', UI.text.accent, true));
  }
  options.types?.slice(0, 2).forEach((id, index) => {
    objects.push(TypeBadge.add(scene, 200 + index * 84, y + 2, id, { width: 80, height: 16, iconSize: 10, fontSize: '7px' }));
  });
  const barX = compact ? 150 : 12;
  const barY = y + (compact ? 12 : 26);
  const width = compact ? 116 : 254;
  objects.push(scene.add.image(barX - 2, barY - 7, 'battle-ui-960', options.player ? '24_hp_bar_frame_player.png' : '23_hp_bar_frame_enemy.png')
    .setOrigin(0).setDisplaySize(width + 4, 14));
  const ratio = Phaser.Math.Clamp(options.hp / Math.max(1, options.maxHp), 0, 1);
  const fill = scene.add.rectangle(barX, barY, width * ratio, 6,
    ratio > 0.5 ? UI.colors.hp : ratio > 0.2 ? UI.colors.hpMid : UI.colors.hpLow).setOrigin(0, 0.5);
  const text = UiKit.label(scene, 370, barY - 7, `${Math.max(0, options.hp)}/${options.maxHp}`, '10px', UI.text.primary, true).setOrigin(1, 0);
  objects.push(fill, text);
  if (options.status) objects.push(UiKit.label(scene, 12, y + 36, options.status, '8px', UI.text.secondary).setWordWrapWidth(354));
  panel.add(objects);
  return { fill, text };
}
