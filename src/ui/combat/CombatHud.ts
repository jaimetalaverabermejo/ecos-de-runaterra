import type Phaser from 'phaser';
import type { CombatStatusKind } from '../../data/types';
import type { CombatStatusInstance } from '../../systems/combat/StatusEngine';
import { UiKit } from '../components/UiKit';
import { UI } from '../theme/UiTheme';

const STATUS_BADGES: Partial<Record<CombatStatusKind, { text: string; color: number }>> = {
  stun: { text: 'ATU', color: 0x987609 },
  airborne: { text: 'AIR', color: 0x80552e },
  fear: { text: 'MIE', color: 0x785481 },
  sleep: { text: 'DOR', color: 0x53677f },
  polymorph: { text: 'POL', color: 0x75509d },
  banish: { text: 'DES', color: 0x414d88 },
  recharge: { text: 'REC', color: 0x616b76 },
  charm: { text: 'ENC', color: 0xa54679 },
  taunt: { text: 'PRO', color: 0x984d38 },
  root: { text: 'INM', color: 0x356f83 },
  blind: { text: 'CEG', color: 0x646044 },
  poison: { text: 'VEN', color: 0x8044a0 },
  burn: { text: 'QUE', color: 0xb63230 }
};

/** One badge per active condition, with action-blocking conditions first. */
export function combatStatusBadges(statuses: CombatStatusInstance[]): Array<{ text: string; color: number }> {
  return Object.entries(STATUS_BADGES).flatMap(([kind, badge]) =>
    statuses.some(status => status.kind === kind && status.remainingTurns > 0) ? [badge!] : []);
}

export function drawStatusBadges(scene: Phaser.Scene, layer: Phaser.GameObjects.Container,
  statuses: CombatStatusInstance[], width = 174): void {
  layer.removeAll(true);
  const badges = combatStatusBadges(statuses);
  const capacity = Math.max(1, Math.floor((width + 4) / 34));
  const visible = badges.length > capacity ? badges.slice(0, capacity - 1) : badges;
  const entries = badges.length > capacity
    ? [...visible, { text: `+${badges.length - visible.length}`, color: 0x405166 }] : visible;
  entries.forEach((badge, index) => {
    const x = index * 34;
    const plate = scene.add.rectangle(x, 0, 30, 15, badge.color).setOrigin(0)
      .setStrokeStyle(1, 0xb8c9d4, 0.65);
    const text = UiKit.label(scene, x + 15, 7, badge.text, '9px', '#ffffff', true).setOrigin(0.5);
    layer.add([plate, text]);
  });
}

/** A single normal-weight text object: both glyphs share font, size and color. */
export function masteryLabel(scene: Phaser.Scene, x: number, y: number, mastery: number, size = '12px'): Phaser.GameObjects.Text {
  return UiKit.label(scene, x, y, `m${mastery}`, size, UI.text.accent, false);
}

/** Two small interlocked, irregular runic links; no medallion or selection tick. */
export function linkedEchoGlyph(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const glyph = scene.add.graphics({ x, y }).lineStyle(1.5, 0x75d4e8, 0.95);
  glyph.beginPath();
  glyph.moveTo(1, 5); glyph.lineTo(6, 0); glyph.lineTo(12, 3);
  glyph.lineTo(10, 8); glyph.lineTo(5, 10); glyph.lineTo(1, 5); glyph.strokePath();
  glyph.beginPath();
  glyph.moveTo(9, 5); glyph.lineTo(14, 1); glyph.lineTo(20, 5);
  glyph.lineTo(16, 10); glyph.lineTo(11, 8); glyph.strokePath();
  return glyph;
}

export function shieldBarGeometry(hp: number, maxHp: number, shield: number, width: number): { start: number; width: number } {
  const total = Math.max(1, maxHp);
  const hpWidth = width * Math.max(0, Math.min(1, hp / total));
  const shieldWidth = width * Math.max(0, Math.min(1, shield / total));
  return { start: Math.min(hpWidth, width - shieldWidth), width: shieldWidth };
}

export function updateShieldBar(fill: Phaser.GameObjects.Rectangle, hp: number, maxHp: number,
  statuses: CombatStatusInstance[], barX: number, barY: number, width: number): void {
  const shield = statuses.filter(status => status.kind === 'shield' && status.remainingTurns > 0)
    .reduce((total, status) => total + Math.max(0, status.power), 0);
  const geometry = shieldBarGeometry(hp, maxHp, shield, width);
  fill.setPosition(barX + geometry.start, barY);
  fill.displayWidth = geometry.width;
  fill.setVisible(geometry.width > 0);
}
