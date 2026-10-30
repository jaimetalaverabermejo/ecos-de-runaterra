import type { SaveGame } from '../state/GameState';

/** Campaign artifacts. Custody is independent of the Echo build's rune traits. */
export const WORLD_RUNES = [
  { id: 'spirit', assetUrl: './assets/world/runes/runa_espiritu.png', name: 'Espíritu', region: 'Jonia', itemId: 'spirit-world-rune', description: 'Une el mundo material y el espiritual. Akali, Shen y Zed te han confiado su custodia. Su ubicación debe permanecer en secreto; todavía no dominas su poder.' },
  { id: 'will', assetUrl: './assets/world/runes/runa_voluntad.png', name: 'Voluntad', region: 'Noxus', itemId: 'will-world-rune' },
  { id: 'matter', assetUrl: './assets/world/runes/runa_materia.png', name: 'Materia', region: 'Demacia', itemId: 'matter-world-rune' },
  { id: 'permanence', assetUrl: './assets/world/runes/runa_permanencia.png', name: 'Permanencia', region: 'Freljord', itemId: 'permanence-world-rune' },
  { id: 'energy', assetUrl: './assets/world/runes/runa_energia.png', name: 'Energía', region: 'Piltover y Zaun', itemId: 'energy-world-rune' },
  { id: 'time', assetUrl: './assets/world/runes/runa_tiempo.png', name: 'Tiempo', region: 'Shurima', itemId: 'time-world-rune' },
  { id: 'destiny', assetUrl: './assets/world/runes/runa_destino.png', name: 'Destino', region: 'Targon', itemId: 'destiny-world-rune' },
  { id: 'life', assetUrl: './assets/world/runes/runa_vida.png', name: 'Vida', region: 'Ixtal', itemId: 'life-world-rune' },
  { id: 'transit', assetUrl: './assets/world/runes/runa_transito.png', name: 'Tránsito', region: 'Islas de la Sombra', itemId: 'transit-world-rune' }
] as const;
export const ownedWorldRunes = (save: SaveGame) => WORLD_RUNES.filter(rune => (save.inventory[rune.itemId] ?? 0) > 0);

export const worldRuneTexture = (rune: typeof WORLD_RUNES[number]) => `item-${rune.itemId}`;
