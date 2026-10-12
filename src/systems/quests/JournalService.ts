import { DataRegistry } from '../../data/DataRegistry';
import type { SaveGame } from '../../state/GameState';
import { QuestService } from './QuestService';
export type JournalFilter = 'active' | 'available' | 'completed';
export class JournalService {
  static entries(save: SaveGame, filter: JournalFilter) {
    return DataRegistry.quests().filter(quest => {
      const progress = save.quests[quest.id];
      if (filter === 'active') return progress?.status === 'active' || progress?.status === 'ready';
      if (filter === 'completed') return progress?.status === 'completed';
      return !progress && QuestService.canStart(save, quest.id) && save.worldProgress.unlockedRegions.includes(quest.regionId);
    }).sort((a, b) => Number(b.regionId === save.worldProgress.currentRegionId) - Number(a.regionId === save.worldProgress.currentRegionId)
      || Number(save.quests[b.id]?.status === 'ready') - Number(save.quests[a.id]?.status === 'ready') || a.title.localeCompare(b.title, 'es'));
  }
  static categoryLabel(category?: string): string {
    return category === 'main' ? 'HISTORIA' : category === 'champion' ? 'HISTORIA DE CAMPEÓN' : 'ENCARGO';
  }
}
