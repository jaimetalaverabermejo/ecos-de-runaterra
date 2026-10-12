import { DataRegistry } from '../../data/DataRegistry';
import type { ChampionId, ChampionInstance } from '../../data/types';
import { createNewGame, type SaveGame } from '../../state/GameState';
import { ProgressionService } from '../progression/ProgressionService';
import { BattleEngine } from '../combat/BattleEngine';
import { WorldActionService } from '../world/WorldActionService';

export const ADVENTURE_CHECKPOINTS = [
  { id: 'village', title: 'Primera visita a Bandle', detail: 'Tienda, bolsas y primeras rutas · nivel 2', mapId: 'bandle_village', level: 2, gold: 300 },
  { id: 'gnar', title: 'Antes de Gnar', detail: 'Cueva, combate y resonancia · nivel 5', mapId: 'gnar_cave', level: 5, gold: 500 },
  { id: 'rumble', title: 'Salida de Rumble', detail: 'Correr y seguir al niño hacia el norte · nivel 6', mapId: 'bandle_village', level: 6, gold: 700 },
  { id: 'kennen', title: 'Antes de Kennen', detail: 'Cumbre, combate y portal · nivel 6', mapId: 'portal_mountains', level: 6, gold: 700 },
  { id: 'ionia', title: 'Llegada a Jonia', detail: 'Bienvenida, primer recetario y casas · nivel 7', mapId: 'jo01_koeshin', level: 7, gold: 900 },
  { id: 'yi', title: 'Dentro del Templo Wuju', detail: 'Primer encuentro con el maestro Yi · nivel 7', mapId: 'jo01_koeshin_house_02', level: 7, gold: 900 },
  { id: 'brooch', title: 'Misión del broche', detail: 'Hablar con la viajera y buscar el broche · nivel 8', mapId: 'jo02_white_cliffs_house_01', level: 8, gold: 1000 }
] as const;
export type AdventureCheckpointId = typeof ADVENTURE_CHECKPOINTS[number]['id'];

export function createAdventureCheckpoint(id: AdventureCheckpointId, name = 'Prueba de aventura'): SaveGame {
  const point = ADVENTURE_CHECKPOINTS.find(p => p.id === id);
  if (!point) throw new Error(`Unknown adventure checkpoint: ${id}`);
  const index = ADVENTURE_CHECKPOINTS.indexOf(point);
  const save = createNewGame(name);
  save.worldProgress.flags = ['story:campaign', 'story:intro-complete', 'story:first-echo-complete', 'qa:adventure', `qa:checkpoint:${id}`];
  const flag = (value: string): void => { if (!save.worldProgress.flags.includes(value)) save.worldProgress.flags.push(value); };
  if (index < 4) flag('progression:bandle-cap-active');
  const dialogue = (value: string): void => { for (const node of DataRegistry.dialogue(value).nodes) WorldActionService.applyAll(save, node.actions); };
  save.inventory = { 'echo-linker-hextech': 1, 'minor-healing-potion': 3 };
  const champions: ChampionId[] = index === 0 ? ['teemo'] : ['teemo', 'poppy', 'tristana'];
  save.party = champions.map(championId => {
    const champion: ChampionInstance = { instanceId: crypto.randomUUID(), championId, mastery: point.level, masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(point.level), unspentSkillPoints: ProgressionService.earnedManualSkillPoints(point.level),
      currentHp: 1, runeTraits: [], equippedItems: [] };
    ProgressionService.normalizeChampion(champion);
    champion.currentHp = BattleEngine.statsFor(champion).hp;
    save.echoRegistry[championId] = 'linked';
    return champion;
  });
  if (index >= 1) {
    flag('story:crafting-unlocked'); save.unlockedRecipes.push('recipe-lost-chapter');
    save.inventory['amplifying-tome'] = 1; save.inventory['ruby-crystal'] = 1;
  }
  if (index >= 2) {
    flag('story:gnar-calmed'); flag('duel:gnar-cave-boss:won'); flag('story:treehouse-open');
    dialogue('rumble-treehouse-intro');
    flag('echo:rumble-release-seen');
  }
  if (index >= 3) flag('story:bandle-storm-guide-done');
  if (index >= 4) {
    flag('duel:kennen-portal-boss:won'); flag('story:kennen-defeated');
    flag('story:kennen-portal-activated'); flag('echo:kennen-release-seen');
    dialogue('kennen-portal-won');
    save.worldProgress.flags = save.worldProgress.flags.filter(f => f !== 'progression:bandle-cap-active');
    save.worldProgress.unlockedRegions.push('ionia');
  }
  if (index >= 5) dialogue('ionia-kennen-arrival');
  if (id === 'brooch') { flag('story:ionia-temple-reached'); dialogue('ionia-yi-arrival'); }
  const map = DataRegistry.map(point.mapId);
  save.currentMapId = map.id;
  save.playerPosition = id === 'rumble' ? { x: 1440, y: 608 } : id === 'kennen' ? { x: 672, y: 520 } : { ...map.spawn };
  save.worldProgress.currentRegionId = index >= 4 ? 'ionia' : 'bandle-city';
  save.worldProgress.currentZoneId = map.zoneId ?? map.id;
  save.worldProgress.unlockedZones = [...new Set(['portal-clearing', 'bandle-village', map.zoneId ?? map.id])];
  save.gold = point.gold;
  save.checkpoint = { sanctuaryId: `qa-${id}`, name: point.title, mapId: map.id, ...save.playerPosition };
  return save;
}
