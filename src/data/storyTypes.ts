import type { WorldActionDefinition } from './types';

export interface StoryActor {
  id: string;
  actorId?: string;
  championId?: string;
  player?: boolean;
  x: number;
  y: number;
  facing?: 'up' | 'down' | 'left' | 'right';
  toX?: number;
  toY?: number;
  moveMs?: number;
}
export interface StoryBeat {
  title: string;
  mapId: string;
  focus: { x: number; y: number };
  /** World scale for wide establishing shots; actor coordinates remain screen coordinates. */
  mapScale?: number;
  speaker: string;
  text: string;
  durationMs: number;
  grayscale?: boolean;
  actors: StoryActor[];
  effect?: 'shot' | 'evacuation' | 'names' | 'restitution' | 'escort' | 'departure' | 'surge' | 'injury' | 'spheres' | 'awakening' | 'syndra-attire';
}
export interface StoryDefinition {
  id: string;
  title: string;
  completionFlag: string;
  beats: StoryBeat[];
  completionActions: WorldActionDefinition[];
  returnDialogueId?: string;
  followUpDuelId?: string;
}
