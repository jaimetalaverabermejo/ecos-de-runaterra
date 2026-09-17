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
  private selectedQuestId: string | null = null;
  private questLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('JournalScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.selectedCategory = (this.registry.get('journal.category') as QuestCategory | undefined) ?? 'main';
    this.selectedQuestId = (this.registry.get('journal.quest') as string | undefined) ?? null;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x526b73, 0.28, 0.72);
    Ui960Kit.header(this, 'MISIONES', 'DIARIO DE VIAJE', 'ECOS DE RUNATERRA');

    Ui960Kit.button(this, 360, 112, 220, 44, 'PRINCIPALES', () => this.selectCategory('main'), {
      selected: this.selectedCategory === 'main',
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 600, 112, 220, 44, 'SECUNDARIAS', () => this.selectCategory('side'), {
      selected: this.selectedCategory === 'side',
      fontSize: UI960_FONT.small
    });

    this.renderCategory();
    Ui960Kit.separator(this, 480, 478, 870);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  private selectCategory(category: QuestCategory): void {
    if (this.selectedCategory === category) return;
    this.registry.set('journal.category', category);
    this.registry.remove('journal.quest');
    this.scene.restart();
  }

  private renderCategory(): void {
    this.questLayer?.destroy(true);
    this.questLayer = this.add.container(0, 0);

    const quests = DataRegistry.quests().filter((quest) => (quest.category ?? 'side') === this.selectedCategory);
    if (quests.length === 0) {
      this.questLayer.add(Ui960Kit.label(this, 480, 300, 'Todavía no hay misiones registradas en esta categoría.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5));
      return;
    }

    if (!this.selectedQuestId || !quests.some((quest) => quest.id === this.selectedQuestId)) {
      this.selectedQuestId = quests[0].id;
      this.registry.set('journal.quest', this.selectedQuestId);
    }

    quests.slice(0, 4).forEach((quest, index) => this.drawQuestRow(quest, 44, 160 + index * 78));
    const selected = quests.find((quest) => quest.id === this.selectedQuestId) ?? quests[0];
    this.drawQuestDetails(selected);
  }

  private drawQuestRow(quest: QuestDefinition, x: number, y: number): void {
    const progress = QuestService.progress(this.save, quest.id);
    const status = QuestService.statusLabel(this.save, quest.id);
    const selected = quest.id === this.selectedQuestId;
    const started = Boolean(progress);
    const row = Ui960Kit.textureButton(this, x + 160, y + 36, 320, 72, '', () => {
      this.registry.set('journal.quest', quest.id);
      this.scene.restart();
    }, {
      selected,
      normalTexture: 'ui960a-mission-row',
      selectedTexture: 'ui960a-mission-row-selected',
      fontSize: UI960_FONT.tiny
    });

    Ui960Kit.label(this, x + 18, y + 11, quest.title.toUpperCase(), UI960_FONT.small, started ? UI.text.primary : UI.text.secondary, true)
      .setWordWrapWidth(205, true)
      .setDepth(row.button.depth + 1);
    Ui960Kit.label(this, x + 300, y + 14, status, '10px', progress?.status === 'completed' ? UI.text.gold : UI.text.accent, true)
      .setOrigin(1, 0)
      .setDepth(row.button.depth + 1);
  }

  private drawQuestDetails(quest: QuestDefinition): void {
    const progress = QuestService.progress(this.save, quest.id);
    const started = Boolean(progress);
    const completed = progress?.status === 'completed';
    const ready = progress?.status === 'ready';
    const canStart = QuestService.canStart(this.save, quest.id);
    const step = started ? QuestService.currentStep(this.save, quest.id) : quest.steps?.[0];
    const objectives = started ? QuestService.activeObjectives(this.save, quest.id) : (step?.objectives ?? quest.objectives ?? []);

    this.questLayer?.add(Ui960Kit.frame(this, 'ui960a-mission-detail', 430, 150, 420, 300));
    this.questLayer?.add(Ui960Kit.label(this, 458, 174, quest.title.toUpperCase(), UI960_FONT.heading, UI.text.primary, true).setWordWrapWidth(350, true));
    this.questLayer?.add(Ui960Kit.label(this, 458, 222, step?.description ?? quest.description, UI960_FONT.small, UI.text.secondary).setWordWrapWidth(350, true));

    const objective = objectives[0];
    if (objective) {
      const value = progress?.objectiveProgress[objective.id] ?? 0;
      const done = value >= objective.required;
      this.questLayer?.add(this.add.image(640, 344, 'ui960a-mission-objective').setDisplaySize(320, 44));
      this.questLayer?.add(Ui960Kit.label(this, 500, 332, `${done ? '◆' : '◇'} ${objective.description}`, UI960_FONT.tiny, done ? UI.text.gold : UI.text.primary, true).setWordWrapWidth(230, true));
      this.questLayer?.add(Ui960Kit.label(this, 790, 334, `${value}/${objective.required}`, UI960_FONT.tiny, done ? UI.text.gold : UI.text.secondary, true).setOrigin(1, 0));
    }

    const stateText = completed
      ? 'MISIÓN COMPLETADA'
      : ready
        ? 'OBJETIVOS COMPLETADOS · Busca al personaje de entrega.'
        : !started && !canStart
          ? 'Aún no se cumplen las condiciones.'
          : !started
            ? 'Busca al personaje que inicia esta misión.'
            : 'MISIÓN EN CURSO';
    this.questLayer?.add(Ui960Kit.label(this, 458, 404, stateText, UI960_FONT.tiny, completed || ready ? UI.text.gold : UI.text.accent, true).setWordWrapWidth(350, true));
  }
}
