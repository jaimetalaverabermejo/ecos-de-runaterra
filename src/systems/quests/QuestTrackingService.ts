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
    if (questId === 'ionia-broken-oath') {
      if (!has('story:riven-yasuo-discussed')) return has('story:yasuo-met') || has('echo:yasuo-resonance')
        ? 'Vuelve con Riven al Camino de los Errantes. Ya has escuchado al hombre del árbol.'
        : 'Busca al espadachín junto al árbol, al otro lado del puente pequeño del sudeste de los Arrozales. Después vuelve con Riven.';
      if (!has('story:riven-peaks-met')) return 'Riven te espera junto al refugio del Paso de las Cumbres. Puedes llegar desde Weh’le o desde el Estuario.';
      if (!has('story:riven-clearing-reached')) return 'Acompaña a Riven al claro del noroeste, por el ramal occidental de la terraza superior de las Cumbres.';
      if (!has('story:riven-path-cleared')) return 'Habla con el rastreador del claro cuando estés preparado. Riven combatirá junto a tu Eco.';
      if (!has('story:scene:yone-memory')) return 'Sube con Riven la escalera occidental del claro. Escucha lo que queda al otro lado del viento.';
      return 'Escucha a la figura enmascarada para cerrar el recuerdo.';
    }
    if (questId === 'ionia-unquiet-spheres' && has('story:forest-trace') && !has('story:forest-ahri-guide') && !has('story:forest-control')) {
      if (!has('story:forest-syndra-trail-1')) return 'Syndra está junto al sendero de llegada al Jardín. Acércate sin acorralarla.';
      if (!has('story:forest-syndra-trail-2')) return 'Sigue el sendero hacia el cruce central del Jardín. Syndra ha vuelto a detenerse allí.';
      return 'Syndra ha llegado al sauce gigante del noroeste. Habla con Ahri junto a las raíces.';
    }
    if (questId === 'ionia-jhin-trail' && has('story:ionia-jhin-register') && !has('story:ionia-jhin-third')) {
      if (has('story:jhin-elan-midpoint')) return 'Continúa junto a Elan hasta la miliciana del muelle occidental de We’hle.';
      if (has('story:jhin-elan-walk-1')) return 'Acompaña a Elan por el muelle. Te esperará si te quedas atrás.';
      return 'Busca a Elan en el embarcadero occidental de We’hle; es la persona que figura en el registro.';
    }
    if (questId === 'ionia-jhin-trail' && has('story:ionia-jhin-warned') && !has('story:ionia-jhin-confronted')) {
      if (save.currentMapId === 'jo03_lhradi_theatre_backstage') return 'Taller de máscaras: usa la puerta de la pared derecha que está más abajo. La puerta de arriba vuelve a la sala.';
      if (save.currentMapId === 'jo03_lhradi_theatre_sala') return 'Entra en bambalinas por la puerta central de la pared superior de esta sala.';
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
