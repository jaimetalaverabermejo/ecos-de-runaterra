import { ConsoleFocusController } from '../input/ConsoleFocusController';
import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { RecipeDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { CraftingService } from '../systems/crafting/CraftingService';
import { InventoryService } from '../systems/inventory/InventoryService';
import { QuestService } from '../systems/quests/QuestService';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
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
    configureSceneLayout(this, 'native-960');
    if (!this.registry.get('shop.activeId')) {
      this.scene.start('WorldScene');
      return;
    }

    this.save = this.registry.get('save') as SaveGame;
    const requested = this.registry.get('crafting.selected') as string | undefined;
    const recipes = this.recipes();
    this.selectedRecipeId = recipes.find(recipe => recipe.id === requested)?.id ?? recipes[0]?.id ?? '';

    Ui960Kit.backdrop(this, 'bandle-bg', 0x48646d, 0.28, 0.72);
    this.drawHeader();
    this.drawRecipes();
    this.drawRecipeDetail();
    this.drawFooter();
  }

  update(): void {
    ConsoleFocusController.updateScene(this, () => { this.scene.start('ShopScene'); });
  }

  private drawHeader(): void {
    const vendorName = (this.registry.get('shop.vendorName') as string | undefined) ?? 'Mercader';
    Ui960Kit.header(
      this,
      'TALLER RÚNICO',
      `${vendorName.toUpperCase()} · RECETAS Y CRAFTEO`,
      `${this.recipes().length} RECETAS DESCUBIERTAS`
    );
  }

  private drawRecipes(): void {
    Ui960Kit.panel(this, 34, 112, 330, 342, { alpha: 0.96 });
    Ui960Kit.label(this, 56, 130, 'RECETARIO', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 199, 164, 276);

    const recipes = this.recipes();
    const page = Math.floor(Math.max(0, recipes.findIndex(recipe => recipe.id === this.selectedRecipeId)) / 6);
    const pages = Math.ceil(recipes.length / 6);
    const movePage = (delta: number) => {
      const next = recipes[(page + delta) * 6];
      if (next) { this.registry.set('crafting.selected', next.id); this.scene.restart(); }
    };
    Ui960Kit.button(this, 270, 145, 28, 24, '‹', () => movePage(-1), { disabled: page === 0 });
    Ui960Kit.button(this, 318, 145, 28, 24, '›', () => movePage(1), { disabled: page >= pages - 1 });
    recipes.slice(page * 6, page * 6 + 6).forEach((recipe, index) => {
      const unlocked = CraftingService.isUnlocked(this.save, recipe);
      const selected = recipe.id === this.selectedRecipeId;
      const y = 188 + index * 43;
      const result = DataRegistry.item(recipe.resultItemId);
      const box = Ui960Kit.panel(this, 54, y, 290, 36, { selected, alt: true, alpha: 0.94 });
      box.setInteractive({ useHandCursor: true });
      drawItemIcon(this, result, 78, y + 18, 28, selected);
      Ui960Kit.label(this, 102, y + 5, unlocked ? recipe.name : `🔒 ${recipe.name}`, '11px', unlocked ? UI.text.primary : UI.text.muted, true).setWordWrapWidth(180, true);
      box.on(Phaser.Input.Events.POINTER_UP, () => {
        this.registry.set('crafting.selected', recipe.id);
        this.scene.restart();
      });
    });
  }

  private drawRecipeDetail(): void {
    Ui960Kit.panel(this, 380, 112, 546, 342, { alpha: 0.96 });
    const recipe = this.recipes().find(recipe => recipe.id === this.selectedRecipeId);
    if (!recipe) {
      Ui960Kit.label(this, 653, 220, 'Aún no has descubierto ninguna receta.', UI960_FONT.body, UI.text.secondary, true).setOrigin(0.5);
      return;
    }
    const unlocked = CraftingService.isUnlocked(this.save, recipe);
    const result = DataRegistry.item(recipe.resultItemId);

    Ui960Kit.label(this, 402, 130, unlocked ? recipe.name.toUpperCase() : 'RECETA BLOQUEADA', UI960_FONT.heading, unlocked ? UI.text.primary : UI.text.gold, true);
    Ui960Kit.separator(this, 653, 164, 490);
    Ui960Kit.slot(this, 448, 226, 104, true);
    drawItemIcon(this, result, 448, 226, 86, true);
    Ui960Kit.label(this, 520, 194, result.tier.toUpperCase(), UI960_FONT.tiny, result.tier === 'legendary' ? UI.text.gold : result.tier === 'epic' ? UI.text.purple : UI.text.accent, true);
    Ui960Kit.label(this, 520, 224, unlocked ? result.name : '????????', UI960_FONT.body, unlocked ? UI.text.primary : UI.text.muted, true).setWordWrapWidth(356, true);
    Ui960Kit.label(this, 520, 258, unlocked ? (result.description ?? '') : (recipe.unlockHint ?? 'Debes descubrir esta receta.'), UI960_FONT.tiny, UI.text.secondary).setWordWrapWidth(356, true);

    Ui960Kit.label(this, 402, 318, 'COMPONENTES', UI960_FONT.small, UI.text.accent, true);
    recipe.ingredients.slice(0, 4).forEach((ingredient, index) => {
      const item = DataRegistry.item(ingredient.itemId);
      const owned = InventoryService.quantity(this.save, ingredient.itemId);
      const enough = owned >= ingredient.quantity;
      const y = 350 + index * 28;
      Ui960Kit.label(this, 412, y, item.name, UI960_FONT.small, unlocked ? UI.text.primary : UI.text.muted, true);
      Ui960Kit.label(this, 770, y, unlocked ? `${owned}/${ingredient.quantity}` : `?/${ingredient.quantity}`, UI960_FONT.small, unlocked && enough ? UI.text.accent : UI.text.danger, true).setOrigin(1, 0);
    });

    Ui960Kit.label(this, 590, 431, `Ensamblaje: ${recipe.goldCost ?? 0} oro · Tienes ${this.save.gold}`, UI960_FONT.tiny, this.save.gold >= (recipe.goldCost ?? 0) ? UI.text.gold : UI.text.danger, true).setOrigin(0.5, 0);
    const canCraft = CraftingService.canCraft(this.save, recipe);
    Ui960Kit.button(this, 844, 420, 150, 40, unlocked ? 'FABRICAR' : 'BLOQUEADO', () => this.craft(recipe), {
      selected: canCraft,
      disabled: !canCraft,
      fontSize: UI960_FONT.small
    });
  }

  private drawFooter(): void {
    Ui960Kit.separator(this, 480, 480, 870);
    this.statusText = Ui960Kit.label(this, 44, 498, 'El taller sólo está disponible al visitar al mercader.', UI960_FONT.tiny, UI.text.secondary, true);
    Ui960Kit.button(this, 748, 505, 132, 40, 'TIENDA', () => this.scene.start('ShopScene'), { selected: true, fontSize: UI960_FONT.small });
    Ui960Kit.button(this, 878, 505, 110, 40, 'SALIR', () => this.closeWorkshop(), { fontSize: UI960_FONT.small });
  }

  private recipes(): RecipeDefinition[] {
    return DataRegistry.recipes().filter(recipe => CraftingService.isUnlocked(this.save, recipe));
  }

  private craft(recipe: RecipeDefinition): void {
    const result = CraftingService.craft(this.save, recipe);
    if (result.ok) {
      QuestService.recordEvent(this.save, {
        type: 'item',
        targetId: recipe.resultItemId,
        amount: recipe.resultQuantity
      });
      SaveService.save(this.save);
    }
    this.statusText.setText(result.message);
    this.time.delayedCall(550, () => this.scene.restart());
  }

  private closeWorkshop(): void {
    SaveService.save(this.save);
    const returnScene = (this.registry.get('shop.returnScene') as string | undefined) ?? 'WorldScene';
    this.clearShopContext();
    this.scene.start(returnScene);
  }

  private clearShopContext(): void {
    this.registry.remove('shop.activeId');
    this.registry.remove('shop.selected');
    this.registry.remove('shop.returnScene');
    this.registry.remove('shop.vendorName');
    this.registry.remove('crafting.selected');
  }
}
