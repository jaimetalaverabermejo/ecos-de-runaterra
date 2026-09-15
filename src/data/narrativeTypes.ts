import type { ConditionDefinition, WorldActionDefinition } from './types';

export type WorldFacing = 'up' | 'down' | 'left' | 'right';
export type NpcVisualType = 'default' | 'merchant' | 'sanctuary';

export type NpcServiceDefinition =
  | { type: 'shop'; shopId: string }
  | { type: 'sanctuary'; sanctuaryId: string }
  | { type: 'quest'; questId: string };

export type NpcBehaviorDefinition =
  | { type: 'static' }
  | { type: 'patrol'; points: Array<{ x: number; y: number }>; speed?: number; pauseMs?: number }
  | { type: 'random'; radius: number; speed?: number; pauseMs?: number };

export interface NpcDefinition {
  id: string;
  name: string;
  mapId: string;
  x: number;
  y: number;
  facing: WorldFacing;
  color: number;
  championId?: string;
  formId?: string;
  overworldScale?: number;
  dialogueId?: string;
  service?: NpcServiceDefinition;
  visualType?: NpcVisualType;
  conditions: ConditionDefinition[];
  onTalkActions: WorldActionDefinition[];
  behavior: NpcBehaviorDefinition;
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
  lines: string[];
  choices?: DialogueChoiceDefinition[];
  actions?: WorldActionDefinition[];
}

export interface DialogueDefinition {
  id: string;
  startNodeId: string;
  nodes: DialogueNodeDefinition[];
}
