import type { ConditionDefinition, ItemId, WorldActionDefinition } from './types';

export type WorldFacing = 'up' | 'down' | 'left' | 'right';
export type NpcVisualType = 'default' | 'merchant' | 'sanctuary';
export type WorldActorKind = 'person' | 'creature';

export interface WorldActorPresetDefinition {
  id: string;
  name: string;
  kind: WorldActorKind;
  color: number;
  overworldScale?: number;
  offsetY?: number;
  hitboxWidth?: number;
  hitboxHeight?: number;
  solid?: boolean;
}

export interface DuelEchoDefinition {
  championId: string;
  mastery: number;
  formId?: string;
  initialFormTurns?: number;
  equippedItems?: ItemId[];
}

export interface DuelDefinition {
  id: string;
  name: string;
  trainerName: string;
  npcId: string;
  format?: 'single' | 'double';
  team: DuelEchoDefinition[];
  rewardGold: number;
  introDialogueId?: string;
  victoryDialogueId?: string;
  victoryActions?: WorldActionDefinition[];
  preBattleTransformation?: {
    formId: string;
    durationMs?: number;
  };
}

export type NpcServiceDefinition =
  | { type: 'shop'; shopId: string }
  | { type: 'sanctuary'; sanctuaryId: string }
  | { type: 'quest'; questId: string }
  | { type: 'duel'; duelId: string };

export type NpcBehaviorDefinition =
  | { type: 'static' }
  | { type: 'patrol'; points: Array<{ x: number; y: number }>; speed?: number; pauseMs?: number }
  | { type: 'random'; radius: number; speed?: number; pauseMs?: number };

export interface NpcDuelSightDefinition {
  rangeTiles: number;
  laneWidth?: number;
}

export interface NpcAutoTalkDefinition {
  radius: number;
  onceFlag?: string;
  approach?: boolean;
  approachDistance?: number;
  speed?: number;
  showAlert?: boolean;
}

export interface NpcGuideDefinition {
  activeFlag: string;
  points: Array<{ x: number; y: number }>;
  speed?: number;
  maxLeadDistance?: number;
  arrivalRadius?: number;
  arrivalDialogueId: string;
  completionFlag?: string;
}

export interface NpcAmbientMotionDefinition {
  type: 'bounce';
  amount?: number;
  durationMs?: number;
}

export interface NpcFollowerDefinition {
  activeFlag: string;
  followDistance?: number;
  speed?: number;
  travelDialogueId?: string;
  completeOnMapId?: string;
  completeAtX?: number;
  completeAtY?: number;
  completionRadius?: number;
  completionFlag?: string;
  completionDialogueId?: string;
  completionActions?: WorldActionDefinition[];
}

export interface NpcDefinition {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  spawnId?: string;
  facing: WorldFacing;
  color: number;
  actorId?: string;
  championId?: string;
  formId?: string;
  overworldScale?: number;
  visualRotation?: number;
  hideShadow?: boolean;
  echoAppearance?: boolean;
  dialogueId?: string;
  service?: NpcServiceDefinition;
  visualType?: NpcVisualType;
  conditions: ConditionDefinition[];
  onTalkActions: WorldActionDefinition[];
  behavior: NpcBehaviorDefinition;
  duelSight?: NpcDuelSightDefinition;
  autoTalk?: NpcAutoTalkDefinition;
  follower?: NpcFollowerDefinition;
  guide?: NpcGuideDefinition;
  ambientMotion?: NpcAmbientMotionDefinition;
}

export interface DialogueChoiceDefinition {
  label: string;
  nextNodeId: string;
  conditions?: ConditionDefinition[];
  actions?: WorldActionDefinition[];
}

export interface DialogueNodeDefinition {
  id: string;
  speaker: string;
  nextNodeId?: string;
  mode?: 'speech' | 'event' | 'narration';
  portraitChampionId?: string;
  lines: string[];
  choices?: DialogueChoiceDefinition[];
  actions?: WorldActionDefinition[];
}

export interface DialogueDefinition {
  refreshWorldOnClose?: boolean;
  id: string;
  startNodeId: string;
  nodes: DialogueNodeDefinition[];
}
