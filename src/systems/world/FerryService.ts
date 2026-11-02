import { MelDiplomacyService } from './MelDiplomacyService';
import ports from '../../data/world/regions/ionia/ferries.json';
import type { DialogueDefinition } from '../../data/narrativeTypes';

/** All landings share a destination menu; returns never depend on nearby portal objects. */
export class FerryService {
  static isDialogue(id?: string): boolean {
    return id === 'noxus-ferry-port' || ports.some(port => port.dialogueId === id);
  }
  static menu(dialogue: DialogueDefinition, mapId: string, flags: string[]): DialogueDefinition {
    if (!this.isDialogue(dialogue.id)) return dialogue;
    const crossing = mapId === 'jo21_reunion' && MelDiplomacyService.crossingAllowed(flags);
    const nodes = crossing ? dialogue.nodes.map(node => node.id === dialogue.startNodeId
      ? {...node, choices: [...(node.choices ?? []), {label: 'Viajar con Mel al Puerto Oriental de Noxus.', nextNodeId: 'sail:NO01_Puerto'}]}
      : node).concat([{id: 'sail:NO01_Puerto', speaker: 'Barquero', lines: ['Lady Medarda te espera a bordo. Rumbo al Puerto Oriental de Noxus.']}]) : dialogue.nodes;
    return { ...dialogue, nodes: nodes.map(node => ({ ...node,
      choices: node.choices?.filter(choice => !choice.nextNodeId.startsWith('sail:') || this.destination(mapId, choice.nextNodeId, flags))
    })) };
  }
  static destination(mapId: string, nodeId: string, flags: string[]): { mapId: string; spawn: string } | undefined {
    if (mapId === 'NO01_Puerto' && nodeId === 'sail:jo21_reunion') return {mapId: 'jo21_reunion', spawn: 'from_harbor'};
    if (mapId === 'jo21_reunion' && nodeId === 'sail:NO01_Puerto' && MelDiplomacyService.crossingAllowed(flags)) return {mapId: 'NO01_Puerto', spawn: 'from_ionia'};
    if (!ports.some(port => port.mapId === mapId)) return undefined;
    // Compatibility for an already open crew dialogue from an earlier build.
    const legacy = nodeId === 'embarcar' ? (mapId === 'jo07_wehle' ? 'jo09_forest_landing' : mapId === 'jo09_forest_landing' ? 'jo07_wehle' : undefined)
      : nodeId === 'embarcar-orders' && mapId === 'jo09_forest_landing' ? 'jo16_orders_village' : undefined;
    const targetId = nodeId.startsWith('sail:') ? nodeId.slice(5) : legacy;
    const target = ports.find(port => port.mapId === targetId && port.mapId !== mapId);
    if (!target || (target.requiredFlag && !flags.includes(target.requiredFlag))) return undefined;
    return { mapId: target.mapId, spawn: target.spawn };
  }
}
