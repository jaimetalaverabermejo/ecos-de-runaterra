export type ChampionId = string;
export type SkillId = string;
export type ItemId = string;
export type RecipeId = string;
export type ShopId = string;
export type QuestId = string;

export type EchoDiscoveryState = 'unknown' | 'seen' | 'linked';
export type EchoTier = 'C' | 'B' | 'A' | 'S' | 'S+';
export type EchoRole = 'luchador' | 'tanque' | 'mago' | 'asesino' | 'tirador' | 'apoyo' | 'especialista';
export type ContentStatus = 'planeado' | 'datos-listos' | 'jugable' | 'completo';

export interface EchoCatalogEntry {
  id: ChampionId;
  name: string;
}

export interface CharacterDefinition {
  id: ChampionId;
  name: string;
  primaryRegionId?: string | null;
  affiliations: string[];
  contentStatus: ContentStatus;
}

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
export type SkillTarget =
  | 'self'
  | 'ally'
  | 'enemy'
  | 'any-ally'
  | 'any-enemy'
  | 'all-allies'
  | 'all-enemies'
  | 'all'
  | 'random-enemy';

export interface SkillEffectDefinition {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'custom';
  stat?: keyof StatBlock;
  power?: number;
  powerByRank?: number[];
  durationTurns?: number;
  statusId?: string;
  statusKind?: CombatStatusKind;
  target?: SkillTarget;
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
  tier?: EchoTier | null;
  contentStatus?: ContentStatus;
  formIds?: string[];
}

// v14: "ChampionDefinition" se conserva como alias de compatibilidad interna.
// Conceptualmente la unidad jugable es un Eco y el personaje narrativo es otra entidad.
export type EchoDefinition = ChampionDefinition;

export type ConditionDefinition =
  | { type: 'flag'; id: string; value?: boolean }
  | { type: 'npc-spoken'; npcId: string }
  | { type: 'quest-status'; questId: QuestId; status: 'not-started' | 'active' | 'ready' | 'completed' }
  | { type: 'echo-state'; championId: ChampionId; state: EchoDiscoveryState }
  | { type: 'item-owned'; itemId: ItemId; quantity?: number }
  | { type: 'region-unlocked'; regionId: string }
  | { type: 'zone-unlocked'; zoneId: string }
  | { type: 'mastery'; championId?: ChampionId; minimum: number }
  | { type: 'all'; conditions: ConditionDefinition[] }
  | { type: 'any'; conditions: ConditionDefinition[] }
  | { type: 'not'; condition: ConditionDefinition };

export type WorldActionDefinition =
  | { type: 'set-flag'; id: string; value?: boolean }
  | { type: 'unlock-region'; regionId: string }
  | { type: 'unlock-zone'; zoneId: string }
  | { type: 'set-echo-state'; championId: ChampionId; state: EchoDiscoveryState }
  | { type: 'add-item'; itemId: ItemId; quantity: number }
  | { type: 'add-gold'; amount: number };

export interface EchoAppearanceDefinition {
  id: string;
  championId: ChampionId;
  regionId: string;
  zoneId: string;
  weight: number;
  minMastery: number;
  maxMastery: number;
  conditions: ConditionDefinition[];
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
  basePrice?: number;
  sellPriceOverride?: number;
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

export type QuestCategory = 'main' | 'side';
export type QuestObjectiveType = 'link' | 'defeat' | 'talk' | 'visit' | 'item' | 'interact';

export interface QuestObjectiveDefinition {
  id: string;
  type: QuestObjectiveType;
  targetId?: string;
  required: number;
  description: string;
}

export interface QuestStepDefinition {
  id: string;
  title?: string;
  description?: string;
  objectives: QuestObjectiveDefinition[];
}

export interface QuestRewardDefinition {
  gold?: number;
  items?: Record<ItemId, number>;
  unlockRecipes?: RecipeId[];
}

export interface QuestDialogueSetDefinition {
  start?: string;
  active?: string;
  ready?: string;
  completed?: string;
}

export interface QuestDefinition {
  id: QuestId;
  title: string;
  description: string;
  regionId: string;
  category?: QuestCategory;
  startNpcId: string;
  completionNpcId: string;
  prerequisites?: ConditionDefinition[];
  objectives?: QuestObjectiveDefinition[];
  steps?: QuestStepDefinition[];
  startActions?: WorldActionDefinition[];
  completionActions?: WorldActionDefinition[];
  dialogues?: QuestDialogueSetDefinition;
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

export type EchoInstance = ChampionInstance;

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
