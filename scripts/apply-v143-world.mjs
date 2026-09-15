import fs from 'node:fs';

function replaceOnce(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`No se encontró el ancla: ${label}`);
  return text.replace(oldValue, newValue);
}

const worldPath = 'src/scenes/WorldScene.ts';
let world = fs.readFileSync(worldPath, 'utf8');

world = replaceOnce(
  world,
  "import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, RectDefinition, TransitionDefinition } from '../data/types';\n",
  "import type { ChampionInstance, EncounterEntry, EncounterZoneDefinition, RectDefinition, TransitionDefinition } from '../data/types';\nimport type { DialogueDefinition, NpcDefinition } from '../data/narrativeTypes';\n",
  'tipos narrativos'
);

world = replaceOnce(
  world,
  "import { SaveService } from '../systems/save/SaveService';\nimport { WorldStateService } from '../systems/world/WorldStateService';\n",
  "import { SaveService } from '../systems/save/SaveService';\nimport { EchoAppearanceService } from '../systems/encounters/EchoAppearanceService';\nimport { ConditionService } from '../systems/world/ConditionService';\nimport { WorldActionService } from '../systems/world/WorldActionService';\n",
  'servicios de mundo v14.3'
);

world = world.replace("import { bandleVillageInteractions } from '../data/world/regions/bandle-city/zones/bandle-village/interactions';\n", '');

const oldTypes = `type Facing = 'up' | 'down' | 'left' | 'right';
type DialogueChoice = { label: string; nextNodeId: string };
type DialogueNode = { id: string; speaker: string; lines: readonly string[]; choices?: readonly DialogueChoice[] };
type DialogueDefinition = { id: string; startNodeId: string; nodes: readonly DialogueNode[] };
type NpcService =
  | { type: 'shop'; shopId: string }
  | { type: 'sanctuary'; sanctuaryId: string }
  | { type: 'quest'; questId: string };
type NpcVisualType = 'default' | 'merchant' | 'sanctuary';
type NpcPlacement = {
  id: string;
  name: string;
  x: number;
  y: number;
  facing: Facing;
  color: number;
  dialogueId?: string;
  service?: NpcService;
  visualType?: NpcVisualType;
  championId?: string;
  overworldScale?: number;
};
type MapInteractions = { npcs: readonly NpcPlacement[]; dialogues: readonly DialogueDefinition[] };
type NpcRuntime = { placement: NpcPlacement; body: PhysicsRectangle; visual: Phaser.GameObjects.Container };
`;
const newTypes = `type Facing = 'up' | 'down' | 'left' | 'right';
type NpcRuntime = { placement: NpcDefinition; body: PhysicsRectangle; visual: Phaser.GameObjects.Container };
`;
world = replaceOnce(world, oldTypes, newTypes, 'tipos locales antiguos de NPC');
world = world.replace("const EMPTY_INTERACTIONS: MapInteractions = { npcs: [], dialogues: [] };\n", '');

const interactionsMethod = `  private interactionsForMap(mapId: string): MapInteractions {
    if (mapId === 'bandle-village') return bandleVillageInteractions as unknown as MapInteractions;
    return EMPTY_INTERACTIONS;
  }

`;
world = world.replace(interactionsMethod, '');

world = replaceOnce(
  world,
  "    for (const placement of this.interactionsForMap(mapId).npcs) {\n",
  "    const placements = DataRegistry.npcs(mapId).filter((npc) => ConditionService.matchesAll(this.save, npc.conditions));\n    for (const placement of placements) {\n",
  'NPC por mapa desde DataRegistry'
);

const oldBeginInteraction = `  private beginNpcInteraction(npc: NpcRuntime): void {
    if (WorldStateService.recordNpcSpoken(this.save, npc.placement.id)) {
      SaveService.save(this.save);
    }
    const service = npc.placement.service;
`;
const newBeginInteraction = `  private beginNpcInteraction(npc: NpcRuntime): void {
    QuestService.recordEvent(this.save, { type: 'talk', targetId: npc.placement.id });
    WorldActionService.applyAll(this.save, npc.placement.onTalkActions);
    SaveService.save(this.save);
    const service = npc.placement.service;
`;
world = replaceOnce(world, oldBeginInteraction, newBeginInteraction, 'interacción genérica con NPC');

