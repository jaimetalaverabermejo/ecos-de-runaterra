export type ChampionId = string;
export type SkillId = string;
export type ItemId = string;
export type RecipeId = string;
export type ShopId = string;

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

export type ItemCategory = 'consumable' | 'equipment' | 'runic' | 'material' | 'key';
export type ItemTier = 'component' | 'epic' | 'legendary';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  tier: ItemTier;
  category?: ItemCategory;
  description?: string;
  statBonuses: Partial<StatBlock>;
}

export interface RecipeIngredientDefinition {
  itemId: ItemId;
  quantity: number;
}

export interface RecipeDefinition {
  id: RecipeId;
  name: string;
  resultItemId: ItemId;
  resultQuantity: number;
  ingredients: RecipeIngredientDefinition[];
  unlockedByDefault: boolean;
  unlockHint?: string;
}

export interface ShopEntryDefinition {
  itemId: ItemId;
  price: number;
}

export interface ShopDefinition {
  id: ShopId;
  name: string;
  entries: ShopEntryDefinition[];
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
  championId: string;
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

export interface WorldRegionDefinition {
  id: string;
  name: string;
  enabled: boolean;
  x: number;
  y: number;
  description: string;
}

export type RegionMapPointType = 'zone' | 'portal' | 'point';

export interface RegionMapPointDefinition {
  id: string;
  name: string;
  x: number;
  y: number;
  type: RegionMapPointType;
  enabled: boolean;
  current: boolean;
  description: string;
  targetMapId?: string;
}

export interface RegionMapDefinition {
  id: string;
  regionId: string;
  name: string;
  width: number;
  height: number;
  points: RegionMapPointDefinition[];
}