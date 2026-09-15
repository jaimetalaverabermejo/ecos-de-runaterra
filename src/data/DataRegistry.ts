import { CatalogoContenido, type FormaEcoDescubierta } from '../contenido/CatalogoContenido';
import { CatalogoMundo } from '../contenido/CatalogoMundo';
import echoCatalogJson from './echoes/catalog.json';
import statDefinitionsJson from './stats/definitions.json';
import type { DialogueDefinition, NpcDefinition } from './narrativeTypes';
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
const npcs = CatalogoMundo.npcs();
const dialogues = CatalogoMundo.dialogos();
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

function duplicateIdErrors<T extends { id: string }>(label: string, entries: T[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) duplicated.add(entry.id);
    seen.add(entry.id);
  }
  return [...duplicated].map((id) => `${label}: ID duplicado "${id}".`);
}

export class DataRegistry {
  private static championIndex = indexById(champions);
  private static characterIndex = indexById(characters);
  private static formIndex = new Map(forms.map((form) => [formKey(form.championId, form.id), form]));
  private static skillIndex = indexById(skills);
  private static npcIndex = indexById(npcs);
  private static dialogueIndex = indexById(dialogues);
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
  static npc(id: string): NpcDefinition { const v=this.npcIndex.get(id); if(!v) throw new Error(`Unknown NPC: ${id}`); return v; }
  static npcs(mapId?: string): NpcDefinition[] { return mapId ? npcs.filter((npc) => npc.mapId === mapId) : [...npcs]; }
  static dialogue(id: string): DialogueDefinition { const v=this.dialogueIndex.get(id); if(!v) throw new Error(`Unknown dialogue: ${id}`); return v; }
  static dialogues(): DialogueDefinition[] { return [...dialogues]; }
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

