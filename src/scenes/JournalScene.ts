import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { QuestCategory, QuestDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { QuestService } from '../systems/quests/QuestService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class JournalScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedCategory: QuestCategory = 'main';
  private questLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('JournalScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x526b73).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.65).setOrigin(0);

    UiKit.framedPanel(this, 8, 8, 496, 272);
    this.add.rectangle(12, 12, 488, 38, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 24, 17, 'MISIONES', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 24, 37, 'DIARIO DE VIAJE', UI.font.tiny, UI.text.accent, true);

    UiKit.button(this, 85, 62, 126, 22, 'PRINCIPALES', () => this.selectCategory('main'), {
      accent: 'blue', fontSize: UI.font.small
    });
    UiKit.button(this, 221, 62, 126, 22, 'SECUNDARIAS', () => this.selectCategory('side'), {
      accent: 'blue', fontSize: UI.font.small
    });

    this.renderCategory();

    UiKit.button(this, 466, 263, 64, 22, 'ATRÁS', () => this.scene.start('MenuScene'), {
      accent: 'blue', fontSize: UI.font.small
    });
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
    this.questLayer.add(UiKit.label(this, 24, 88, categoryName, UI.font.tiny, UI.text.accent, true));

    if (quests.length === 0) {
      const empty = this.selectedCategory === 'main'
        ? 'Todavía no hay más misiones principales registradas.'
        : 'Todavía no hay misiones secundarias registradas.';
      this.questLayer.add(UiKit.label(this, 256, 157, empty, UI.font.body, UI.text.muted, true).setOrigin(0.5));
      return;
    }

    quests.forEach((quest, index) => this.drawQuest(quest, 22, 104 + index * 150));
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
    objects.push(UiKit.framedPanel(this, x, y, 468, 132, ready || completed));
    objects.push(UiKit.label(this, x + 14, y + 10, quest.title.toUpperCase(), UI.font.heading, started ? UI.text.primary : UI.text.muted, true));
    objects.push(UiKit.label(this, x + 450, y + 10, status, UI.font.tiny, completed ? UI.text.gold : ready ? UI.text.accent : UI.text.secondary, true).setOrigin(1, 0));
    objects.push(UiKit.label(this, x + 14, y + 31, step?.description ?? quest.description, UI.font.tiny, started ? UI.text.secondary : UI.text.muted)
      .setWordWrapWidth(430, true)
      .setLineSpacing(2));

    const objectiveTitle = step?.title ? `OBJETIVOS · ${step.title.toUpperCase()}` : 'OBJETIVOS';
    objects.push(UiKit.label(this, x + 14, y + 68, objectiveTitle, UI.font.small, UI.text.accent, true));
    objectives.forEach((objective, index) => {
      const value = progress?.objectiveProgress[objective.id] ?? 0;
      const done = value >= objective.required;
      objects.push(UiKit.label(this, x + 20, y + 86 + index * 17, `${done ? '◆' : '◇'} ${objective.description}`, UI.font.tiny, done ? UI.text.gold : UI.text.primary, true));
      objects.push(UiKit.label(this, x + 448, y + 86 + index * 17, `${value}/${objective.required}`, UI.font.tiny, done ? UI.text.gold : UI.text.secondary, true).setOrigin(1, 0));
    });

    if (!started && !canStart) {
      objects.push(UiKit.label(this, x + 14, y + 114, 'Aún no se cumplen las condiciones para iniciar esta misión.', UI.font.tiny, UI.text.muted, true));
    } else if (!started) {
      objects.push(UiKit.label(this, x + 14, y + 114, 'Busca al personaje que inicia esta misión.', UI.font.tiny, UI.text.muted, true));
    } else if (ready) {
      objects.push(UiKit.label(this, x + 14, y + 114, 'Objetivos completados. Busca al personaje de entrega.', UI.font.tiny, UI.text.gold, true));
    } else if (completed) {
      objects.push(UiKit.label(this, x + 14, y + 114, 'Completada.', UI.font.tiny, UI.text.gold, true));
    }

    this.questLayer?.add(objects);
  }
}
