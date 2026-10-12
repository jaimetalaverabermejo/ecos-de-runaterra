import type { SaveGame } from '../../state/GameState';

/** One-time travel rewards also upgrade existing saves without replaying quests. */
export class EconomyProgressionService {
  static sync(save: SaveGame): void {
    const reward = (id: string, eligible: boolean, gold = 0, recipes: string[] = []) => {
      if (!eligible || save.worldProgress.flags.includes(id)) return;
      save.worldProgress.flags.push(id);
      save.gold += gold;
      for (const recipe of recipes) if (!save.unlockedRecipes.includes(recipe)) save.unlockedRecipes.push(recipe);
    };
    reward('economy:corki-workshop-support', Boolean(save.quests['corki-first-epic']), 600);
    reward('economy:bandle-travel-recipe', save.worldProgress.flags.includes('story:kennen-portal-activated') || save.worldProgress.unlockedRegions.includes('ionia'), 0, ['recipe-speed-core']);
    reward('economy:sett-phage-recipe', save.quests['ionia-sett-debt']?.status === 'completed', 0, ['recipe-phage']);
    reward('economy:karma-wand-recipe', save.quests['ionia-karma-memory']?.status === 'completed', 0, ['recipe-power-wand']);
  }
}
