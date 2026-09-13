import garenJson from './champions/garen.json';
import teemoJson from './champions/teemo.json';
import skillsJson from './skills/skills.json';
import itemsJson from './items/items.json';
import bandleEncounterJson from './encounters/bandle-meadow.json';
import bandleMapJson from './maps/bandle-debug.json';
import type {
  ChampionDefinition,
  EncounterTable,
  ItemDefinition,
  MapDefinition,
  SkillDefinition
} from './types';

const champions = [garenJson, teemoJson] as unknown as ChampionDefinition[];
const skills = skillsJson as unknown as SkillDefinition[];
const items = itemsJson as unknown as ItemDefinition[];
const encounters = [bandleEncounterJson] as unknown as EncounterTable[];
const maps = [bandleMapJson] as unknown as MapDefinition[];

function indexById<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export class DataRegistry {
  private static championIndex = indexById(champions);
  private static skillIndex = indexById(skills);
  private static itemIndex = indexById(items);
  private static encounterIndex = indexById(encounters);
  private static mapIndex = indexById(maps);

  static champion(id: string): ChampionDefinition {
    const value = this.championIndex.get(id);
    if (!value) throw new Error(`Unknown champion: ${id}`);
    return value;
  }

  static skill(id: string): SkillDefinition {
    const value = this.skillIndex.get(id);
    if (!value) throw new Error(`Unknown skill: ${id}`);
    return value;
  }

  static item(id: string): ItemDefinition {
    const value = this.itemIndex.get(id);
    if (!value) throw new Error(`Unknown item: ${id}`);
    return value;
  }

  static encounter(id: string): EncounterTable {
    const value = this.encounterIndex.get(id);
    if (!value) throw new Error(`Unknown encounter table: ${id}`);
    return value;
  }

  static map(id: string): MapDefinition {
    const value = this.mapIndex.get(id);
    if (!value) throw new Error(`Unknown map: ${id}`);
    return value;
  }
}
