import type {
  CharacterDefinition,
  ChampionDefinition,
  CombatStatusKind,
  ConditionDefinition,
  ContentStatus,
  EchoAppearanceDefinition,
  EchoRole,
  EchoTier,
  SkillDefinition,
  SkillEffectDefinition,
  SkillSlot,
  SkillTarget,
  StatBlock
} from '../data/types';

type EstadisticaEs = 'vida' | 'ataque' | 'poder' | 'defensa' | 'resistencia' | 'velocidad';
type TipoEstadoEs = 'veneno' | 'ceguera' | 'aturdimiento' | 'escudo' | 'estadistica';
type ObjetivoEs =
  | 'uno-mismo'
  | 'aliado'
  | 'enemigo'
  | 'cualquier-aliado'
  | 'cualquier-enemigo'
  | 'todos-los-aliados'
  | 'todos-los-enemigos'
  | 'todos'
  | 'enemigo-aleatorio';

type BloqueEstadisticasEs = Record<EstadisticaEs, number>;

interface PersonajeJson {
  id: string;
  nombre: string;
  regionPrincipalId?: string | null;
  afiliaciones?: string[];
  estadoContenido?: ContentStatus;
}

interface EcoJson {
  id: string;
  nombre: string;
  roles: EchoRole[];
  tier?: EchoTier | null;
  estadoContenido?: ContentStatus;
  rendimientoExperiencia: number;
  dificultadVinculo: number;
  pasivaId: string;
  habilidadesIds: [string, string, string, string];
  formas?: string[];
}

interface EstadisticasJson {
  base: BloqueEstadisticasEs;
  crecimiento: BloqueEstadisticasEs;
}

interface EfectoJson {
  tipo: 'daño' | 'curacion' | 'mejora' | 'reduccion' | 'estado' | 'personalizado';
  estadistica?: EstadisticaEs;
  potencia?: number;
  potenciaPorRango?: number[];
  duracionTurnos?: number;
  estadoId?: string;
  tipoEstado?: TipoEstadoEs;
  objetivo?: ObjetivoEs;
  modoModificador?: 'plano' | 'porcentaje';
  probabilidad?: number;
  gestorId?: string;
}

interface HabilidadJson {
  id: string;
  nombre: string;
  ranura: 'pasiva' | 'q' | 'w' | 'e' | 'r';
  maestriaDesbloqueo: number;
  prioridad?: number;
  efectos: EfectoJson[];
}

interface AparicionJson {
  id: string;
  regionId: string;
  zonaId: string;
  peso: number;
  maestriaMinima: number;
  maestriaMaxima: number;
  condiciones?: CondicionJson[];
}

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

export type TipoAssetCampeon = 'overworld' | 'combate-frente' | 'combate-espalda' | 'retrato' | 'icono';

export interface AssetCampeonDescubierto {
  championId: string;
  type: TipoAssetCampeon;
  url: string;
  textureKey: string;
}

const personajesJson = import.meta.glob('./campeones/*/personaje.json', { eager: true, import: 'default' }) as Record<string, PersonajeJson>;
const ecosJson = import.meta.glob('./campeones/*/eco.json', { eager: true, import: 'default' }) as Record<string, EcoJson>;
const estadisticasJson = import.meta.glob('./campeones/*/estadisticas.json', { eager: true, import: 'default' }) as Record<string, EstadisticasJson>;
const habilidadesJson = import.meta.glob('./campeones/*/habilidades.json', { eager: true, import: 'default' }) as Record<string, HabilidadJson[]>;
const aparicionesJson = import.meta.glob('./campeones/*/apariciones.json', { eager: true, import: 'default' }) as Record<string, AparicionJson[]>;

