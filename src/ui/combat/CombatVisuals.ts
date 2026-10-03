import Phaser from 'phaser';
import type { SkillDefinition } from '../../data/types';

export type CombatVfxKind = 'physical' | 'arcane' | 'spiritual' | 'shadow' | 'tech' | 'heal';

// Future skills can override the inferred effect without changing either battle scene.
export const SKILL_VFX_OVERRIDES: Record<string, CombatVfxKind> = {};

export function skillVfx(skill: SkillDefinition | null, hasDamage: boolean): CombatVfxKind {
  if (skill && SKILL_VFX_OVERRIDES[skill.id]) return SKILL_VFX_OVERRIDES[skill.id];
  if (!hasDamage) return 'heal';
  const affinity = skill?.affinityId ?? '';
  if (affinity.includes('sombrio')) return 'shadow';
  if (affinity.includes('espiritual') || affinity.includes('celestial')) return 'spiritual';
  if (affinity.includes('tecnologico')) return 'tech';
  return skill?.effects.some((effect) => effect.type === 'damage' && effect.stat === 'power') ? 'arcane' : 'physical';
}

export function drawCombatBackdrop(scene: Phaser.Scene, height = 376): void {
  scene.cameras.main.setBackgroundColor('#07131e');
  scene.add.image(480, 270, 'combat-bandle-background')
    .setDisplaySize(960, 540).setDepth(0);
  scene.add.rectangle(0, height, 960, 540 - height, 0x020912, 0.94).setOrigin(0, 0).setDepth(500);
  scene.add.line(0, height, 12, 0, 948, 0, 0x33535f, 0.9).setOrigin(0, 0).setDepth(505);
}

export function playCombatVfx(
  scene: Phaser.Scene,
  source: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  kind: CombatVfxKind
): Promise<void> {
  const colors: Record<CombatVfxKind, number> = {
    physical: 0xffdf9a, arcane: 0x79d8ff, spiritual: 0xa9f1c9,
    shadow: 0x9b7ce9, tech: 0xf9c46b, heal: 0x80ecad
  };
  const color = colors[kind];
  const startY = source.y - source.displayHeight * 0.55;
  const endY = target.y - target.displayHeight * 0.55;
  const orb = scene.add.circle(source.x, startY, kind === 'physical' ? 8 : 10, color, 0.95)
    .setStrokeStyle(2, 0xffffff, 0.9).setDepth(9000);
  const destination = kind === 'heal' ? source : target;
  return new Promise((resolve) => {
    scene.tweens.add({
      targets: orb,
      x: destination.x,
      y: destination === source ? startY - 28 : endY,
      scale: kind === 'physical' ? 1.5 : 1.9,
      duration: kind === 'physical' ? 160 : 270,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        scene.tweens.add({ targets: orb, scale: 2.8, alpha: 0, duration: 130,
          onComplete: () => { orb.destroy(); resolve(); } });
      }
    });
  });
}
