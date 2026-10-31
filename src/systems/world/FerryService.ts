import ports from '../../data/world/regions/ionia/ferries.json';
import type { DialogueDefinition } from '../../data/narrativeTypes';

/** All landings share a destination menu; returns never depend on nearby portal objects. */
export class FerryService {
  static isDialogue(id?: string): boolean {
    return ports.some(port => port.dialogueId === id);
  }
  static menu(dialogue: DialogueDefinition, mapId: string, flags: string[]): DialogueDefinition {
    if (!this.isDialogue(dialogue.id)) return dialogue;
    return { ...dialogue, nodes: dialogue.nodes.map(node => ({ ...node,
      choices: node.choices?.filter(choice => !choice.nextNodeId.startsWith('sail:') || this.destination(mapId, choice.nextNodeId, flags))
    })) };
  }
  static destination(mapId: string, nodeId: string, flags: string[]): { mapId: string; spawn: string } | undefined {
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
