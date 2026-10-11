import intro from '../../../audio/music/general/Intro Ecos de Runaterra.mp3?url';
import village from '../../../audio/music/bandle/Ciudad de Bandle.mp3?url';
import routes from '../../../audio/music/bandle/Rutas Bandle.mp3?url';
import forest from '../../../audio/music/bandle/Bosque.mp3?url';
import battle from '../../../audio/music/bandle/Combate Bandle.mp3?url';
import boss from '../../../audio/music/bandle/Combate jefe.mp3?url';
import ioniaBattle from '../../../audio/music/jonia/Combate jonia.mp3?url';

export const MUSIC = { intro, village, routes, forest, battle, boss, ioniaBattle };
export type MusicId = keyof typeof MUSIC;

// Temporary shared exploration palette until Ionia has its own soundtrack.
export function worldMusic(mapId: string): MusicId {
  if (['dark_forest', 'gnar_cave'].includes(mapId)) return 'forest';
  if (mapId === 'bandle_village' || mapId.startsWith('bandle_house_')
    || ['three-house', 'angar_corki'].includes(mapId)
    || mapId.includes('_house_') || ['jo01_koeshin', 'jo03_lhradi', 'jo05_placidium'].includes(mapId)) return 'village';
  return 'routes';
}

export function battleMusic(mapId: string, duelId = '', showdown = false): MusicId {
  if (['gnar-cave-boss', 'kennen-portal-boss'].includes(duelId)) return 'boss';
  if (showdown || mapId.startsWith('jo') || duelId.startsWith('ionia-')) return 'ioniaBattle';
  return 'battle';
}
