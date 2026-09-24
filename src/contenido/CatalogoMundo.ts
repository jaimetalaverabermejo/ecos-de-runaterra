import type { ConditionDefinition, WorldActionDefinition } from '../data/types';
import type {
  DialogueChoiceDefinition,
  DialogueDefinition,
  DialogueNodeDefinition,
  DuelDefinition,
  NpcBehaviorDefinition,
  NpcDefinition,
  NpcServiceDefinition,
  NpcVisualType,
  WorldActorPresetDefinition,
  WorldFacing
} from '../data/narrativeTypes';

type CondicionJson =
  | { tipo: 'bandera'; id: string; valor?: boolean }
  | { tipo: 'npc-hablado'; npcId: string }
  | { tipo: 'mision-estado'; misionId: string; estado: 'no-iniciada' | 'activa' | 'lista' | 'completada' }
  | { tipo: 'eco-estado'; ecoId: string; estado: 'desconocido' | 'visto' | 'vinculado' }
  | { tipo: 'objeto-poseido'; objetoId: string; cantidad?: number }
  | { tipo: 'region-desbloqueada'; regionId: string }
  | { tipo: 'zona-desbloqueada'; zonaId: string }
  | { tipo: 'maestria'; ecoId?: string; minima: number }
  | { tipo: 'todas'; condiciones: CondicionJson[] }
  | { tipo: 'alguna'; condiciones: CondicionJson[] }
  | { tipo: 'no'; condicion: CondicionJson };

type AccionJson =
  | { tipo: 'bandera'; id: string; valor?: boolean }
  | { tipo: 'desbloquear-region'; regionId: string }
  | { tipo: 'desbloquear-zona'; zonaId: string }
  | { tipo: 'estado-eco'; ecoId: string; estado: 'desconocido' | 'visto' | 'vinculado' }
  | { tipo: 'dar-objeto'; objetoId: string; cantidad?: number }
  | { tipo: 'dar-oro'; cantidad: number };

type ServicioJson =
  | { tipo: 'tienda'; tiendaId: string }
  | { tipo: 'santuario'; santuarioId: string }
  | { tipo: 'mision'; misionId: string }
  | { tipo: 'duelo'; dueloId: string };

interface DueloJson {
  id: string;
  nombre: string;
  entrenador: string;
  npcId: string;
  equipo: Array<{ campeonId: string; maestria: number; formaId?: string }>;
  recompensaOro?: number;
  dialogoInicioId?: string;
  dialogoVictoriaId?: string;
}

type ComportamientoJson =
  | { tipo: 'estatico' }
  | { tipo: 'patrulla'; puntos: Array<{ x: number; y: number }>; velocidad?: number; pausaMs?: number }
  | { tipo: 'aleatorio'; radio: number; velocidad?: number; pausaMs?: number };

interface ActorPresetJson {
  id: string;
  nombre: string;
  tipo: 'persona' | 'criatura';
  color?: string | number;
  escalaOverworld?: number;
  offsetY?: number;
  anchoHitbox?: number;
  altoHitbox?: number;
  solido?: boolean;
}

export interface WorldActorAssetDefinition {
  actorId: string;
  url: string;
  textureKey: string;
  frameWidth: number;
  frameHeight: number;
}

interface NpcJson {
  id: string;
  nombre: string;
  mapaId: string;
  x: number;
  y: number;
  orientacion: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
  color?: string | number;
  actorId?: string;
  campeonId?: string;
  formaId?: string;
  escalaOverworld?: number;
  dialogoId?: string;
  servicio?: ServicioJson;
  tipoVisual?: 'normal' | 'mercader' | 'santuario';
  condiciones?: CondicionJson[];
  accionesAlHablar?: AccionJson[];
  comportamiento?: ComportamientoJson;
}

interface OpcionDialogoJson {
  texto: string;
  siguienteNodoId: string;
  condiciones?: CondicionJson[];
  acciones?: AccionJson[];
}

interface NodoDialogoJson {
  id: string;
  interlocutor: string;
  lineas: string[];
  opciones?: OpcionDialogoJson[];
  acciones?: AccionJson[];
}

interface DialogoJson {
  id: string;
  nodoInicialId: string;
  nodos: NodoDialogoJson[];
}

