import type { RecipeDefinition, RecipeId } from '../../data/types';
import type { SaveGame } from '../../state/GameState';
import { InventoryService } from '../inventory/InventoryService';

export interface CraftResult {
  ok: boolean;
  message: string;
}

export class CraftingService {
  static isUnlocked(save: SaveGame, recipe: RecipeDefinition): boolean {
    if (save.worldProgress.flags.includes('story:campaign')) {
      return save.unlockedRecipes.includes(recipe.id);
    }
    return recipe.unlockedByDefault || save.unlockedRecipes.includes(recipe.id);
  }

  static unlock(save: SaveGame, recipeId: RecipeId): boolean {
    if (save.unlockedRecipes.includes(recipeId)) return false;
    save.unlockedRecipes.push(recipeId);
    return true;
  }

  static missingIngredients(save: SaveGame, recipe: RecipeDefinition): Array<{ itemId: string; missing: number }> {
    return recipe.ingredients
      .map((ingredient) => ({
        itemId: ingredient.itemId,
        missing: Math.max(0, ingredient.quantity - InventoryService.quantity(save, ingredient.itemId))
      }))
      .filter((entry) => entry.missing > 0);
  }

  static canCraft(save: SaveGame, recipe: RecipeDefinition): boolean {
    return this.isUnlocked(save, recipe) && this.missingIngredients(save, recipe).length === 0;
  }

  static craft(save: SaveGame, recipe: RecipeDefinition): CraftResult {
    if (!this.isUnlocked(save, recipe)) {
      return { ok: false, message: recipe.unlockHint ?? 'Esta receta aún está bloqueada.' };
    }

    const missing = this.missingIngredients(save, recipe);
    if (missing.length > 0) {
      return { ok: false, message: 'No tienes todos los componentes necesarios.' };
    }

    recipe.ingredients.forEach((ingredient) => {
      InventoryService.remove(save, ingredient.itemId, ingredient.quantity);
    });
    InventoryService.add(save, recipe.resultItemId, recipe.resultQuantity);
    return { ok: true, message: `${recipe.name} fabricado.` };
  }
}