const questStart = world.indexOf('  private useQuestNpc(npc: NpcRuntime, questId: string): void {');
const questEnd = world.indexOf('  private beginNpcDialogue(npc: NpcRuntime): void {', questStart);
if (questStart < 0 || questEnd < 0) throw new Error('No se encontró el bloque useQuestNpc');
const newQuestBlock = `  private useQuestNpc(npc: NpcRuntime, questId: string): void {
    const quest = DataRegistry.quest(questId);
    let progress = QuestService.progress(this.save, questId);
    let dialogueId: string | undefined;

    if (!progress) {
      QuestService.start(this.save, questId);
      progress = QuestService.progress(this.save, questId);
      dialogueId = quest.dialogues?.start;
    } else if (progress.status === 'ready') {
      dialogueId = quest.dialogues?.ready;
      QuestService.complete(this.save, questId);
      progress = QuestService.progress(this.save, questId);
    } else if (progress.status === 'completed') {
      dialogueId = quest.dialogues?.completed;
    } else {
      dialogueId = quest.dialogues?.active;
    }

    SaveService.save(this.save);
    const dialogue = dialogueId ? DataRegistry.dialogue(dialogueId) : this.fallbackQuestDialogue(npc, quest.title, progress?.status ?? 'active');
    this.beginDialogueDefinition(npc, dialogue);
  }

  private fallbackQuestDialogue(npc: NpcRuntime, questTitle: string, status: 'active' | 'ready' | 'completed'): DialogueDefinition {
    const line = status === 'completed'
      ? \`Misión completada: \${questTitle}.\`
      : status === 'ready'
        ? 'Has completado los objetivos. Vuelve para cerrar la misión.'
        : 'Sigue los objetivos del diario y vuelve cuando hayas terminado.';
    return {
      id: \`fallback-\${npc.placement.id}\`,
      startNodeId: 'inicio',
      nodes: [{ id: 'inicio', speaker: npc.placement.name, lines: [line] }]
    };
  }

`;
world = world.slice(0, questStart) + newQuestBlock + world.slice(questEnd);

const oldNpcDialogue = `  private beginNpcDialogue(npc: NpcRuntime): void {
    if (!npc.placement.dialogueId) return;
    const dialogue = this.interactionsForMap(this.save.currentMapId).dialogues.find((entry) => entry.id === npc.placement.dialogueId);
    if (!dialogue) return;
    this.beginDialogueDefinition(npc, dialogue);
  }
`;
const newNpcDialogue = `  private beginNpcDialogue(npc: NpcRuntime): void {
    if (!npc.placement.dialogueId) return;
    this.beginDialogueDefinition(npc, DataRegistry.dialogue(npc.placement.dialogueId));
  }
`;
world = replaceOnce(world, oldNpcDialogue, newNpcDialogue, 'diálogo desde DataRegistry');

const oldSync = `  private syncWorldProgress(mapId: string): void {
    this.save.worldProgress.currentRegionId = 'bandle-city';
    if (mapId === 'bandle-debug') this.save.worldProgress.currentZoneId = 'portal-clearing';
    if (mapId === 'bandle-village' || mapId === 'bandle-house-01') {
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) {
        this.save.worldProgress.unlockedZones.push('bandle-village');
      }
    }
  }
`;
const newSync = `  private syncWorldProgress(mapId: string): void {
    this.save.worldProgress.currentRegionId = 'bandle-city';
    if (mapId === 'bandle-debug') this.save.worldProgress.currentZoneId = 'portal-clearing';
    if (mapId === 'bandle-village' || mapId === 'bandle-house-01') {
      this.save.worldProgress.currentZoneId = 'bandle-village';
      if (!this.save.worldProgress.unlockedZones.includes('bandle-village')) {
        this.save.worldProgress.unlockedZones.push('bandle-village');
      }
    }
    QuestService.recordEvent(this.save, { type: 'visit', targetId: this.save.worldProgress.currentZoneId });
  }
`;
world = replaceOnce(world, oldSync, newSync, 'evento de visita a zona');

const oldEncounterStart = `    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.encounterDistanceAccumulator = 0;
    const wildChampion = this.createWildChampion(zone.encounterTableId);
`;
const newEncounterStart = `    const wildChampion = this.createWildChampion(zone.encounterTableId);
    if (!wildChampion) {
      this.encounterCooldownUntil = this.time.now + 900;
      this.encounterDistanceAccumulator = 0;
      return;
    }
    this.transitioning = true;
    this.player.body.setVelocity(0, 0);
    this.encounterDistanceAccumulator = 0;
`;
world = replaceOnce(world, oldEncounterStart, newEncounterStart, 'encuentro condicionado');

world = replaceOnce(
  world,
  "  private createWildChampion(encounterTableId: string): ChampionInstance {\n    const table = DataRegistry.encounter(encounterTableId);\n    const entry = this.pickWeightedEntry(table.entries);\n",
  "  private createWildChampion(encounterTableId: string): ChampionInstance | null {\n    const entries = EchoAppearanceService.entriesForEncounter(\n      this.save,\n      encounterTableId,\n      this.save.worldProgress.currentRegionId,\n      this.save.worldProgress.currentZoneId\n    );\n    if (entries.length === 0) return null;\n    const entry = this.pickWeightedEntry(entries);\n",
  'resolver apariciones lógicas'
);

fs.writeFileSync(worldPath, world);

const bootPath = 'src/scenes/BootScene.ts';
let boot = fs.readFileSync(bootPath, 'utf8');
boot = replaceOnce(boot, "    this.registry.set('app.version', '14.2');", "    this.registry.set('app.version', '14.3');", 'versión BootScene');
fs.writeFileSync(bootPath, boot);

const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '0.14.3';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log('Parche v14.3 aplicado.');