const npcModules = import.meta.glob('./mundo/npcs/**/*.json', { eager: true, import: 'default' }) as Record<string, NpcJson | NpcJson[]>;
const dialogueModules = import.meta.glob('./mundo/dialogos/**/*.json', { eager: true, import: 'default' }) as Record<string, DialogoJson | DialogoJson[]>;
const actorPresetModules = import.meta.glob('./mundo/actores/*.json', { eager: true, import: 'default' }) as Record<string, ActorPresetJson | ActorPresetJson[]>;
const actorOverworldAssets = import.meta.glob('./mundo/actores/*/overworld.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const duelModules = import.meta.glob('./mundo/duelos/**/*.json', { eager: true, import: 'default' }) as Record<string, DueloJson | DueloJson[]>;

function flatten<T>(modules: Record<string, T | T[]>): T[] {
  return Object.values(modules).flatMap((value) => Array.isArray(value) ? value : [value]);
}

function actorIdFromAssetPath(path: string): string {
  const match = path.match(/\/actores\/([^/]+)\/overworld\.png$/);
  if (!match?.[1]) throw new Error(`No se puede resolver el actor de mundo desde la ruta: ${path}`);
  return match[1];
}

function actorPresetFromJson(value: ActorPresetJson): WorldActorPresetDefinition {
  return {
    id: value.id,
    name: value.nombre,
    kind: value.tipo === 'criatura' ? 'creature' : 'person',
    color: colorFromJson(value.color),
    overworldScale: value.escalaOverworld,
    offsetY: value.offsetY,
    hitboxWidth: value.anchoHitbox,
    hitboxHeight: value.altoHitbox,
    solid: value.solido ?? true
  };
}

function conditionFromJson(value: CondicionJson): ConditionDefinition {
  switch (value.tipo) {
    case 'bandera': return { type: 'flag', id: value.id, value: value.valor };
    case 'npc-hablado': return { type: 'npc-spoken', npcId: value.npcId };
    case 'mision-estado': return {
      type: 'quest-status',
      questId: value.misionId,
      status: value.estado === 'no-iniciada' ? 'not-started' : value.estado === 'activa' ? 'active' : value.estado === 'lista' ? 'ready' : 'completed'
    };
    case 'eco-estado': return {
      type: 'echo-state',
      championId: value.ecoId,
      state: value.estado === 'desconocido' ? 'unknown' : value.estado === 'visto' ? 'seen' : 'linked'
    };
    case 'objeto-poseido': return { type: 'item-owned', itemId: value.objetoId, quantity: value.cantidad };
    case 'region-desbloqueada': return { type: 'region-unlocked', regionId: value.regionId };
    case 'zona-desbloqueada': return { type: 'zone-unlocked', zoneId: value.zonaId };
    case 'maestria': return { type: 'mastery', championId: value.ecoId, minimum: value.minima };
    case 'todas': return { type: 'all', conditions: value.condiciones.map(conditionFromJson) };
    case 'alguna': return { type: 'any', conditions: value.condiciones.map(conditionFromJson) };
    case 'no': return { type: 'not', condition: conditionFromJson(value.condicion) };
  }
}

function actionFromJson(value: AccionJson): WorldActionDefinition {
  switch (value.tipo) {
    case 'bandera': return { type: 'set-flag', id: value.id, value: value.valor };
    case 'desbloquear-region': return { type: 'unlock-region', regionId: value.regionId };
    case 'desbloquear-zona': return { type: 'unlock-zone', zoneId: value.zonaId };
    case 'estado-eco': return {
      type: 'set-echo-state',
      championId: value.ecoId,
      state: value.estado === 'desconocido' ? 'unknown' : value.estado === 'visto' ? 'seen' : 'linked'
    };
    case 'dar-objeto': return { type: 'add-item', itemId: value.objetoId, quantity: value.cantidad ?? 1 };
    case 'dar-oro': return { type: 'add-gold', amount: value.cantidad };
  }
}

function serviceFromJson(value?: ServicioJson): NpcServiceDefinition | undefined {
  if (!value) return undefined;
  if (value.tipo === 'tienda') return { type: 'shop', shopId: value.tiendaId };
  if (value.tipo === 'santuario') return { type: 'sanctuary', sanctuaryId: value.santuarioId };
  if (value.tipo === 'mision') return { type: 'quest', questId: value.misionId };
  return { type: 'duel', duelId: value.dueloId };
}

function behaviorFromJson(value?: ComportamientoJson): NpcBehaviorDefinition {
  if (!value || value.tipo === 'estatico') return { type: 'static' };
  if (value.tipo === 'patrulla') return { type: 'patrol', points: value.puntos, speed: value.velocidad, pauseMs: value.pausaMs };
  return { type: 'random', radius: value.radio, speed: value.velocidad, pauseMs: value.pausaMs };
}

function facingFromJson(value: NpcJson['orientacion']): WorldFacing {
  if (value === 'arriba') return 'up';
  if (value === 'izquierda') return 'left';
  if (value === 'derecha') return 'right';
  return 'down';
}

function visualFromJson(value?: NpcJson['tipoVisual']): NpcVisualType | undefined {
  if (!value || value === 'normal') return 'default';
  if (value === 'mercader') return 'merchant';
  return 'sanctuary';
}

function colorFromJson(value?: string | number): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value.replace('#', ''), 16);
  return 0x69d47c;
}

