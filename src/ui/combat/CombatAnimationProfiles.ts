import type { SkillDefinition } from '../../data/types';
import authoredProfiles from './skill-animation-profiles.json';

export type AnimationFamily = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9' | 'P10' | 'P11' | 'P12' | 'P13' | 'P14' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
export interface CombatAnimationProfile {
  family: AnimationFamily;
  championId: string;
  weapon: string;
  skillId?: string;
  color: number;
  accent: number;
  ultimate: boolean;
  self: boolean;
  friendly: boolean;
  skill?: SkillDefinition;
}

export const SKILL_ANIMATION_PROFILES = authoredProfiles as Record<string, { family: AnimationFamily; championId: string; weapon: string; slot: string }>;
export const BASIC_ANIMATION_PROFILES: Record<string, [AnimationFamily, string]> = {
  ahri: ['P3', 'orb'], akali: ['P6', 'kunai'], corki: ['P2', 'bullet'], garen: ['P6', 'sword'],
  gnar: ['P1', 'boomerang'], irelia: ['P6', 'blades'], ivern: ['P5', 'branch'], jhin: ['P2', 'bullet'],
  karma: ['P3', 'orb'], kayn: ['P6', 'scythe'], kennen: ['P1', 'shuriken'], kled: ['P6', 'axe'],
  'lee-sin': ['P5', 'fist'], lillia: ['P5', 'staff'], lulu: ['P3', 'spark'], 'master-yi': ['P6', 'sword'],
  poppy: ['P5', 'hammer'], rakan: ['P5', 'fist'], rumble: ['P5', 'metal'], sett: ['P5', 'fist'],
  shen: ['P6', 'sword'], syndra: ['P3', 'orb'], teemo: ['P1', 'dart'], tristana: ['P2', 'bullet'],
  varus: ['P1', 'arrow'], veigar: ['P3', 'orb'], wukong: ['P5', 'staff'], xayah: ['P1', 'feather'],
  yasuo: ['P6', 'sword'], yone: ['P6', 'sword'], yunara: ['P3', 'talisman'], zed: ['P6', 'blades']
};

const palettes: Record<string, [number, number]> = {
  ahri: [0x68deff, 0xf3b9ed], akali: [0x72efb0, 0xc0b3ef], corki: [0xffb957, 0xffefd0],
  garen: [0xffdb7e, 0xeaf3ff], gnar: [0xf2b277, 0xf8e2b2], irelia: [0x9cd9ff, 0xf1bbd7],
  ivern: [0x81d98c, 0xffdf91], jhin: [0xe7b998, 0xcc5776], karma: [0x74e4c8, 0xf8dd96],
  kayn: [0xa180eb, 0xd7bbff], kennen: [0x92d8ff, 0xe9f2ff], kled: [0xf4bf80, 0xcdec9c],
  'lee-sin': [0xffc496, 0xeaf4b6], lillia: [0xd6a5ff, 0xabf2cd], lulu: [0xdca5fa, 0xf3e092],
  'master-yi': [0x8ef0a8, 0xfaf0b2], poppy: [0xffd378, 0xcbebff], rakan: [0xffdbac, 0xed99c3],
  rumble: [0xff9258, 0xffdf79], sett: [0xffb858, 0xe65d66], shen: [0xa8b3ff, 0x95e4e5],
  syndra: [0xb581ed, 0xe6b1ff], teemo: [0xa9df68, 0xf6c97b], tristana: [0xffb363, 0xf7ead6],
  varus: [0xb58bff, 0xf1bbdc], veigar: [0xa174ed, 0xffd179], wukong: [0xf7c46e, 0xaff0e3],
  xayah: [0xe381b2, 0xa9b3fa], yasuo: [0xace7e9, 0xefebc5], yone: [0xed8498, 0xcdeeff],
  yunara: [0x88e5e9, 0xffddb2], zed: [0xb69ad6, 0xf18699]
};

export function animationProfile(skill: SkillDefinition | null, hasDamage: boolean, championId = skill?.championId ?? '', formId?: string): CombatAnimationProfile {
  const authored = skill ? SKILL_ANIMATION_PROFILES[skill.id] : undefined;
  const basic = BASIC_ANIMATION_PROFILES[championId] ?? ['P5', 'default'];
  const family: AnimationFamily = authored?.family ?? (skill ? (hasDamage ? 'P3' : skill.effects.some(e => e.type === 'heal') ? 'S1' : 'S3') : basic[0]);
  const [base, accent] = palettes[championId] ?? [0xb8deeb, 0xffe1a8];
  const self = family === 'S3' || family === 'S4' || skill?.id === 'gnar-transform'
    || Boolean(skill && skill.effects.length && skill.effects.every(e => e.target === 'self'));
  const friendly = Boolean(skill && skill.effects.some(e =>
    (e.type === 'heal' || e.type === 'buff' || e.statusKind === 'shield' || e.statusKind === 'block')
    && ['ally', 'any-ally', 'all-allies'].includes(e.target ?? '')));
  const id = skill?.id ?? '';
  const shadow = id.startsWith('shadow-kayn-') || formId === 'shadow-assassin';
  const rhaast = id.startsWith('rhaast-') || formId === 'rhaast';
  return {
    family: !skill && championId === 'gnar' && formId === 'mega-gnar' ? 'P5' : family,
    championId, weapon: authored?.weapon && authored.weapon !== 'default' ? authored.weapon : basic[1], skillId: skill?.id,
    color: rhaast ? 0xe26372 : shadow ? 0x72d1ff : id.includes('charm') ? 0xf6a1d4 : base,
    accent, ultimate: skill?.slot === 'r' || ['karma-soulflare','karma-renewal','karma-defiance'].includes(id), self, friendly, skill: skill ?? undefined
  };
}
