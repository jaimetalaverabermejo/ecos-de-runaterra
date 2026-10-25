import type { SaveGame } from '../state/GameState';

/** Campaign artifacts. Custody is independent of the Echo build's rune traits. */
export const WORLD_RUNES = [
  { id: 'spirit', name: 'Espíritu', region: 'Jonia', itemId: 'spirit-world-rune', description: 'Une el mundo material y el espiritual. Akali, Shen y Zed te han confiado su custodia. Su ubicación debe permanecer en secreto; todavía no dominas su poder.' },
  { id: 'will', name: 'Voluntad', region: 'Noxus', itemId: 'will-world-rune' },
  { id: 'matter', name: 'Materia', region: 'Demacia', itemId: 'matter-world-rune' },
  { id: 'permanence', name: 'Permanencia', region: 'Freljord', itemId: 'permanence-world-rune' },
  { id: 'energy', name: 'Energía', region: 'Piltover y Zaun', itemId: 'energy-world-rune' },
  { id: 'time', name: 'Tiempo', region: 'Shurima', itemId: 'time-world-rune' },
  { id: 'destiny', name: 'Destino', region: 'Targon', itemId: 'destiny-world-rune' },
  { id: 'life', name: 'Vida', region: 'Ixtal', itemId: 'life-world-rune' },
  { id: 'transit', name: 'Tránsito', region: 'Islas de la Sombra', itemId: 'transit-world-rune' }
] as const;
export const ownedWorldRunes = (save: SaveGame) => WORLD_RUNES.filter(rune => (save.inventory[rune.itemId] ?? 0) > 0);
