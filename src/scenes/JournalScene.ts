import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { QuestDefinition } from '../data/types';
import { JournalService, type JournalFilter } from '../systems/quests/JournalService';
import type { SaveGame } from '../state/GameState';
import { QuestService } from '../systems/quests/QuestService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

export class JournalScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedCategory: JournalFilter = 'active';
  private selectedQuestId: string | null = null;
  private questLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('JournalScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.selectedCategory = (this.registry.get('journal.filter') as JournalFilter | undefined) ?? 'active';
    this.selectedQuestId = (this.registry.get('journal.quest') as string | undefined) ?? null;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x526b73, 0.28, 0.72);
    Ui960Kit.header(this, 'MISIONES', 'DIARIO DE VIAJE', 'ECOS DE RUNATERRA');

    Ui960Kit.button(this, 250, 112, 210, 44, 'EN CURSO', () => this.selectCategory('active'), {
      selected: this.selectedCategory === 'active',
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 480, 112, 210, 44, 'DISPONIBLES', () => this.selectCategory('available'), {
      selected: this.selectedCategory === 'available',
      fontSize: UI960_FONT.small
    });

    Ui960Kit.button(this, 710, 112, 210, 44, 'COMPLETADAS', () => this.selectCategory('completed'), {
      selected: this.selectedCategory === 'completed', fontSize: UI960_FONT.small
    });

    this.renderCategory();
    Ui960Kit.separator(this, 480, 478, 870);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (direction === 'left' || direction === 'right') {
      const filters: JournalFilter[] = ['active', 'available', 'completed'];
      this.selectCategory(filters[Phaser.Math.Wrap(filters.indexOf(this.selectedCategory) + (direction === 'left' ? -1 : 1), 0, 3)]);
      return;
    }

    if (direction === 'up' || direction === 'down') {
      const quests = JournalService.entries(this.save, this.selectedCategory);
      if (quests.length > 0) {
        const current = Math.max(0, quests.findIndex((quest) => quest.id === this.selectedQuestId));
        const delta = direction === 'up' ? -1 : 1;
        const next = quests[Phaser.Math.Wrap(current + delta, 0, quests.length)];
        this.registry.set('journal.quest', next.id);
        this.scene.restart();
        return;
      }
    }

    ConsoleInput.consumeA();
    if (ConsoleInput.consumeB()) this.scene.start('MenuScene');
  }

  private selectCategory(category: JournalFilter): void {
    if (this.selectedCategory === category) return;
    this.registry.set('journal.filter', category);
    this.registry.remove('journal.quest');
    this.scene.restart();
  }

  private renderCategory(): void {
    this.questLayer?.destroy(true);
    this.questLayer = this.add.container(0, 0);

    const quests = JournalService.entries(this.save, this.selectedCategory);
    if (quests.length === 0) {
      this.questLayer.add(Ui960Kit.label(this, 480, 300, 'Todavía no hay misiones registradas en esta categoría.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5));
      return;
    }

    if (!this.selectedQuestId || !quests.some((quest) => quest.id === this.selectedQuestId)) {
      this.selectedQuestId = quests[0].id;
      this.registry.set('journal.quest', this.selectedQuestId);
    }

    const selectedIndex = quests.findIndex(quest => quest.id === this.selectedQuestId);
    const page = Math.floor(selectedIndex / 4), pages = Math.ceil(quests.length / 4);
    quests.slice(page * 4, page * 4 + 4).forEach((quest, index) => this.drawQuestRow(quest, 44, 156 + index * 72));
    const movePage = (delta: number) => {
      const next = quests[(page + delta) * 4];
      if (next) { this.registry.set('journal.quest', next.id); this.scene.restart(); }
    };
    Ui960Kit.button(this, 80, 458, 50, 28, '‹', () => movePage(-1), { disabled: page === 0 });
    Ui960Kit.label(this, 204, 449, `${page + 1}/${pages}`, UI960_FONT.tiny, UI.text.secondary).setOrigin(0.5, 0);
    Ui960Kit.button(this, 328, 458, 50, 28, '›', () => movePage(1), { disabled: page >= pages - 1 });
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
    Ui960Kit.label(this, x + 18, y + 50, `${DataRegistry.worldRegion(quest.regionId).name} · ${status}`, '10px', progress?.status === 'completed' ? UI.text.gold : UI.text.accent, true)
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
    this.questLayer?.add(Ui960Kit.label(this, 458, 154, JournalService.categoryLabel(quest.category), '10px', UI.text.gold, true));
    this.questLayer?.add(Ui960Kit.label(this, 458, 174, quest.title.toUpperCase(), UI960_FONT.heading, UI.text.primary, true).setWordWrapWidth(350, true));
    this.questLayer?.add(Ui960Kit.label(this, 458, 222, completed ? quest.description : step?.description ?? quest.description, UI960_FONT.small, UI.text.secondary).setWordWrapWidth(350, true));

    const objective = completed ? undefined : objectives.find(objective => (progress?.objectiveProgress[objective.id] ?? 0) < objective.required) ?? objectives[0];
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
