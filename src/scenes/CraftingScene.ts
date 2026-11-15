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


type RecipeTier = 'component' | 'epic' | 'legendary';
const tierNames: Record<RecipeTier, string> = { component: 'Componente', epic: 'Épico', legendary: 'Legendario' };

export class CraftingScene extends Phaser.Scene {
  private save!: SaveGame;
  private crafting = false;
  private tier: RecipeTier = 'epic';
  private selectedRecipeId = 'recipe-lost-chapter';
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('CraftingScene');
  }

  create(): void {
    this.crafting = false;
    this.input.enabled = true;
    configureSceneLayout(this, 'native-960');
    if (!this.registry.get('shop.activeId')) {
      this.scene.start('WorldScene');
      return;
    }

    this.save = this.registry.get('save') as SaveGame;
    const requested = this.registry.get('crafting.selected') as string | undefined;
    const selected = this.discoveredRecipes().find(recipe => recipe.id === requested);
    this.tier = this.registry.get('crafting.tier') ?? (selected ? this.recipeTier(selected) : 'epic');
    const recipes = this.recipes();
    this.selectedRecipeId = recipes.find(recipe => recipe.id === requested)?.id ?? recipes[0]?.id ?? '';

    Ui960Kit.backdrop(this, 'bandle-bg', 0x48646d, 0.28, 0.72);
    this.drawHeader();
    this.drawRecipes();
    this.drawRecipeDetail();
    this.drawFooter();
  }

  update(): void {
    if (this.crafting) return;
    ConsoleFocusController.updateScene(this, () => { this.scene.start('ShopScene'); });
  }

  private drawHeader(): void {
    const vendorName = (this.registry.get('shop.vendorName') as string | undefined) ?? 'Mercader';
    Ui960Kit.header(
      this,
      'TALLER RÚNICO',
      `${vendorName.toUpperCase()} · RECETAS Y CRAFTEO`,
      `${this.discoveredRecipes().length} RECETAS DESCUBIERTAS`
    );
  }

  private drawRecipes(): void {
    Ui960Kit.panel(this, 34, 112, 330, 342, { alpha: 0.96 });
    const tabs: Array<[RecipeTier, string]> = [['epic', 'ÉPICOS'], ['legendary', 'LEGENDARIOS']];
    if (this.discoveredRecipes().some(recipe => this.recipeTier(recipe) === 'component')) tabs.push(['component', 'COMPONENTES']);
    const tabWidth = 294 / tabs.length;
    tabs.forEach(([tier, label], index) => {
      Ui960Kit.button(this, 52 + (index + 0.5) * tabWidth, 139, tabWidth - 6, 30, label, () => {
        if (this.tier === tier) return;
        this.registry.set('crafting.tier', tier);
        this.registry.remove('crafting.selected');
        this.scene.restart();
      }, { selected: this.tier === tier, fontSize: UI960_FONT.tiny });
    });

    const recipes = this.recipes();
    const pageSize = 5;
    const page = Math.floor(Math.max(0, recipes.findIndex(recipe => recipe.id === this.selectedRecipeId)) / pageSize);
    const pages = Math.ceil(recipes.length / pageSize);
    if (!pages) {
      Ui960Kit.label(this, 199, 233, 'Aún no hay recetas\nde esta categoría.', UI960_FONT.small, UI.text.secondary).setOrigin(0.5).setAlign('center');
      return;
    }
    const select = (recipe: RecipeDefinition) => {
      this.registry.set('crafting.selected', recipe.id);
      this.scene.restart();
    };
    const movePage = (delta: number) => {
      const next = recipes[(page + delta) * pageSize];
      if (next) select(next);
    };
    Ui960Kit.button(this, 80, 431, 42, 27, '‹', () => movePage(-1), { disabled: page === 0 });
    Ui960Kit.label(this, 199, 431, `${page + 1}/${pages}`, UI960_FONT.tiny, UI.text.secondary).setOrigin(0.5);
    Ui960Kit.button(this, 317, 431, 42, 27, '›', () => movePage(1), { disabled: page >= pages - 1 });
    recipes.slice(page * pageSize, page * pageSize + pageSize).forEach((recipe, index) => {
      const selected = recipe.id === this.selectedRecipeId;
      const y = 188 + index * 47;
      const result = DataRegistry.item(recipe.resultItemId);
      Ui960Kit.button(this, 199, y, 290, 44, '', () => select(recipe), { selected });
      drawItemIcon(this, result, 79, y, 32, selected);
      Ui960Kit.label(this, 103, y, recipe.name, UI960_FONT.small, UI.text.primary, true)
        .setWordWrapWidth(226, true).setOrigin(0, 0.5);
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
    Ui960Kit.label(this, 520, 194, tierNames[result.tier].toUpperCase(), UI960_FONT.small, result.tier === 'legendary' ? UI.text.gold : result.tier === 'epic' ? UI.text.purple : UI.text.accent, true);
    Ui960Kit.label(this, 520, 224, unlocked ? (result.legendaryPassive ?? result.description ?? '') : (recipe.unlockHint ?? 'Debes descubrir esta receta.'), UI960_FONT.small, UI.text.secondary).setWordWrapWidth(356, true);

    if (unlocked && recipe.craftHint) {
      Ui960Kit.label(this, 520, 291, recipe.craftHint, UI960_FONT.tiny, UI.text.accent).setWordWrapWidth(356, true);
    }

    Ui960Kit.label(this, 402, 310, 'COMPONENTES', UI960_FONT.small, UI.text.accent, true);
    recipe.ingredients.slice(0, 4).forEach((ingredient, index) => {
      const item = DataRegistry.item(ingredient.itemId);
      const owned = InventoryService.quantity(this.save, ingredient.itemId);
      const enough = owned >= ingredient.quantity;
      const y = 334 + index * 22;
      Ui960Kit.label(this, 412, y, item.name, UI960_FONT.small, unlocked ? UI.text.primary : UI.text.muted, true);
      Ui960Kit.label(this, 754, y, unlocked ? `${owned}/${ingredient.quantity}` : `?/${ingredient.quantity}`, UI960_FONT.small, unlocked && enough ? UI.text.accent : UI.text.danger, true).setOrigin(1, 0);
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

  private recipeTier(recipe: RecipeDefinition): RecipeTier {
    return DataRegistry.item(recipe.resultItemId).tier;
  }

  private discoveredRecipes(): RecipeDefinition[] {
    return DataRegistry.recipes().filter(recipe => CraftingService.isUnlocked(this.save, recipe));
  }

  private recipes(): RecipeDefinition[] {
    return this.discoveredRecipes().filter(recipe => this.recipeTier(recipe) === this.tier);
  }

  private craft(recipe: RecipeDefinition): void {
    if (this.crafting) return;
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
    if (result.ok) this.animateCraft(recipe);
    else this.time.delayedCall(550, () => this.scene.restart());
  }

  private animateCraft(recipe: RecipeDefinition): void {
    this.crafting = true;
    this.input.enabled = false;
    this.registry.set('crafting.selected', recipe.id);
    const overlay = this.add.container(0, 0).setDepth(10000);
    overlay.add(this.add.rectangle(480, 270, 960, 540, 0x081722, 0.94));
    const title = this.add.text(480, 120, 'ENSAMBLANDO…', {
      fontFamily: UI.font.family, fontSize: '24px', color: UI.text.gold
    }).setOrigin(0.5);
    overlay.add(title);
    const ring = this.add.circle(480, 270, 82, 0x76dfed, 0.08).setStrokeStyle(2, 0xd8ba70, 0.8);
    overlay.add(ring);
    this.tweens.add({ targets: ring, angle: 180, scale: 0.65, duration: 900 });
    recipe.ingredients.forEach((ingredient, index) => {
      const angle = index * Math.PI * 2 / recipe.ingredients.length - Math.PI / 2;
      const x = 480 + Math.cos(angle) * 150, y = 270 + Math.sin(angle) * 110;
      // Capture all parts, including fallback labels, inside the animated group.
      const before = new Set(this.children.list);
      drawItemIcon(this, DataRegistry.item(ingredient.itemId), x, y, 58, true);
      const parts = this.children.list.filter(child => !before.has(child));
      const ingredientGroup = this.add.container(0, 0, parts);
      overlay.add(ingredientGroup);
      overlay.add(this.add.text(x, y + 42, `×${ingredient.quantity}`, {
        fontFamily: UI.font.family, fontSize: '16px', color: UI.text.primary
      }).setOrigin(0.5));
      this.tweens.add({ targets: ingredientGroup, x: 480 - x, y: 270 - y,
        alpha: 0, duration: 850, delay: 200, ease: 'Cubic.easeIn' });
    });
    this.time.delayedCall(1050, () => {
      title.setText('¡OBJETO FABRICADO!');
      const flash = this.add.circle(480, 270, 18, 0xffedb5, 0.9);
      overlay.add(flash);
      this.tweens.add({ targets: flash, scale: 8, alpha: 0, duration: 450 });
      const before = new Set(this.children.list);
      const item = DataRegistry.item(recipe.resultItemId);
      drawItemIcon(this, item, 480, 270, 104, true);
      overlay.add(this.children.list.filter(child => !before.has(child)));
      overlay.add(this.add.text(480, 370, `${item.name} ×${recipe.resultQuantity}`, {
        fontFamily: UI.font.family, fontSize: '22px', color: UI.text.gold
      }).setOrigin(0.5));
    });
    // The inventory is saved before the effect; a scene interruption cannot duplicate a recipe.
    this.time.delayedCall(2700, () => this.scene.restart());
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
    this.registry.remove('crafting.tier');
  }
}
