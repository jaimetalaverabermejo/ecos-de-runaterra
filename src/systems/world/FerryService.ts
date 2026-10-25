/** Crew destinations are explicit: a trip never depends on a nearby portal being loaded. */
export class FerryService {
  static destination(mapId: string, nodeId: string, flags: string[]): { mapId: string; spawn: string } | undefined {
    if (nodeId === 'embarcar' && mapId === 'jo07_wehle') return { mapId: 'jo09_forest_landing', spawn: 'from_wehle' };
    if (nodeId === 'embarcar' && mapId === 'jo09_forest_landing') return { mapId: 'jo07_wehle', spawn: 'from_forest' };
    if (nodeId === 'embarcar-orders' && mapId === 'jo09_forest_landing' && flags.includes('story:orders-letter')) return { mapId: 'jo16_orders_village', spawn: 'from_previous' };
    return undefined;
  }
}
