export type ChampionId = string;
export type SkillId = string;
export type ItemId = string;

export interface StatBlock {
  hp: number;
  attack: number;
  power: number;
  defense: number;
  resistance: number;
  speed: number;
}

export interface StatDefinition {
  id: keyof StatBlock;
  name: string;
  short: string;
  order: number;
}

export type SkillSlot = 'passive' | 'q' | 'w' | 'e' | 'r';

export interface SkillEffectDefinition {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'custom';
  stat?: keyof StatBlock;
  power?: number;
  durationTurns?: number;
  statusId?: string;
  handlerId?: string;
}

export interface SkillDefinition {
  id: SkillId;
  championId: ChampionId;
  name: string;
  slot: SkillSlot;
  unlockMastery: number;
  priority?: number;
  effects: SkillEffectDefinition[];
}

export interface ChampionDefinition {
  id: ChampionId;
  name: string;
  tags: string[];
  baseStats: StatBlock;
  passiveSkillId: SkillId;
  skillIds: [SkillId, SkillId, SkillId, SkillId];
}

export interface ItemDefinition {
  id: ItemId;
  name: string;
  tier: 'component' | 'epic' | 'legendary';
  statBonuses: Partial<StatBlock>;
  recipe?: ItemId[];
}

export interface RuneTraitInstance {
  id: string;
  grade: 'minor' | 'major' | 'keystone';
  value?: number;
}

export interface ChampionInstance {
  instanceId: string;
  championId: ChampionId;
  level: number;
  experience: number;
  mastery: number;
  masteryExperience: number;
  currentHp: number;
  runeTraits: RuneTraitInstance[];
  equippedItems: ItemId[];
}

export interface EncounterEntry {
  championId: ChampionId;
  weight: number;
  minLevel: number;
  maxLevel: number;
}

export interface EncounterTable {
  id: string;
  entries: EncounterEntry[];
}

export interface RectDefinition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransitionDefinition extends RectDefinition {
  id: string;
  targetMapId: string;
  targetX: number;
  targetY: number;
}

export interface EncounterZoneDefinition extends RectDefinition {
  id: string;
  encounterTableId: string;
}

export interface MapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  collisions: RectDefinition[];
  encounterZones: EncounterZoneDefinition[];
  transitions: TransitionDefinition[];
}
