import { DataRegistry } from '../../data/DataRegistry';
import type {
  QuestDefinition,
  QuestId,
  QuestObjectiveDefinition,
  QuestRewardDefinition,
  QuestStepDefinition,
  QuestObjectiveType
} from '../../data/types';
import type { QuestProgressState, SaveGame } from '../../state/GameState';
import { InventoryService } from '../inventory/InventoryService';
import { ConditionService } from '../world/ConditionService';
import { WorldActionService } from '../world/WorldActionService';
import { WorldStateService } from '../world/WorldStateService';

export interface QuestEvent {
  type: QuestObjectiveType;
  targetId?: string;
  amount?: number;
}

function stepsForQuest(quest: QuestDefinition): QuestStepDefinition[] {
  if (quest.steps?.length) return quest.steps;
  return [{ id: 'legacy', objectives: quest.objectives ?? [] }];
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
    const allObjectives = stepsForQuest(quest).flatMap((step) => step.objectives);
    save.quests[questId] = {
      status: 'active',
      currentStepIndex: 0,
      objectiveProgress: Object.fromEntries(allObjectives.map((objective) => [objective.id, 0]))
    };
    this.applyRewards(save, quest.startRewards);
    WorldActionService.applyAll(save, quest.startActions);

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

      const objectives = this.activeObjectives(save, quest.id);
      let changed = false;
      for (const objective of objectives) {
        if (objective.type !== event.type) continue;
        if (objective.targetId && objective.targetId !== event.targetId) continue;
        const before = progress.objectiveProgress[objective.id] ?? 0;
        const after = Math.min(objective.required, before + Math.max(1, event.amount ?? 1));
        if (after !== before) {
          progress.objectiveProgress[objective.id] = after;
          changed = true;
        }
      }

      if (!changed) continue;
      this.advanceStepIfReady(quest, progress);
      advanced.push(quest.id);
    }
    return advanced;
  }

  static complete(save: SaveGame, questId: QuestId): boolean {
    const progress = save.quests[questId];
    if (!progress || progress.status !== 'ready') return false;
    const quest = DataRegistry.quest(questId);
    progress.status = 'completed';
    this.applyRewards(save, quest.rewards);
    WorldActionService.applyAll(save, quest.completionActions);
    return true;
  }

  static currentStep(save: SaveGame, questId: QuestId): QuestStepDefinition | undefined {
    const quest = DataRegistry.quest(questId);
    const progress = save.quests[questId];
    const steps = stepsForQuest(quest);
    return steps[progress?.currentStepIndex ?? 0];
  }

  static activeObjectives(save: SaveGame, questId: QuestId): QuestObjectiveDefinition[] {
    const progress = save.quests[questId];
    if (progress?.status === 'completed' || progress?.status === 'ready') {
      const quest = DataRegistry.quest(questId);
      const steps = stepsForQuest(quest);
      return steps[Math.min(progress.currentStepIndex ?? 0, steps.length - 1)]?.objectives ?? [];
    }
    return this.currentStep(save, questId)?.objectives ?? [];
  }

  static objectivesComplete(quest: QuestDefinition, progress: QuestProgressState): boolean {
    const steps = stepsForQuest(quest);
    const step = steps[Math.min(progress.currentStepIndex ?? 0, steps.length - 1)];
    return Boolean(step) && step.objectives.every((objective) => (progress.objectiveProgress[objective.id] ?? 0) >= objective.required);
  }

  static statusLabel(save: SaveGame, questId: QuestId): string {
    const progress = save.quests[questId];
    if (!progress) return this.canStart(save, questId) ? 'NO INICIADA' : 'BLOQUEADA';
    if (progress.status === 'active') {
      const quest = DataRegistry.quest(questId);
      const steps = stepsForQuest(quest);
      if (steps.length > 1) return `ACTIVA · PASO ${(progress.currentStepIndex ?? 0) + 1}/${steps.length}`;
      return 'ACTIVA';
    }
    if (progress.status === 'ready') return 'LISTA PARA ENTREGAR';
    return 'COMPLETADA';
  }

  private static advanceStepIfReady(quest: QuestDefinition, progress: QuestProgressState): void {
    if (!this.objectivesComplete(quest, progress)) return;
    const steps = stepsForQuest(quest);
    const current = progress.currentStepIndex ?? 0;
    if (current < steps.length - 1) {
      progress.currentStepIndex = current + 1;
      return;
    }
    progress.status = 'ready';
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
