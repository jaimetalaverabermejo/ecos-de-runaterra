import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { QuestDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { QuestService } from '../systems/quests/QuestService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class JournalScene extends Phaser.Scene {
  private save!: SaveGame;

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

    const quests = DataRegistry.quests();
    if (quests.length === 0) {
      UiKit.label(this, 256, 140, 'Todavía no hay misiones registradas.', UI.font.body, UI.text.muted, true).setOrigin(0.5);
    } else {
      quests.forEach((quest, index) => this.drawQuest(quest, 22, 64 + index * 150));
    }

    UiKit.button(this, 466, 263, 64, 22, 'ATRÁS', () => this.scene.start('MenuScene'), {
      accent: 'blue', fontSize: UI.font.small
    });
  }

  private drawQuest(quest: QuestDefinition, x: number, y: number): void {
    const progress = QuestService.progress(this.save, quest.id);
    const status = QuestService.statusLabel(this.save, quest.id);
    const started = Boolean(progress);
    const completed = progress?.status === 'completed';
    const ready = progress?.status === 'ready';

    UiKit.framedPanel(this, x, y, 468, 132, ready || completed);
    UiKit.label(this, x + 14, y + 10, quest.title.toUpperCase(), UI.font.heading, started ? UI.text.primary : UI.text.muted, true);
    UiKit.label(this, x + 450, y + 10, status, UI.font.tiny, completed ? UI.text.gold : ready ? UI.text.accent : UI.text.secondary, true).setOrigin(1, 0);
    UiKit.label(this, x + 14, y + 31, quest.description, UI.font.tiny, started ? UI.text.secondary : UI.text.muted)
      .setWordWrapWidth(430, true)
      .setLineSpacing(2);

    UiKit.label(this, x + 14, y + 68, 'OBJETIVOS', UI.font.small, UI.text.accent, true);
    quest.objectives.forEach((objective, index) => {
      const value = progress?.objectiveProgress[objective.id] ?? 0;
      const done = value >= objective.required;
      UiKit.label(this, x + 20, y + 86 + index * 17, `${done ? '◆' : '◇'} ${objective.description}`, UI.font.tiny, done ? UI.text.gold : UI.text.primary, true);
      UiKit.label(this, x + 448, y + 86 + index * 17, `${value}/${objective.required}`, UI.font.tiny, done ? UI.text.gold : UI.text.secondary, true).setOrigin(1, 0);
    });

    if (!started) {
      UiKit.label(this, x + 14, y + 114, 'Habla con el Explorador yordle de la Aldea de Bandle para comenzar.', UI.font.tiny, UI.text.muted, true);
    } else if (ready) {
      UiKit.label(this, x + 14, y + 114, 'Regresa con el Explorador yordle.', UI.font.tiny, UI.text.gold, true);
    } else if (completed) {
      UiKit.label(this, x + 14, y + 114, 'Completada.', UI.font.tiny, UI.text.gold, true);
    }
  }
}
