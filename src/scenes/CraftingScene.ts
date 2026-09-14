import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { RecipeDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { CraftingService } from '../systems/crafting/CraftingService';
import { InventoryService } from '../systems/inventory/InventoryService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { drawItemIcon } from '../ui/items/ItemIcon';
import { UI } from '../ui/theme/UiTheme';

export class CraftingScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedRecipeId = 'recipe-lost-chapter';
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('CraftingScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.selectedRecipeId = (this.registry.get('crafting.selected') as string | undefined) ?? 'recipe-lost-chapter';

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x48646d).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.64).setOrigin(0);

    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawRecipes();
    this.drawRecipeDetail();
    this.drawFooter();
  }

  private drawHeader(): void {
    this.add.rectangle(10, 10, 492, 36, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 22, 14, 'TALLER RÚNICO', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 22, 33, 'RECETAS Y CRAFTEO', UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 488, 19, `${DataRegistry.recipes().filter((recipe) => CraftingService.isUnlocked(this.save, recipe)).length}/${DataRegistry.recipes().length} recetas`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
  }

  private drawRecipes(): void {
    UiKit.framedPanel(this, 12, 52, 202, 194);
    UiKit.label(this, 24, 59, 'RECETARIO', UI.font.heading, UI.text.primary, true);
    UiKit.runeDivider(this, 112, 77, 160);

    DataRegistry.recipes().forEach((recipe, index) => {
      const unlocked = CraftingService.isUnlocked(this.save, recipe);
      const selected = recipe.id === this.selectedRecipeId;
      const y = 86 + index * 38;
      const result = DataRegistry.item(recipe.resultItemId);
      const box = this.add.rectangle(113, y + 15, 184, 32, selected ? 0x123e55 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      drawItemIcon(this, result, 34, y + 15, 26, selected);
      UiKit.label(this, 54, y + 5, unlocked ? recipe.name : `🔒 ${recipe.name}`, UI.font.small, unlocked ? UI.text.primary : UI.text.muted, true);
      UiKit.label(this, 54, y + 19, unlocked ? this.recipeState(recipe) : 'RECETA BLOQUEADA', UI.font.tiny, unlocked ? UI.text.secondary : UI.text.gold);
      box.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('crafting.selected', recipe.id);
        this.scene.restart();
      });
    });
  }

  private drawRecipeDetail(): void {
    UiKit.framedPanel(this, 220, 52, 280, 194);
    const recipe = DataRegistry.recipe(this.selectedRecipeId);
    const unlocked = CraftingService.isUnlocked(this.save, recipe);
    const result = DataRegistry.item(recipe.resultItemId);

    UiKit.label(this, 232, 59, unlocked ? recipe.name.toUpperCase() : 'RECETA BLOQUEADA', UI.font.heading, unlocked ? UI.text.primary : UI.text.gold, true);
    UiKit.runeDivider(this, 360, 77, 234, !unlocked);
    drawItemIcon(this, result, 258, 111, 54, true);
    UiKit.label(this, 292, 87, result.tier.toUpperCase(), UI.font.tiny, result.tier === 'legendary' ? UI.text.gold : result.tier === 'epic' ? UI.text.purple : UI.text.accent, true);
    UiKit.label(this, 292, 104, unlocked ? result.name : '????????', UI.font.body, unlocked ? UI.text.primary : UI.text.muted, true).setWordWrapWidth(190);
    UiKit.label(this, 292, 126, unlocked ? (result.description ?? '') : (recipe.unlockHint ?? 'Debes descubrir esta receta.'), UI.font.tiny, UI.text.secondary).setWordWrapWidth(190);

    UiKit.label(this, 234, 151, 'COMPONENTES', UI.font.small, UI.text.accent, true);
    recipe.ingredients.forEach((ingredient, index) => {
      const item = DataRegistry.item(ingredient.itemId);
      const owned = InventoryService.quantity(this.save, ingredient.itemId);
      const enough = owned >= ingredient.quantity;
      const y = 170 + index * 21;
      UiKit.label(this, 238, y, `${item.name}`, UI.font.small, unlocked ? UI.text.primary : UI.text.muted, true);
      UiKit.label(this, 482, y, unlocked ? `${owned}/${ingredient.quantity}` : `?/${ingredient.quantity}`, UI.font.small, unlocked && enough ? UI.text.accent : UI.text.danger, true).setOrigin(1, 0);
    });

    const canCraft = CraftingService.canCraft(this.save, recipe);
    UiKit.button(this, 425, 226, 126, 26, unlocked ? 'FABRICAR' : 'BLOQUEADO', () => this.craft(recipe), {
      accent: canCraft ? 'gold' : 'neutral',
      disabled: !canCraft,
      fontSize: UI.font.small
    });
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 254, 454);
    this.statusText = UiKit.label(this, 18, 263, 'Las recetas consumen los componentes indicados.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 395, 269, 70, 22, 'TIENDA', () => this.scene.start('ShopScene'), { accent: 'green', fontSize: UI.font.small });
    UiKit.button(this, 472, 269, 58, 22, 'BOLSA', () => this.scene.start('BagScene'), { accent: 'blue', fontSize: UI.font.small });
  }

  private recipeState(recipe: RecipeDefinition): string {
    return CraftingService.canCraft(this.save, recipe) ? 'LISTO PARA FABRICAR' : 'FALTAN COMPONENTES';
  }

  private craft(recipe: RecipeDefinition): void {
    const result = CraftingService.craft(this.save, recipe);
    if (result.ok) SaveService.save(this.save);
    this.statusText.setText(result.message);
    this.time.delayedCall(550, () => this.scene.restart());
  }
}