function npcFromJson(value: NpcJson): NpcDefinition {
  return {
    id: value.id,
    name: value.nombre,
    mapId: value.mapaId,
    x: value.x,
    y: value.y,
    facing: facingFromJson(value.orientacion),
    color: colorFromJson(value.color),
    actorId: value.actorId,
    championId: value.campeonId,
    formId: value.formaId,
    overworldScale: value.escalaOverworld,
    dialogueId: value.dialogoId,
    service: serviceFromJson(value.servicio),
    visualType: visualFromJson(value.tipoVisual),
    conditions: (value.condiciones ?? []).map(conditionFromJson),
    onTalkActions: (value.accionesAlHablar ?? []).map(actionFromJson),
    behavior: behaviorFromJson(value.comportamiento)
  };
}

function choiceFromJson(value: OpcionDialogoJson): DialogueChoiceDefinition {
  return {
    label: value.texto,
    nextNodeId: value.siguienteNodoId,
    conditions: value.condiciones?.map(conditionFromJson),
    actions: value.acciones?.map(actionFromJson)
  };
}

function nodeFromJson(value: NodoDialogoJson): DialogueNodeDefinition {
  return {
    id: value.id,
    speaker: value.interlocutor,
    lines: value.lineas,
    choices: value.opciones?.map(choiceFromJson),
    actions: value.acciones?.map(actionFromJson)
  };
}

function dialogueFromJson(value: DialogoJson): DialogueDefinition {
  return { id: value.id, startNodeId: value.nodoInicialId, nodes: value.nodos.map(nodeFromJson) };
}

function duelFromJson(value: DueloJson): DuelDefinition {
  return {
    id: value.id,
    name: value.nombre,
    trainerName: value.entrenador,
    npcId: value.npcId,
    team: value.equipo.map((entry) => ({
      championId: entry.campeonId,
      mastery: entry.maestria,
      formId: entry.formaId
    })),
    rewardGold: Math.max(0, Math.round(value.recompensaOro ?? 0)),
    introDialogueId: value.dialogoInicioId,
    victoryDialogueId: value.dialogoVictoriaId
  };
}

export class CatalogoMundo {
  static npcs(): NpcDefinition[] {
    return flatten(npcModules).map(npcFromJson);
  }

  static dialogos(): DialogueDefinition[] {
    return flatten(dialogueModules).map(dialogueFromJson);
  }

  static duelos(): DuelDefinition[] {
    return flatten(duelModules).map(duelFromJson);
  }

  static actores(): WorldActorPresetDefinition[] {
    return flatten(actorPresetModules).map(actorPresetFromJson);
  }

  static assetsActores(): WorldActorAssetDefinition[] {
    return Object.entries(actorOverworldAssets).map(([path, url]) => {
      const actorId = actorIdFromAssetPath(path);
      return {
        actorId,
        url,
        textureKey: `world-actor-${actorId}`,
        frameWidth: 48,
        frameHeight: 48
      };
    });
  }
}
