import Phaser from 'phaser';
import { DataRegistry } from '../../data/DataRegistry';
import { COMBAT_BACKGROUNDS, combatBackgroundForMap } from './CombatBackgrounds';
import type { SkillDefinition } from '../../data/types';
import { animationProfile, type CombatAnimationProfile } from './CombatAnimationProfiles';
import { playAnimation, type AnimationOptions } from './CombatAnimationPlayer';

export type CombatVfxKind = CombatAnimationProfile;

// Future skills can override the inferred effect without changing either battle scene.
export const SKILL_VFX_OVERRIDES: Record<string, CombatVfxKind> = {};

export function skillVfx(skill: SkillDefinition | null, hasDamage: boolean, championId?: string, formId?: string): CombatVfxKind {
  if (skill && SKILL_VFX_OVERRIDES[skill.id]) return SKILL_VFX_OVERRIDES[skill.id];
  return animationProfile(skill, hasDamage, championId, formId);
}

export function drawCombatBackdrop(scene: Phaser.Scene, height = 376): void {
  scene.cameras.main.setBackgroundColor('#07131e');
  const session = scene.registry.get('battle.teamSession') ?? scene.registry.get('battle.doubleSession');
  const standalone = scene.sys.settings.key === 'DoubleBattleScene'
    && (session?.kind === 'showdown' || session?.kind === 'sandbox');
  const mapId = standalone ? undefined : (scene.registry.get('save') as { currentMapId?: string } | undefined)?.currentMapId;
  const map = mapId ? DataRegistry.maps().find(entry => entry.id === mapId) : undefined;
  const background = COMBAT_BACKGROUNDS[combatBackgroundForMap(map)];
  const key = scene.textures.exists(background.key) ? background.key : COMBAT_BACKGROUNDS.generic.key;
  scene.add.image(480, 270, key)
    .setDisplaySize(960, 540).setDepth(0);
  scene.add.rectangle(0, height, 960, 540 - height, 0x020912, 0.94).setOrigin(0, 0).setDepth(500);
  scene.add.line(0, height, 12, 0, 948, 0, 0x33535f, 0.9).setOrigin(0, 0).setDepth(505);
}

export function playCombatVfx(
  scene: Phaser.Scene,
  source: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  target: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  kind: CombatVfxKind,
  options: AnimationOptions = {}
): Promise<void> {
  return playAnimation(scene, source, [target], kind, options);
}


export function playCombatVfxGroup(
  scene: Phaser.Scene,
  source: Phaser.GameObjects.Image | Phaser.GameObjects.Container,
  targets: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Container>,
  kind: CombatVfxKind,
  options: AnimationOptions = {}
): Promise<void> {
  const uniqueTargets = [...new Set(targets)];
  if (uniqueTargets.length === 0) return Promise.resolve();
  return playAnimation(scene, source, uniqueTargets, kind, options);
}
