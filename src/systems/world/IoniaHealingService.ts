import type { SaveGame } from '../../state/GameState';

/** Relocate only retired lantern checkpoints; preserve all earned progress and money. */
export class IoniaHealingService {
  static migrate(save: SaveGame): void {
    if (!/^jo\d+.*(?:rest|healing)/.test(save.checkpoint.sanctuaryId) && save.checkpoint.sanctuaryId !== 'forest-rest-landing') return;
    if (save.checkpoint.sanctuaryId.endsWith('-healing-v2')) return;
    const number = Number(save.checkpoint.mapId.slice(2, 4));
    const sites: Record<number, [string, number, number]> = {
      9: ['jo09_forest_landing', 1440, 944], 10: ['jo09_forest_landing', 1440, 944],
      11: ['jo11_omikayalan', 1664, 1040], 12: ['jo11_omikayalan', 1664, 1040],
      13: ['jo13_vastaya_refuge', 1392, 1232], 16: ['jo16_orders_village', 1360, 1424],
      17: ['jo16_orders_village', 1360, 1424], 18: ['jo18_shadow_ravine_interior_01', 512, 304],
      19: ['jo18_shadow_ravine_interior_01', 512, 304], 20: ['jo20_trial_shrine', 1632, 976],
      21: ['jo20_trial_shrine', 1632, 976]
    };
    const site = sites[number];
    if (!site) return;
    const [mapId, x, y] = site;
    save.checkpoint = { sanctuaryId: `${mapId.replace(/_interior_\d+$/, '')}-healing-v2`, name: 'Punto de descanso de Jonia', mapId, x, y };
  }
}