  static validate(): string[] {
    const errors: string[] = [
      ...duplicateIdErrors('Ecos', champions),
      ...duplicateIdErrors('Personajes', characters),
      ...duplicateIdErrors('Habilidades', skills),
      ...duplicateIdErrors('NPC', npcs),
      ...duplicateIdErrors('Diálogos', dialogues),
      ...duplicateIdErrors('Objetos', items),
      ...duplicateIdErrors('Misiones', quests),
      ...duplicateIdErrors('Recetas', recipes),
      ...duplicateIdErrors('Tiendas', shops),
      ...duplicateIdErrors('Encuentros', encounters),
      ...duplicateIdErrors('Mapas', maps)
    ];

    const catalogIds = new Set(echoCatalog.map((entry) => entry.id));

    for (const echo of champions) {
      if (!catalogIds.has(echo.id)) errors.push(`Eco "${echo.id}": no existe en el catálogo global.`);
      const expectedSkills = [echo.passiveSkillId, ...echo.skillIds];
      for (const skillId of expectedSkills) {
        const skill = this.skillIndex.get(skillId);
        if (!skill) errors.push(`Eco "${echo.id}": falta la habilidad "${skillId}".`);
        else if (skill.championId !== echo.id) errors.push(`Habilidad "${skillId}": pertenece a "${skill.championId}" y está referenciada por "${echo.id}".`);
      }
    }

    for (const form of forms) {
      if (!this.characterIndex.has(form.championId)) errors.push(`Forma "${form.championId}/${form.id}": personaje base desconocido.`);
      if ((form.contentStatus === 'jugable' || form.contentStatus === 'completo') && !this.championIndex.has(form.championId)) {
        errors.push(`Forma "${form.championId}/${form.id}": está marcada como jugable pero el Eco base no tiene definición jugable.`);
      }
      for (const skillId of [form.passiveSkillId, ...(form.skillIds ?? [])].filter(Boolean) as string[]) {
        if (!this.skillIndex.has(skillId)) errors.push(`Forma "${form.championId}/${form.id}": falta la habilidad "${skillId}".`);
      }
    }

    for (const appearance of appearances) {
      if (!this.championIndex.has(appearance.championId)) errors.push(`Aparición "${appearance.id}": Eco desconocido "${appearance.championId}".`);
    }

    for (const npc of npcs) {
      if (!this.mapIndex.has(npc.mapId)) errors.push(`NPC "${npc.id}": mapa desconocido "${npc.mapId}".`);
      if (npc.championId && !this.characterIndex.has(npc.championId)) errors.push(`NPC "${npc.id}": personaje desconocido "${npc.championId}".`);
      if (npc.formId && (!npc.championId || !this.formIndex.has(formKey(npc.championId, npc.formId)))) {
        errors.push(`NPC "${npc.id}": forma desconocida "${npc.championId ?? 'sin-campeon'}/${npc.formId}".`);
      }
      if (npc.dialogueId && !this.dialogueIndex.has(npc.dialogueId)) errors.push(`NPC "${npc.id}": diálogo desconocido "${npc.dialogueId}".`);
      if (npc.service?.type === 'shop' && !this.shopIndex.has(npc.service.shopId)) errors.push(`NPC "${npc.id}": tienda desconocida "${npc.service.shopId}".`);
      if (npc.service?.type === 'quest' && !this.questIndex.has(npc.service.questId)) errors.push(`NPC "${npc.id}": misión desconocida "${npc.service.questId}".`);
    }

    for (const dialogue of dialogues) {
      if (!dialogue.nodes.some((node) => node.id === dialogue.startNodeId)) errors.push(`Diálogo "${dialogue.id}": nodo inicial desconocido "${dialogue.startNodeId}".`);
      const nodeIds = new Set(dialogue.nodes.map((node) => node.id));
      for (const node of dialogue.nodes) {
        for (const choice of node.choices ?? []) {
          if (!nodeIds.has(choice.nextNodeId)) errors.push(`Diálogo "${dialogue.id}": opción de "${node.id}" apunta a nodo desconocido "${choice.nextNodeId}".`);
        }
      }
    }

    for (const quest of quests) {
      if (!this.npcIndex.has(quest.startNpcId)) errors.push(`Misión "${quest.id}": NPC inicial desconocido "${quest.startNpcId}".`);
      if (!this.npcIndex.has(quest.completionNpcId)) errors.push(`Misión "${quest.id}": NPC de entrega desconocido "${quest.completionNpcId}".`);
      const objectives = quest.steps?.flatMap((step) => step.objectives) ?? quest.objectives ?? [];
      if (objectives.length === 0) errors.push(`Misión "${quest.id}": no tiene objetivos.`);
      for (const dialogueId of Object.values(quest.dialogues ?? {})) {
        if (dialogueId && !this.dialogueIndex.has(dialogueId)) errors.push(`Misión "${quest.id}": diálogo desconocido "${dialogueId}".`);
      }
    }

    for (const recipe of recipes) {
      if (!this.itemIndex.has(recipe.resultItemId)) errors.push(`Receta "${recipe.id}": resultado desconocido "${recipe.resultItemId}".`);
      for (const ingredient of recipe.ingredients) {
        if (!this.itemIndex.has(ingredient.itemId)) errors.push(`Receta "${recipe.id}": ingrediente desconocido "${ingredient.itemId}".`);
      }
    }

    for (const shop of shops) {
      for (const entry of shop.entries) {
        if (!this.itemIndex.has(entry.itemId)) errors.push(`Tienda "${shop.id}": objeto desconocido "${entry.itemId}".`);
      }
    }

    for (const encounter of encounters) {
      for (const entry of encounter.entries) {
        if (!this.championIndex.has(entry.championId)) errors.push(`Encuentro "${encounter.id}": Eco desconocido "${entry.championId}".`);
      }
    }

    for (const map of maps) {
      for (const transition of map.transitions) {
        if (!this.mapIndex.has(transition.targetMapId)) errors.push(`Mapa "${map.id}": transición hacia mapa desconocido "${transition.targetMapId}".`);
      }
      for (const zone of map.encounterZones) {
        if (!this.encounterIndex.has(zone.encounterTableId)) errors.push(`Mapa "${map.id}": tabla de encuentros desconocida "${zone.encounterTableId}".`);
      }
    }

    return errors;
  }
}
