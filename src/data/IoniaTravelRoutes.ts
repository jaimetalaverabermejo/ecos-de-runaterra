import ports from './world/regions/ionia/ferries.json';

// Footpaths and ferry routes are distinct: no terrestrial links between islands.
export const IONIA_LAND_ROUTES: readonly (readonly [string, string])[] = [
  [
    "jo01_koeshin",
    "jo02_white_cliffs"
  ],
  [
    "jo02_white_cliffs",
    "jo03_lhradi"
  ],
  [
    "jo03_lhradi",
    "jo04_rice_fields"
  ],
  [
    "jo04_rice_fields",
    "jo05_placidium"
  ],
  [
    "jo05_placidium",
    "jo06_estuary"
  ],
  [
    "jo06_estuary",
    "jo08_peaks"
  ],
  [
    "jo08_peaks",
    "jo07_wehle"
  ],
  [
    "jo07_wehle",
    "jo02_white_cliffs"
  ],
  [
    "jo09_forest_landing",
    "jo10_oblivion_garden"
  ],
  [
    "jo10_oblivion_garden",
    "jo11_omikayalan"
  ],
  [
    "jo11_omikayalan",
    "jo12_roots"
  ],
  [
    "jo12_roots",
    "jo13_vastaya_refuge"
  ],
  [
    "jo11_omikayalan",
    "jo13_vastaya_refuge"
  ],
  [
    "jo14_faelor_coast",
    "jo15_faelor_enclosure"
  ],
  [
    "jo16_orders_village",
    "jo17_kinkou"
  ],
  [
    "jo17_kinkou",
    "jo19_wanderers"
  ],
  [
    "jo19_wanderers",
    "jo18_shadow_ravine"
  ],
  [
    "jo19_wanderers",
    "jo20_trial_shrine"
  ]
];

export const IONIA_SEA_ROUTES: readonly (readonly [string, string])[] = ports.flatMap((port, i) =>
  ports.slice(i + 1).map(target => [port.mapId, target.mapId] as const));

export const IONIA_TRAVEL_ROUTES: readonly (readonly [string, string])[] = [...IONIA_LAND_ROUTES, ...IONIA_SEA_ROUTES];
