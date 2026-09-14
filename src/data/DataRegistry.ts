import garenDefinitionJson from './champions/garen/definition.json';
import garenStatsJson from './champions/garen/stats.json';
import teemoDefinitionJson from './champions/teemo/definition.json';
import teemoStatsJson from './champions/teemo/stats.json';
import skillsJson from './skills/skills.json';
import longSwordJson from './items/components/attack/long-sword.json';
import rubyCrystalJson from './items/components/health/ruby-crystal.json';
import amplifyingTomeJson from './items/components/power/amplifying-tome.json';
import sapphireCrystalJson from './items/components/power/sapphire-crystal.json';
import daggerJson from './items/components/speed/dagger.json';
import agilityCloakJson from './items/components/speed/agility-cloak.json';
import lostChapterJson from './items/epic/lost-chapter.json';
import speedCoreJson from './items/epic/speed-core.json';
import powerWandJson from './items/epic/power-wand.json';
import powerRelicJson from './items/legendary/power-relic.json';
import speedLegendaryJson from './items/legendary/speed-legendary.json';
import minorHealingPotionJson from './items/consumables/minor-healing-potion.json';
import echoLinkerHextechJson from './items/key/echo-linker-hextech.json';
import bandleFirstLinkQuestJson from './quests/bandle-first-link.json';
import recipesJson from './recipes/crafting.json';
import bandleWorkshopJson from './shops/bandle-workshop.json';
import statDefinitionsJson from './stats/definitions.json';
import runeterraRegionsJson from './world/runeterra/regions.json';
import bandleRegionMapJson from './world/regions/bandle-city/region-map.json';
import bandleEncounterJson from './world/regions/bandle-city/zones/portal-clearing/encounters.json';
import bandleMapJson from './world/regions/bandle-city/zones/portal-clearing/map.json';
import bandleVillageMapJson from './world/regions/bandle-city/zones/bandle-village/map.json';
import bandleHouse01MapJson from './world/regions/bandle-city/zones/bandle-house-01/map.json';
import type {
  ChampionDefinition, EncounterTable, ItemDefinition, MapDefinition, QuestDefinition, RecipeDefinition,
  RegionMapDefinition, ShopDefinition, SkillDefinition, StatBlock, StatDefinition, WorldRegionDefinition
} from './types';

type ChampionMetadata = Omit<ChampionDefinition, 'baseStats'>;
function championFrom(definition: ChampionMetadata, stats: StatBlock): ChampionDefinition {
  return { ...definition, baseStats: stats };
}

const champions: ChampionDefinition[] = [
  championFrom(garenDefinitionJson as unknown as ChampionMetadata, garenStatsJson as StatBlock),
  championFrom(teemoDefinitionJson as unknown as ChampionMetadata, teemoStatsJson as StatBlock)
];
const skills = skillsJson as unknown as SkillDefinition[];
const items = [
  longSwordJson,
  rubyCrystalJson,
  amplifyingTomeJson,
  sapphireCrystalJson,
  daggerJson,
  agilityCloakJson,
  lostChapterJson,
  speedCoreJson,
  powerWandJson,
  powerRelicJson,
  speedLegendaryJson,
  minorHealingPotionJson,
  echoLinkerHextechJson
] as unknown as ItemDefinition[];
const quests = [bandleFirstLinkQuestJson] as unknown as QuestDefinition[];
const recipes = recipesJson as unknown as RecipeDefinition[];
const shops = [bandleWorkshopJson] as unknown as ShopDefinition[];
const statDefinitions = statDefinitionsJson as unknown as StatDefinition[];
const worldRegions = runeterraRegionsJson as unknown as WorldRegionDefinition[];
const regionMaps = [bandleRegionMapJson] as unknown as RegionMapDefinition[];
const encounters = [bandleEncounterJson] as unknown as EncounterTable[];
const maps = [bandleMapJson, bandleVillageMapJson, bandleHouse01MapJson] as unknown as MapDefinition[];

function indexById<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

export class DataRegistry {
  private static championIndex = indexById(champions);
  private static skillIndex = indexById(skills);
  private static itemIndex = indexById(items);
  private static questIndex = indexById(quests);
  private static recipeIndex = indexById(recipes);
  private static shopIndex = indexById(shops);
  private static statIndex = indexById(statDefinitions);
  private static worldRegionIndex = indexById(worldRegions);
  private static regionMapIndex = indexById(regionMaps);
  private static encounterIndex = indexById(encounters);
  private static mapIndex = indexById(maps);

  static champion(id: string): ChampionDefinition { const v=this.championIndex.get(id); if(!v) throw new Error(`Unknown champion: ${id}`); return v; }
  static skill(id: string): SkillDefinition { const v=this.skillIndex.get(id); if(!v) throw new Error(`Unknown skill: ${id}`); return v; }
  static item(id: string): ItemDefinition { const v=this.itemIndex.get(id); if(!v) throw new Error(`Unknown item: ${id}`); return v; }
  static items(): ItemDefinition[] { return [...items]; }
  static quest(id: string): QuestDefinition { const v=this.questIndex.get(id); if(!v) throw new Error(`Unknown quest: ${id}`); return v; }
  static quests(): QuestDefinition[] { return [...quests]; }
  static recipe(id: string): RecipeDefinition { const v=this.recipeIndex.get(id); if(!v) throw new Error(`Unknown recipe: ${id}`); return v; }
  static recipes(): RecipeDefinition[] { return [...recipes]; }
  static shop(id: string): ShopDefinition { const v=this.shopIndex.get(id); if(!v) throw new Error(`Unknown shop: ${id}`); return v; }
  static shops(): ShopDefinition[] { return [...shops]; }
  static stat(id: keyof StatBlock): StatDefinition { const v=this.statIndex.get(id); if(!v) throw new Error(`Unknown stat: ${id}`); return v; }
  static stats(): StatDefinition[] { return [...statDefinitions].sort((a,b)=>a.order-b.order); }
  static worldRegions(): WorldRegionDefinition[] { return [...worldRegions]; }
  static worldRegion(id: string): WorldRegionDefinition { const v=this.worldRegionIndex.get(id); if(!v) throw new Error(`Unknown world region: ${id}`); return v; }
  static regionMap(id: string): RegionMapDefinition { const v=this.regionMapIndex.get(id); if(!v) throw new Error(`Unknown region map: ${id}`); return v; }
  static encounter(id: string): EncounterTable { const v=this.encounterIndex.get(id); if(!v) throw new Error(`Unknown encounter table: ${id}`); return v; }
  static map(id: string): MapDefinition { const v=this.mapIndex.get(id); if(!v) throw new Error(`Unknown map: ${id}`); return v; }
}
