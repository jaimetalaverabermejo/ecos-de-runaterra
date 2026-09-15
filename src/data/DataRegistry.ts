import { CatalogoContenido, type FormaEcoDescubierta } from '../contenido/CatalogoContenido';
import echoCatalogJson from './echoes/catalog.json';
import statDefinitionsJson from './stats/definitions.json';
import type {
  ChampionDefinition,
  CharacterDefinition,
  EchoAppearanceDefinition,
  EchoCatalogEntry,
  EncounterTable,
  ItemDefinition,
  MapDefinition,
  QuestDefinition,
  RecipeDefinition,
  RegionMapDefinition,
  ShopDefinition,
  SkillDefinition,
  StatBlock,
  StatDefinition,
  WorldRegionDefinition
} from './types';

const itemModules = import.meta.glob('./items/**/*.json', { eager: true, import: 'default' }) as Record<string, ItemDefinition>;
const questModules = import.meta.glob('./quests/**/*.json', { eager: true, import: 'default' }) as Record<string, QuestDefinition>;
const recipeModules = import.meta.glob('./recipes/**/*.json', { eager: true, import: 'default' }) as Record<string, RecipeDefinition | RecipeDefinition[]>;
const shopModules = import.meta.glob('./shops/**/*.json', { eager: true, import: 'default' }) as Record<string, ShopDefinition>;
const worldRegionModules = import.meta.glob('./world/runeterra/*.json', { eager: true, import: 'default' }) as Record<string, WorldRegionDefinition | WorldRegionDefinition[]>;
const regionMapModules = import.meta.glob('./world/regions/*/region-map.json', { eager: true, import: 'default' }) as Record<string, RegionMapDefinition>;
const encounterModules = import.meta.glob('./world/regions/*/zones/*/encounters.json', { eager: true, import: 'default' }) as Record<string, EncounterTable>;
const mapModules = import.meta.glob('./world/regions/*/zones/*/map.json', { eager: true, import: 'default' }) as Record<string, MapDefinition>;

function flattenModules<T>(modules: Record<string, T | T[]>): T[] {
  return Object.values(modules).flatMap((value) => Array.isArray(value) ? value : [value]);
}

const champions = CatalogoContenido.ecos();
const characters = CatalogoContenido.personajes();
const appearances = CatalogoContenido.apariciones();
const forms = CatalogoContenido.formas();
const echoCatalog = echoCatalogJson as unknown as EchoCatalogEntry[];
const skills = CatalogoContenido.habilidades();
const items = Object.values(itemModules);
const quests = Object.values(questModules);
const recipes = flattenModules(recipeModules);
const shops = Object.values(shopModules);
const statDefinitions = statDefinitionsJson as unknown as StatDefinition[];
const worldRegions = flattenModules(worldRegionModules);
const regionMaps = Object.values(regionMapModules);
const encounters = Object.values(encounterModules);
const maps = Object.values(mapModules);

function indexById<T extends { id: string }>(entries: T[]): Map<string, T> {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function formKey(championId: string, formId: string): string {
  return `${championId}:${formId}`;
}

export class DataRegistry {
  private static championIndex = indexById(champions);
  private static characterIndex = indexById(characters);
  private static formIndex = new Map(forms.map((form) => [formKey(form.championId, form.id), form]));
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

  // Compatibilidad: champion() seguirá funcionando mientras el código de gameplay migra al término Eco.
  static champion(id: string): ChampionDefinition { return this.echo(id); }
  static echo(id: string): ChampionDefinition { const v=this.championIndex.get(id); if(!v) throw new Error(`Unknown echo: ${id}`); return v; }
  static echoes(): ChampionDefinition[] { return [...champions]; }
  static character(id: string): CharacterDefinition { const v=this.characterIndex.get(id); if(!v) throw new Error(`Unknown character: ${id}`); return v; }
  static characters(): CharacterDefinition[] { return [...characters]; }
  static appearances(championId?: string): EchoAppearanceDefinition[] { return championId ? appearances.filter((entry) => entry.championId === championId) : [...appearances]; }
  static form(championId: string, formId: string): FormaEcoDescubierta { const v=this.formIndex.get(formKey(championId, formId)); if(!v) throw new Error(`Unknown echo form: ${championId}/${formId}`); return v; }
  static forms(championId?: string): FormaEcoDescubierta[] { return championId ? forms.filter((form) => form.championId === championId) : [...forms]; }
  static skill(id: string): SkillDefinition { const v=this.skillIndex.get(id); if(!v) throw new Error(`Unknown skill: ${id}`); return v; }
  static item(id: string): ItemDefinition { const v=this.itemIndex.get(id); if(!v) throw new Error(`Unknown item: ${id}`); return v; }
  static items(): ItemDefinition[] { return [...items]; }
  static echoCatalog(): EchoCatalogEntry[] { return [...echoCatalog]; }
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
