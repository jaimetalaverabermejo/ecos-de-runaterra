import { DataRegistry } from '../../data/DataRegistry';
import type { SaveGame } from '../../state/GameState';

/** One-time travel rewards also upgrade existing saves without replaying quests. */
export class EconomyProgressionService {
  static restoreLegacyRecipes(save: SaveGame): void {
    if (save.recipeProgression) return;
    const learned = new Set(save.unlockedRecipes);
    if (save.worldProgress.flags.includes('story:campaign') && save.worldProgress.flags.includes('story:ionia-complete')) {
      // These are the plans previously unlocked as a group at the end of Jonia.
      for (const recipe of DataRegistry.recipes()) if (recipe.unlockedByDefault) learned.add(recipe.id);
    }
    if (save.quests['ionia-wandering-wind']?.status === 'completed') learned.add('recipe-speed-legendary');
    save.unlockedRecipes = [...learned];
    save.recipeProgression = 1;
  }

  static sync(save: SaveGame): void {
    const reward = (id: string, eligible: boolean, gold = 0, recipes: string[] = []) => {
      if (!eligible || save.worldProgress.flags.includes(id)) return;
      save.worldProgress.flags.push(id);
      save.gold += gold;
      for (const recipe of recipes) if (!save.unlockedRecipes.includes(recipe)) save.unlockedRecipes.push(recipe);
    };
    reward('economy:corki-workshop-support', Boolean(save.quests['corki-first-epic']), 600);
    reward('economy:bandle-travel-recipe', save.worldProgress.flags.includes('story:ionia-welcome-recipe'), 0, ['recipe-speed-core']);
    reward('economy:sett-phage-recipe', save.quests['ionia-sett-debt']?.status === 'completed', 0, ['recipe-phage']);
    reward('economy:karma-wand-recipe', save.quests['ionia-karma-memory']?.status === 'completed', 0, ['recipe-power-wand']);
    reward('economy:syndra-luden-recipe', save.quests['ionia-unquiet-spheres']?.status === 'completed', 0, ['recipe-power-relic']);
    reward('economy:irelia-trinity-recipe', save.worldProgress.flags.includes('story:ionia-complete'), 0, ['recipe-trinity-force']);
  }
}
