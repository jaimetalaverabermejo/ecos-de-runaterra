export type ChampionId = string;
export type SkillId = string;
export type ItemId = string;
export type RecipeId = string;
export type ShopId = string;
export type QuestId = string;

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
export type ActiveSkillSlot = Exclude<SkillSlot, 'passive'>;
export type SkillRanks = Record<ActiveSkillSlot, number>;
export type CombatStatusKind = 'poison' | 'blind' | 'stun' | 'shield' | 'stat';

export interface SkillEffectDefinition {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'custom';
  stat?: keyof StatBlock;
  power?: number;
  powerByRank?: number[];
  durationTurns?: number;
  statusId?: string;
  statusKind?: CombatStatusKind;
  target?: 'self' | 'enemy';
  modifierMode?: 'flat' | 'percent';
  chance?: number;
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
  growthStats: StatBlock;
  experienceYield: number;
  linkDifficulty: number;
  passiveSkillId: SkillId;
  skillIds: [SkillId, SkillId, SkillId, SkillId];
}

export type ItemCategory = 'consumable' | 'equipment' | 'runic' | 'material' | 'key';
export type ItemTier = 'component' | 'epic' | 'legendary';

export type BattleItemEffectDefinition =
  | { type: 'heal'; amount: number; consumes: boolean }
  | { type: 'echo-link'; consumes: false };

export interface ItemDefinition {
  id: ItemId;
  name: string;
  tier: ItemTier;
  category?: ItemCategory;
  description?: string;
  statBonuses: Partial<StatBlock>;
  battleEffect?: BattleItemEffectDefinition;
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

export interface QuestObjectiveDefinition {
  id: string;
  type: 'link' | 'defeat' | 'talk' | 'visit' | 'item';
  targetId?: string;
  required: number;
  description: string;
}

export interface QuestRewardDefinition {
  gold?: number;
  items?: Record<ItemId, number>;
  unlockRecipes?: RecipeId[];
}

export interface QuestDefinition {
  id: QuestId;
  title: string;
  description: string;
  regionId: string;
  startNpcId: string;
  completionNpcId: string;
  objectives: QuestObjectiveDefinition[];
  startRewards?: QuestRewardDefinition;
  rewards?: QuestRewardDefinition;
}

export interface RuneTraitInstance {
  id: string;
  grade: 'minor' | 'major' | 'keystone';
  value?: number;
}

export interface ChampionInstance {
  instanceId: string;
  championId: ChampionId;
  mastery: number;
  masteryExperience: number;
  skillRanks: SkillRanks;
  unspentSkillPoints: number;
  currentHp: number;
  runeTraits: RuneTraitInstance[];
  equippedItems: ItemId[];
}

export interface EncounterEntry {
  championId: string;
  weight: number;
  minMastery: number;
  maxMastery: number;
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
