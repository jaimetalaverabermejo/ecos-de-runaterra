/** Shared by the loader and both battle scenes. Backgrounds are full 960 × 540 PNGs. */
export const COMBAT_BACKGROUNDS = {
  bandle: { key: 'combat-bandle-background', url: './assets/ui960/combat/01_battle_bg_bandle.png' },
  generic: { key: 'combat-generic-background', url: './assets/ui960/combat/battle-bg-generic.png' },
  ionia: { key: 'combat-ionia-background', url: './assets/ui960/combat/battle-bg-ionia.png' },
  'noxus-field': { key: 'combat-noxus-field-background', url: './assets/ui960/combat/battle-bg-noxus-field.png' },
  'noxus-city': { key: 'combat-noxus-city-background', url: './assets/ui960/combat/battle-bg-noxus-city.png' },
  'demacia-field': { key: 'combat-demacia-field-background', url: './assets/ui960/combat/battle-bg-demacia-field.png' },
  'demacia-city': { key: 'combat-demacia-city-background', url: './assets/ui960/combat/battle-bg-demacia-city.png' },
  freljord: { key: 'combat-freljord-background', url: './assets/ui960/combat/battle-bg-freljord.png' }
} as const;

export type CombatBackgroundId = keyof typeof COMBAT_BACKGROUNDS;

// Explicit assignments: do not guess an environment from translated map names.
export const MAP_BATTLE_ENVIRONMENTS: Record<string, 'field' | 'city'> = {
  NO01_Puerto: 'city',
  NO02_Cruce_Caravanas: 'field',
  NO03_Basilich: 'city',
  NO04_Suministros: 'field',
  NO05_Capital_Exterior: 'city',
  NO06_Bastion_Interior: 'city',
  NO07_Memorial_Sion: 'field',
  NO08_Frontera_Occidental: 'field',
  NO09_Delverhold: 'city',
  NO10_Ironspike: 'field'
};

// These legacy maps predate regionId metadata.
const BANDLE_MAP_IDS = new Set([
  'angar_corki', 'bandle_village', 'three-house', 'clearing', 'portal_mountains',
  'gnar_cave', 'gnar_valley', 'dark_forest',
  ...Array.from({ length: 7 }, (_, index) => `bandle_house_0${index + 2}`)
]);

interface BattleMap {
  id: string;
  regionId?: string;
  zoneId?: string;
  battleEnvironment?: 'field' | 'city';
}

export function combatBackgroundForMap(map?: BattleMap): CombatBackgroundId {
  if (!map) return 'generic';
  const region = map.regionId ?? (BANDLE_MAP_IDS.has(map.id) ? 'bandle-city' : undefined);
  const environment = map.battleEnvironment ?? MAP_BATTLE_ENVIRONMENTS[map.id]
    ?? (map.zoneId ? MAP_BATTLE_ENVIRONMENTS[map.zoneId] : undefined) ?? 'field';
  switch (region) {
    case 'bandle-city': return 'bandle';
    case 'ionia': return 'ionia';
    case 'noxus': return environment === 'city' ? 'noxus-city' : 'noxus-field';
    case 'demacia': return environment === 'city' ? 'demacia-city' : 'demacia-field';
    case 'freljord': return 'freljord';
    default: return 'generic';
  }
}
