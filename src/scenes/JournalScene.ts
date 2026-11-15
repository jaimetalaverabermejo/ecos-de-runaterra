import { ConsoleFocusController } from '../input/ConsoleFocusController';
import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { QuestDefinition } from '../data/types';
import { JournalService, type JournalFilter, type JournalGroup } from '../systems/quests/JournalService';
import type { SaveGame } from '../state/GameState';
import { QuestService } from '../systems/quests/QuestService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';


export class JournalScene extends Phaser.Scene {
  private save!: SaveGame;
  private group: JournalGroup = 'main';
  private selectedCategory: JournalFilter = 'active';
  private selectedQuestId: string | null = null;
  private questLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('JournalScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.group = this.registry.get('journal.group') === 'side' ? 'side' : 'main';
    this.selectedCategory = (this.registry.get('journal.filter') as JournalFilter | undefined) ?? 'active';
    this.selectedQuestId = (this.registry.get('journal.quest') as string | undefined) ?? null;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x526b73, 0.28, 0.72);
    Ui960Kit.header(this, 'MISIONES', 'DIARIO DE VIAJE', 'ECOS DE RUNATERRA');

    Ui960Kit.button(this, 365, 105, 210, 34, 'PRINCIPALES', () => this.selectGroup('main'), {
      selected: this.group === 'main', fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 595, 105, 210, 34, 'SECUNDARIAS', () => this.selectGroup('side'), {
      selected: this.group === 'side', fontSize: UI960_FONT.small
    });
    const filters: Array<[JournalFilter, string]> = [['active', 'EN CURSO'], ['available', 'DISPONIBLES'], ['completed', 'COMPLETADAS']];
    filters.forEach(([filter, label], index) => {
      Ui960Kit.button(this, 290 + index * 190, 144, 172, 30, label, () => this.selectCategory(filter), {
        selected: this.selectedCategory === filter, fontSize: UI960_FONT.tiny
      });
    });

    this.renderCategory();
    Ui960Kit.separator(this, 480, 478, 870);
    Ui960Kit.button(this, 866, 505, 126, 40, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  update(): void {
    ConsoleFocusController.updateScene(this, () => { this.scene.start('MenuScene'); });
  }

  private selectGroup(group: JournalGroup): void {
    if (this.group === group) return;
    this.registry.set('journal.group', group);
    this.registry.set('journal.filter', 'active');
    this.resetSelection();
  }

  private resetSelection(): void {
    this.registry.remove('journal.quest');
    this.registry.remove('journal.detail');
    this.scene.restart();
  }

  private selectCategory(category: JournalFilter): void {
    if (this.selectedCategory === category) return;
    this.registry.set('journal.filter', category);
    this.resetSelection();
  }

  private renderCategory(): void {
    this.questLayer?.destroy(true);
    this.questLayer = this.add.container(0, 0);

    const quests = JournalService.entries(this.save, this.selectedCategory, this.group);
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
    quests.slice(page * 4, page * 4 + 4).forEach((quest, index) => this.drawQuestRow(quest, 44, 172 + index * 66));
    const movePage = (delta: number) => {
      const next = quests[(page + delta) * 4];
      if (next) this.selectQuest(next.id);
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
    const row = Ui960Kit.textureButton(this, x + 160, y + 32, 320, 64, '', () => this.selectQuest(quest.id), {
      selected,
      normalTexture: 'ui960a-mission-row',
      selectedTexture: 'ui960a-mission-row-selected',
      fontSize: UI960_FONT.tiny
    });

    Ui960Kit.label(this, x + 18, y + 11, quest.title.toUpperCase(), UI960_FONT.tiny, started ? UI.text.primary : UI.text.secondary, true)
      .setWordWrapWidth(275, true)
      .setDepth(row.button.depth + 1);
    Ui960Kit.label(this, x + 18, y + 46, `${DataRegistry.worldRegion(quest.regionId).name} · ${status}`, '10px', progress?.status === 'completed' ? UI.text.gold : UI.text.accent, true)
      .setDepth(row.button.depth + 1);
  }

  private selectQuest(id: string): void {
    this.registry.set('journal.quest', id);
    this.registry.remove('journal.detail');
    this.scene.restart();
  }

  private drawQuestDetails(quest: QuestDefinition): void {
    const progress = QuestService.progress(this.save, quest.id);
    const started = Boolean(progress);
    const completed = progress?.status === 'completed';
    const ready = progress?.status === 'ready';
    const canStart = QuestService.canStart(this.save, quest.id);
    const step = started ? QuestService.currentStep(this.save, quest.id) : quest.steps?.[0];
    const objectives = started ? QuestService.activeObjectives(this.save, quest.id) : (step?.objectives ?? quest.objectives ?? []);

    this.questLayer?.add(Ui960Kit.frame(this, 'ui960a-mission-detail', 390, 169, 526, 298));
    this.questLayer?.add(Ui960Kit.label(this, 414, 184, JournalService.categoryLabel(quest.category), '11px', UI.text.gold, true));
    const title = Ui960Kit.label(this, 414, 203, quest.title.toUpperCase(), UI960_FONT.heading, UI.text.primary, true).setWordWrapWidth(478, true);
    this.questLayer?.add(title);
    const objective = completed ? undefined : objectives.find(entry => (progress?.objectiveProgress[entry.id] ?? 0) < entry.required) ?? objectives[0];
    const description = completed ? quest.description : step?.description ?? quest.description;
    let separateObjective = false;
    let bodyTop = title.y + title.height + 12;
    const details = Ui960Kit.label(this, 414, bodyTop, '', UI960_FONT.small, UI.text.secondary).setWordWrapWidth(478, true);
    if (objective) {
      const value = progress?.objectiveProgress[objective.id] ?? 0;
      const summary = Ui960Kit.label(this, 414, bodyTop, objective.description, UI960_FONT.tiny, UI.text.primary, true).setWordWrapWidth(410, true);
      separateObjective = summary.getWrappedText().length === 1 && objective.description !== description;
      if (!separateObjective) summary.setText('Objetivo');
      this.questLayer?.add(summary);
      this.questLayer?.add(Ui960Kit.label(this, 890, bodyTop, `${value}/${objective.required}`, UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0));
      bodyTop += summary.height + 12;
    }

    const text = objective && objective.description !== description && !separateObjective
      ? `${objective.description}\n\n${description}`
      : description;
    const lines = details.getWrappedText(text);
    const lineHeight = details.setText('Ag\nAg').height - details.setText('Ag').height;
    const pageSize = Math.max(1, Math.floor((416 - bodyTop) / lineHeight));
    const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
    const page = Math.min(this.registry.get('journal.detail') ?? 0, totalPages - 1);
    details.setY(bodyTop).setText(lines.slice(page * pageSize, (page + 1) * pageSize).join('\n'));
    this.questLayer?.add(details);
    if (totalPages > 1) {
      const changePage = (delta: number) => {
        const next = Phaser.Math.Clamp(page + delta, 0, totalPages - 1);
        if (next === page) return;
        this.registry.set('journal.detail', next);
        this.scene.restart();
      };
      Ui960Kit.button(this, 782, 443, 34, 26, '‹', () => changePage(-1), { disabled: page === 0 });
      Ui960Kit.label(this, 826, 443, `${page + 1}/${totalPages}`, UI960_FONT.tiny, UI.text.secondary).setOrigin(0.5);
      Ui960Kit.button(this, 872, 443, 34, 26, '›', () => changePage(1), { disabled: page === totalPages - 1 });
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
    this.questLayer?.add(Ui960Kit.label(this, 414, 436, stateText, UI960_FONT.tiny, completed || ready ? UI.text.gold : UI.text.accent, true).setWordWrapWidth(325, true));
  }
}
