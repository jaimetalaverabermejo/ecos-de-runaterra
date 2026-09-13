import garenDefinitionJson from './champions/garen/definition.json';
import garenStatsJson from './champions/garen/stats.json';
import teemoDefinitionJson from './champions/teemo/definition.json';
import teemoStatsJson from './champions/teemo/stats.json';
import skillsJson from './skills/skills.json';
import longSwordJson from './items/components/attack/long-sword.json';
import rubyCrystalJson from './items/components/health/ruby-crystal.json';
import amplifyingTomeJson from './items/components/power/amplifying-tome.json';
import statDefinitionsJson from './stats/definitions.json';
import bandleEncounterJson from './world/regions/bandle-city/zones/portal-clearing/encounters.json';
import bandleMapJson from './world/regions/bandle-city/zones/portal-clearing/map.json';
import type {
  ChampionDefinition,
  EncounterTable,
  ItemDefinition,
  MapDefinition,
  SkillDefinition,
  StatBlock,
  StatDefinition
} from './types';

type ChampionMetadata = Omit<ChampionDefinition, 'baseStats'>;

function championFrom(
  definition: ChampionMetadata,
  stats: StatBlock
): ChampionDefinition {
  return { ...definition, baseStats: stats };
}

const champions: ChampionDefinition[] = [
  championFrom(
    garenDefinitionJson as unknown as ChampionMetadata,
    garenStatsJson as StatBlock
  ),
  championFrom(
    teemoDefinitionJson as unknown as ChampionMetadata,
    teemoStatsJson as StatBlock
  )
];

const skills = skillsJson as unknown as SkillDefinition[];
const items = [longSwordJson, rubyCrystalJson, amplifyingTomeJson] as unknown as ItemDefinition[];
const statDefinitions = statDefinitionsJson as unknown as StatDefinition[];
const encounters = [bandleEncounterJson] as unknown as EncounterTable[];
const maps = [bandleMapJson] as unknown as MapDefinition[];

function indexById<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export class DataRegistry {
  private static championIndex = indexById(champions);
  private static skillIndex = indexById(skills);
  private static itemIndex = indexById(items);
  private static statIndex = indexById(statDefinitions);
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

  static stat(id: keyof StatBlock): StatDefinition {
    const value = this.statIndex.get(id);
    if (!value) throw new Error(`Unknown stat: ${id}`);
    return value;
  }

  static stats(): StatDefinition[] {
    return [...statDefinitions].sort((a, b) => a.order - b.order);
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
