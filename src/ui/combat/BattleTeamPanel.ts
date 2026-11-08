import Phaser from 'phaser';
import type { CombatStatusInstance } from '../../systems/combat/StatusEngine';
import { drawStatusBadges, linkedEchoGlyph, masteryLabel, updateShieldBar } from './CombatHud';
import { UiKit } from '../components/UiKit';
import { UI } from '../theme/UiTheme';

export const TEAM_PANEL_WIDTH = 384;
export const CHAMPION_HP_WIDTH = 194;
export const CHAMPION_ROW_HEIGHT = 46;
export const SUMMON_ROW_HEIGHT = 32;

export function createTeamPanel(scene: Phaser.Scene, x: number, y: number, height: number, player: boolean): Phaser.GameObjects.Container {
  const frame = scene.add.image(0, 0, 'battle-ui-960', player ? '03_panel_player.png' : '02_panel_enemy.png')
    .setOrigin(0).setDisplaySize(TEAM_PANEL_WIDTH, height);
  return scene.add.container(x, y, [frame]).setDepth(620);
}

export function addHealthRow(scene: Phaser.Scene, panel: Phaser.GameObjects.Container, y: number, options: {
  name: string; hp: number; maxHp: number; player: boolean;
  mastery?: number; statuses?: CombatStatusInstance[]; resource?: string | null; linked?: boolean; summon?: boolean;
}): { fill: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text;
  shieldFill: Phaser.GameObjects.Rectangle; statusLayer: Phaser.GameObjects.Container; barY: number } {
  const compact = Boolean(options.summon);
  const objects: Phaser.GameObjects.GameObject[] = [];
  const name = UiKit.label(scene, compact ? 24 : 12, y + 3, options.name.toUpperCase(), compact ? '10px' : '12px',
    compact ? UI.text.gold : UI.text.primary, true);
  if (!compact && name.width > 138) name.setFontSize('10px');
  objects.push(name);
  if (options.mastery !== undefined) {
    objects.push(masteryLabel(scene, 12, y + 21, options.mastery));
  }
  const statusLayer = scene.add.container(156, y + 2);
  drawStatusBadges(scene, statusLayer, options.statuses ?? []);
  objects.push(statusLayer);
  if (options.linked) objects.push(linkedEchoGlyph(scene, 350, y + 3));
  const barX = compact ? 150 : 72;
  const barY = y + (compact ? 12 : 26);
  const width = compact ? 116 : CHAMPION_HP_WIDTH;
  objects.push(scene.add.image(barX - 2, barY - 7, 'battle-ui-960', options.player ? '24_hp_bar_frame_player.png' : '23_hp_bar_frame_enemy.png')
    .setOrigin(0).setDisplaySize(width + 4, 14));
  const ratio = Phaser.Math.Clamp(options.hp / Math.max(1, options.maxHp), 0, 1);
  const fill = scene.add.rectangle(barX, barY, width * ratio, 6,
    ratio > 0.5 ? UI.colors.hp : ratio > 0.2 ? UI.colors.hpMid : UI.colors.hpLow).setOrigin(0, 0.5);
  const text = UiKit.label(scene, 370, barY - 7, `${Math.max(0, options.hp)}/${options.maxHp}`, '10px', UI.text.primary, true).setOrigin(1, 0);
  const shieldFill = scene.add.rectangle(barX, barY, 0, 6, 0xe8f6ff, 0.98).setOrigin(0, 0.5);
  updateShieldBar(shieldFill, options.hp, options.maxHp, options.statuses ?? [], barX, barY, width);
  objects.push(fill, shieldFill, text);
  if (options.resource) objects.push(UiKit.label(scene, 72, y + 36, options.resource, '8px', UI.text.secondary).setWordWrapWidth(294));
  panel.add(objects);
  return { fill, text, shieldFill, statusLayer, barY };
}
