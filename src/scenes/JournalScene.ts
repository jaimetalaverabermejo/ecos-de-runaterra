import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { QuestCategory, QuestDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { QuestService } from '../systems/quests/QuestService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

export class JournalScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedCategory: QuestCategory = 'main';
  private questLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('JournalScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    Ui960Kit.backdrop(this, 'bandle-bg', 0x526b73, 0.28, 0.72);
    Ui960Kit.header(this, 'MISIONES', 'DIARIO DE VIAJE', 'ECOS DE RUNATERRA');

    Ui960Kit.button(this, 350, 126, 220, 44, 'PRINCIPALES', () => this.selectCategory('main'), {
      selected: this.selectedCategory === 'main',
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 610, 126, 220, 44, 'SECUNDARIAS', () => this.selectCategory('side'), {
      selected: this.selectedCategory === 'side',
      fontSize: UI960_FONT.small
    });

    this.renderCategory();
    Ui960Kit.separator(this, 480, 486, 870);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  private selectCategory(category: QuestCategory): void {
    if (this.selectedCategory === category) return;
    this.selectedCategory = category;
    this.renderCategory();
  }

  private renderCategory(): void {
    this.questLayer?.destroy(true);
    this.questLayer = this.add.container(0, 0);

    const quests = DataRegistry.quests().filter((quest) => (quest.category ?? 'side') === this.selectedCategory);
    const categoryName = this.selectedCategory === 'main' ? 'MISIONES PRINCIPALES' : 'MISIONES SECUNDARIAS';
    const title = Ui960Kit.label(this, 52, 162, `${categoryName} · ${quests.length}`, UI960_FONT.tiny, UI.text.accent, true);
    this.questLayer.add(title);

    if (quests.length === 0) {
      const empty = this.selectedCategory === 'main'
        ? 'Todavía no hay más misiones principales registradas.'
        : 'Todavía no hay misiones secundarias registradas.';
      this.questLayer.add(Ui960Kit.label(this, 480, 304, empty, UI960_FONT.body, UI.text.muted, true).setOrigin(0.5));
      return;
    }

    quests.slice(0, 3).forEach((quest, index) => this.drawQuest(quest, 46, 188 + index * 92));
    if (quests.length > 3) {
      this.questLayer.add(Ui960Kit.label(this, 54, 466, `+${quests.length - 3} misiones más. La paginación se añadirá en el pulido final.`, UI960_FONT.tiny, UI.text.muted, true));
    }
  }

  private drawQuest(quest: QuestDefinition, x: number, y: number): void {
    const progress = QuestService.progress(this.save, quest.id);
    const status = QuestService.statusLabel(this.save, quest.id);
    const started = Boolean(progress);
    const completed = progress?.status === 'completed';
    const ready = progress?.status === 'ready';
    const canStart = QuestService.canStart(this.save, quest.id);
    const step = started ? QuestService.currentStep(this.save, quest.id) : quest.steps?.[0];
    const objectives = started ? QuestService.activeObjectives(this.save, quest.id) : (step?.objectives ?? quest.objectives ?? []);

    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(Ui960Kit.panel(this, x, y, 868, 82, { selected: ready || completed, alt: started }));
    objects.push(Ui960Kit.label(this, x + 20, y + 12, quest.title.toUpperCase(), UI960_FONT.small, started ? UI.text.primary : UI.text.muted, true));
    objects.push(Ui960Kit.label(this, x + 844, y + 13, status, UI960_FONT.tiny, completed ? UI.text.gold : ready ? UI.text.accent : UI.text.secondary, true).setOrigin(1, 0));
    objects.push(Ui960Kit.label(this, x + 20, y + 39, step?.description ?? quest.description, UI960_FONT.tiny, started ? UI.text.secondary : UI.text.muted)
      .setWordWrapWidth(460, true));

    const objective = objectives[0];
    if (objective) {
      const value = progress?.objectiveProgress[objective.id] ?? 0;
      const done = value >= objective.required;
      objects.push(Ui960Kit.label(this, x + 520, y + 39, `${done ? '◆' : '◇'} ${objective.description}`, UI960_FONT.tiny, done ? UI.text.gold : UI.text.primary, true).setWordWrapWidth(250, true));
      objects.push(Ui960Kit.label(this, x + 838, y + 39, `${value}/${objective.required}`, UI960_FONT.tiny, done ? UI.text.gold : UI.text.secondary, true).setOrigin(1, 0));
    } else if (!started && !canStart) {
      objects.push(Ui960Kit.label(this, x + 520, y + 39, 'Aún no se cumplen las condiciones.', UI960_FONT.tiny, UI.text.muted, true));
    } else if (!started) {
      objects.push(Ui960Kit.label(this, x + 520, y + 39, 'Busca al personaje que inicia esta misión.', UI960_FONT.tiny, UI.text.muted, true));
    } else if (ready) {
      objects.push(Ui960Kit.label(this, x + 520, y + 39, 'Objetivos completados. Busca al personaje de entrega.', UI960_FONT.tiny, UI.text.gold, true));
    } else if (completed) {
      objects.push(Ui960Kit.label(this, x + 520, y + 39, 'Completada.', UI960_FONT.tiny, UI.text.gold, true));
    }

    this.questLayer?.add(objects);
  }
}
