import { DataRegistry } from '../../data/DataRegistry';
import type { SaveGame } from '../../state/GameState';
import { QuestService } from './QuestService';

/** A short next action, shared by the overworld HUD and playtest checks. */
export class QuestTrackingService {
  static entries(save: SaveGame) {
    const order = Object.keys(save.quests);
    return DataRegistry.quests().filter(q => ['active', 'ready'].includes(save.quests[q.id]?.status ?? ''))
      .sort((a, b) => Number(b.regionId === save.worldProgress.currentRegionId) - Number(a.regionId === save.worldProgress.currentRegionId)
        || order.indexOf(b.id) - order.indexOf(a.id));
  }

  static next(save: SaveGame, questId: string): string {
    const quest = DataRegistry.quest(questId);
    const has = (id: string) => save.worldProgress.flags.includes(id);
    if (questId === 'ionia-jhin-trail' && has('story:ionia-jhin-warned') && !has('story:ionia-jhin-confronted')) {
      if (save.currentMapId === 'jo03_lhradi_theatre_backstage') return 'Taller de máscaras: usa la puerta de la pared derecha que está más abajo. La puerta de arriba vuelve a la sala.';
      if (save.currentMapId === 'jo03_lhradi_theatre_sala') return 'Entra en bambalinas por la puerta de la esquina superior derecha de esta sala.';
      if (save.currentMapId === 'jo03_lhradi_house_04') return 'Ya estás en el Taller de máscaras. Habla con Jhin.';
      return 'Vuelve al teatro de Lhradi. El Taller de máscaras está dentro, conectado a las bambalinas.';
    }
    if (questId === 'ionia-karma-memory') {
      if (!has('story:karma-pagoda-open')) return 'Habla con Yun, junto a la pagoda de Navori.';
      if (!has('story:karma-audience')) return 'Sube a la planta superior de la pagoda y habla con Karma.';
      if (has('story:karma-date-recheck')) return 'Vuelve al lado derecho del muro memorial y comprueba la fecha de la inscripción.';
      if (has('story:ionia-karma-flashback')) {
        if (!has('story:karma-memorial-journey')) return 'Habla con Karma en la pagoda para partir hacia el memorial.';
        if (!has('story:karma-memorial-meilin')) return 'Habla con Meilin junto al muro memorial, antes del puente hacia la cima de Navori.';
        if (!has('story:karma-memorial-tao')) return 'Habla con Tao junto al muro memorial de Navori.';
        return 'Habla con Karma junto al muro memorial para reunir todos los nombres.';
      }
    }
    if (save.quests[questId]?.status === 'ready') {
      const npc = DataRegistry.npcs().find(n => n.id === quest.completionNpcId);
      const map = npc && DataRegistry.map(npc.mapId);
      return npc ? `Habla con ${npc.name} en ${map?.name ?? 'la zona indicada en el diario'}.` : 'Consulta el diario para recoger la recompensa.';
    }
    return QuestService.currentStep(save, questId)?.description ?? quest.description;
  }
}
