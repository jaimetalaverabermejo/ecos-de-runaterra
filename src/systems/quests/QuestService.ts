import { DataRegistry } from '../../data/DataRegistry';
import type { QuestDefinition, QuestId, QuestRewardDefinition } from '../../data/types';
import type { QuestProgressState, SaveGame } from '../../state/GameState';
import { InventoryService } from '../inventory/InventoryService';
import { ConditionService } from '../world/ConditionService';
import { WorldStateService } from '../world/WorldStateService';

export interface QuestEvent {
  type: 'link' | 'defeat' | 'talk' | 'visit' | 'item';
  targetId?: string;
  amount?: number;
}

export class QuestService {
  static progress(save: SaveGame, questId: QuestId): QuestProgressState | undefined {
    return save.quests[questId];
  }

  static canStart(save: SaveGame, questId: QuestId): boolean {
    if (save.quests[questId]) return false;
    const quest = DataRegistry.quest(questId);
    return ConditionService.matchesAll(save, quest.prerequisites ?? []);
  }

  static start(save: SaveGame, questId: QuestId): boolean {
    if (!this.canStart(save, questId)) return false;
    const quest = DataRegistry.quest(questId);
    save.quests[questId] = {
      status: 'active',
      objectiveProgress: Object.fromEntries(quest.objectives.map((objective) => [objective.id, 0]))
    };
    this.applyRewards(save, quest.startRewards);

    if ((save.inventory['echo-linker-hextech'] ?? 0) > 0) {
      save.artifactLevels['echo-linker-hextech'] = Math.max(1, save.artifactLevels['echo-linker-hextech'] ?? 1);
    }
    return true;
  }

  static recordEvent(save: SaveGame, event: QuestEvent): QuestId[] {
    if (event.type === 'talk' && event.targetId) WorldStateService.recordNpcSpoken(save, event.targetId);

    const advanced: QuestId[] = [];
    for (const quest of DataRegistry.quests()) {
      const progress = save.quests[quest.id];
      if (!progress || progress.status !== 'active') continue;

      let changed = false;
      for (const objective of quest.objectives) {
        if (objective.type !== event.type) continue;
        if (objective.targetId && objective.targetId !== event.targetId) continue;
        const before = progress.objectiveProgress[objective.id] ?? 0;
        const after = Math.min(objective.required, before + Math.max(1, event.amount ?? 1));
        if (after !== before) {
          progress.objectiveProgress[objective.id] = after;
          changed = true;
        }
      }

      if (changed) {
        if (this.objectivesComplete(quest, progress)) progress.status = 'ready';
        advanced.push(quest.id);
      }
    }
    return advanced;
  }

  static complete(save: SaveGame, questId: QuestId): boolean {
    const progress = save.quests[questId];
    if (!progress || progress.status !== 'ready') return false;
    const quest = DataRegistry.quest(questId);
    progress.status = 'completed';
    this.applyRewards(save, quest.rewards);
    return true;
  }

  static objectivesComplete(quest: QuestDefinition, progress: QuestProgressState): boolean {
    return quest.objectives.every((objective) => (progress.objectiveProgress[objective.id] ?? 0) >= objective.required);
  }

  static statusLabel(save: SaveGame, questId: QuestId): string {
    const progress = save.quests[questId];
    if (!progress) return this.canStart(save, questId) ? 'NO INICIADA' : 'BLOQUEADA';
    if (progress.status === 'active') return 'ACTIVA';
    if (progress.status === 'ready') return 'LISTA PARA ENTREGAR';
    return 'COMPLETADA';
  }

  private static applyRewards(save: SaveGame, rewards?: QuestRewardDefinition): void {
    if (!rewards) return;
    if (rewards.gold) save.gold += rewards.gold;
    for (const [itemId, quantity] of Object.entries(rewards.items ?? {})) {
      InventoryService.add(save, itemId, quantity);
    }
    for (const recipeId of rewards.unlockRecipes ?? []) {
      if (!save.unlockedRecipes.includes(recipeId)) save.unlockedRecipes.push(recipeId);
    }
  }
}