const overworldAssets = import.meta.glob('./campeones/*/overworld.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const battleFrontAssets = import.meta.glob('./campeones/*/combate/frente.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const battleBackAssets = import.meta.glob('./campeones/*/combate/espalda.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const portraitAssets = import.meta.glob('./campeones/*/retrato.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const iconAssets = import.meta.glob('./campeones/*/icono.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

function championIdFromPath(path: string): string {
  const match = path.match(/\/campeones\/([^/]+)\//);
  if (!match?.[1]) throw new Error(`No se puede resolver el campeón desde la ruta: ${path}`);
  return match[1];
}

function byChampionId<T>(entries: Record<string, T>): Map<string, T> {
  return new Map(Object.entries(entries).map(([path, value]) => [championIdFromPath(path), value]));
}

const personajesPorId = byChampionId(personajesJson);
const ecosPorId = byChampionId(ecosJson);
const estadisticasPorId = byChampionId(estadisticasJson);
const habilidadesPorId = byChampionId(habilidadesJson);
const aparicionesPorId = byChampionId(aparicionesJson);

const statMap: Record<EstadisticaEs, keyof StatBlock> = {
  vida: 'hp',
  ataque: 'attack',
  poder: 'power',
  defensa: 'defense',
  resistencia: 'resistance',
  velocidad: 'speed'
};

const statusMap: Record<TipoEstadoEs, CombatStatusKind> = {
  veneno: 'poison',
  ceguera: 'blind',
  aturdimiento: 'stun',
  escudo: 'shield',
  estadistica: 'stat'
};

const targetMap: Record<ObjetivoEs, SkillTarget> = {
  'uno-mismo': 'self',
  aliado: 'ally',
  enemigo: 'enemy',
  'cualquier-aliado': 'any-ally',
  'cualquier-enemigo': 'any-enemy',
  'todos-los-aliados': 'all-allies',
  'todos-los-enemigos': 'all-enemies',
  todos: 'all',
  'enemigo-aleatorio': 'random-enemy'
};

function statBlock(data: BloqueEstadisticasEs): StatBlock {
  return {
    hp: data.vida,
    attack: data.ataque,
    power: data.poder,
    defense: data.defensa,
    resistance: data.resistencia,
    speed: data.velocidad
  };
}

function skillEffect(effect: EfectoJson): SkillEffectDefinition {
  const typeMap: Record<EfectoJson['tipo'], SkillEffectDefinition['type']> = {
    daño: 'damage',
    curacion: 'heal',
    mejora: 'buff',
    reduccion: 'debuff',
    estado: 'status',
    personalizado: 'custom'
  };

  return {
    type: typeMap[effect.tipo],
    stat: effect.estadistica ? statMap[effect.estadistica] : undefined,
    power: effect.potencia,
    powerByRank: effect.potenciaPorRango,
    durationTurns: effect.duracionTurnos,
    statusId: effect.estadoId,
    statusKind: effect.tipoEstado ? statusMap[effect.tipoEstado] : undefined,
    target: effect.objetivo ? targetMap[effect.objetivo] : undefined,
    modifierMode: effect.modoModificador === 'porcentaje' ? 'percent' : effect.modoModificador === 'plano' ? 'flat' : undefined,
    chance: effect.probabilidad,
    handlerId: effect.gestorId
  };
}

function condition(condition: CondicionJson): ConditionDefinition {
  switch (condition.tipo) {
    case 'bandera': return { type: 'flag', id: condition.id, value: condition.valor };
    case 'npc-hablado': return { type: 'npc-spoken', npcId: condition.npcId };
    case 'mision-estado': return {
      type: 'quest-status',
      questId: condition.misionId,
      status: condition.estado === 'no-iniciada' ? 'not-started' : condition.estado === 'activa' ? 'active' : condition.estado === 'lista' ? 'ready' : 'completed'
    };
    case 'eco-estado': return {
      type: 'echo-state',
      championId: condition.ecoId,
      state: condition.estado === 'desconocido' ? 'unknown' : condition.estado === 'visto' ? 'seen' : 'linked'
    };
    case 'objeto-poseido': return { type: 'item-owned', itemId: condition.objetoId, quantity: condition.cantidad };
    case 'region-desbloqueada': return { type: 'region-unlocked', regionId: condition.regionId };
    case 'zona-desbloqueada': return { type: 'zone-unlocked', zoneId: condition.zonaId };
    case 'maestria': return { type: 'mastery', championId: condition.ecoId, minimum: condition.minima };
    case 'todas': return { type: 'all', conditions: condition.condiciones.map((entry) => conditionFromJson(entry)) };
    case 'alguna': return { type: 'any', conditions: condition.condiciones.map((entry) => conditionFromJson(entry)) };
    case 'no': return { type: 'not', condition: conditionFromJson(condition.condicion) };
  }
}

function conditionFromJson(value: CondicionJson): ConditionDefinition {
  return condition(value);
}

function assetsFrom(glob: Record<string, string>, type: TipoAssetCampeon, suffix: string): AssetCampeonDescubierto[] {
  return Object.entries(glob).map(([path, url]) => {
    const championId = championIdFromPath(path);
    return { championId, type, url, textureKey: `${championId}-${suffix}` };
  });
}

export class CatalogoContenido {
  static personajes(): CharacterDefinition[] {
    return [...personajesPorId.values()].map((data) => ({
      id: data.id,
      name: data.nombre,
      primaryRegionId: data.regionPrincipalId,
      affiliations: data.afiliaciones ?? [],
      contentStatus: data.estadoContenido ?? 'planeado'
    }));
  }

  static ecos(): ChampionDefinition[] {
    return [...ecosPorId.entries()].map(([id, eco]) => {
      const stats = estadisticasPorId.get(id);
      if (!stats) throw new Error(`Falta estadisticas.json para el Eco ${id}`);
      return {
        id: eco.id,
        name: eco.nombre,
        tags: [...eco.roles],
        baseStats: statBlock(stats.base),
        growthStats: statBlock(stats.crecimiento),
        experienceYield: eco.rendimientoExperiencia,
        linkDifficulty: eco.dificultadVinculo,
        passiveSkillId: eco.pasivaId,
        skillIds: eco.habilidadesIds,
        tier: eco.tier ?? null,
        contentStatus: eco.estadoContenido ?? 'planeado',
        formIds: eco.formas ?? []
      };
    });
  }

  static habilidades(): SkillDefinition[] {
    return [...habilidadesPorId.entries()].flatMap(([championId, entries]) => entries.map((skill) => ({
      id: skill.id,
      championId,
      name: skill.nombre,
      slot: (skill.ranura === 'pasiva' ? 'passive' : skill.ranura) as SkillSlot,
      unlockMastery: skill.maestriaDesbloqueo,
      priority: skill.prioridad,
      effects: skill.efectos.map(skillEffect)
    })));
  }

  static apariciones(): EchoAppearanceDefinition[] {
    return [...aparicionesPorId.entries()].flatMap(([championId, entries]) => entries.map((entry) => ({
      id: entry.id,
      championId,
      regionId: entry.regionId,
      zoneId: entry.zonaId,
      weight: entry.peso,
      minMastery: entry.maestriaMinima,
      maxMastery: entry.maestriaMaxima,
      conditions: (entry.condiciones ?? []).map(conditionFromJson)
    })));
  }

  static assetsCampeones(): AssetCampeonDescubierto[] {
    return [
      ...assetsFrom(overworldAssets, 'overworld', 'overworld'),
      ...assetsFrom(battleFrontAssets, 'combate-frente', 'battle-front'),
      ...assetsFrom(battleBackAssets, 'combate-espalda', 'battle-back'),
      ...assetsFrom(portraitAssets, 'retrato', 'portrait'),
      ...assetsFrom(iconAssets, 'icono', 'icon')
    ];
  }
}
