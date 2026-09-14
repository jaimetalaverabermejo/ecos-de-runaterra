import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

interface MasterySceneData {
  partyIndex?: number;
}

const SLOT_LABELS: Record<ActiveSkillSlot, string> = { q: 'Q', w: 'W', e: 'E', r: 'R' };
const SLOTS: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];

export class MasteryScene extends Phaser.Scene {
  private save!: SaveGame;
  private partyIndex = 0;

  constructor() {
    super('MasteryScene');
  }

  init(data: MasterySceneData): void {
    this.partyIndex = data.partyIndex ?? 0;
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const champion = this.save.party[this.partyIndex];
    if (!champion) {
      this.scene.start('TeamScene');
      return;
    }

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x48646d).setAlpha(0.3);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.68).setOrigin(0);

    UiKit.framedPanel(this, 8, 8, 496, 272);
    this.drawHeader(champion);
    this.drawSkills(champion);
    this.drawFooter(champion);
  }

  private drawHeader(champion: ChampionInstance): void {
    const definition = DataRegistry.champion(champion.championId);
    const required = ProgressionService.experienceToNext(champion.mastery);

    this.add.rectangle(12, 12, 488, 48, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 24, 17, `${definition.name.toUpperCase()} · MAESTRÍA ${champion.mastery}`, UI.font.title, UI.text.primary, true);
    UiKit.label(this, 24, 39, required > 0 ? `EXP ${champion.masteryExperience} / ${required}` : 'MAESTRÍA MÁXIMA', UI.font.tiny, UI.text.secondary, true);
    UiKit.progressBar(this, 196, 45, 190, 7, ProgressionService.experienceRatio(champion), UI.colors.blue);
    UiKit.label(this, 486, 20, `PUNTOS ${champion.unspentSkillPoints}`, UI.font.heading, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.muted, true).setOrigin(1, 0);
    UiKit.label(this, 486, 40, 'Q/W/E 5 · R 3', UI.font.tiny, UI.text.accent, true).setOrigin(1, 0);
  }

  private drawSkills(champion: ChampionInstance): void {
    const definition = DataRegistry.champion(champion.championId);

    SLOTS.forEach((slot, index) => {
      const skillId = definition.skillIds[index];
      const skill = DataRegistry.skill(skillId);
      const rank = champion.skillRanks[slot];
      const maxRank = ProgressionService.maxRank(slot);
      const unlocked = rank > 0;
      const canSpend = ProgressionService.canSpendSkillPoint(champion, slot);
      const nextRank = Math.min(maxRank, rank + 1);
      const nextGate = rank >= maxRank ? null : ProgressionService.masteryRequiredForRank(slot, nextRank);
      const y = 70 + index * 44;

      this.add.rectangle(18, y, 476, 38, unlocked ? UI.colors.panelAlt : 0x091926, 0.98)
        .setOrigin(0)
        .setStrokeStyle(2, unlocked ? UI.colors.borderSoft : 0x294154);
      this.add.rectangle(42, y + 19, 34, 30, unlocked ? 0x153d54 : 0x0b1c29, 1)
        .setStrokeStyle(2, unlocked ? UI.colors.gold : UI.colors.borderSoft);
      UiKit.label(this, 42, y + 9, SLOT_LABELS[slot], UI.font.heading, unlocked ? UI.text.gold : UI.text.muted, true).setOrigin(0.5, 0);

      UiKit.label(this, 68, y + 6, unlocked ? skill.name : `${skill.name} · BLOQUEADA`, UI.font.body, unlocked ? UI.text.primary : UI.text.muted, true);
      UiKit.label(this, 68, y + 23, unlocked ? `Rango ${rank}/${maxRank}` : `Se desbloquea en M${skill.unlockMastery}`, UI.font.tiny, unlocked ? UI.text.accent : UI.text.secondary, true);

      const gates = Array.from({ length: maxRank }, (_, rankIndex) => {
        const filled = rankIndex < rank;
        const cx = 278 + rankIndex * 22;
        this.add.circle(cx, y + 19, 6, filled ? UI.colors.gold : 0x102538, 1)
          .setStrokeStyle(1, filled ? UI.colors.gold : UI.colors.borderSoft);
        return cx;
      });
      void gates;

      if (rank >= maxRank) {
        UiKit.label(this, 464, y + 12, 'MAX', UI.font.small, UI.text.gold, true).setOrigin(0.5, 0);
        return;
      }

      const gateText = nextGate !== null && champion.mastery < nextGate
        ? `M${nextGate}`
        : champion.unspentSkillPoints > 0
          ? '+1'
          : 'SIN PTS';

      UiKit.button(this, 458, y + 19, 58, 26, gateText, () => this.allocatePoint(slot), {
        accent: canSpend ? 'gold' : 'neutral',
        disabled: !canSpend,
        fontSize: UI.font.tiny
      });
    });
  }

  private drawFooter(champion: ChampionInstance): void {
    UiKit.runeDivider(this, 256, 252, 454);
    const message = champion.mastery < 8
      ? 'Q, W, E y R se desbloquean automáticamente hasta M8.'
      : champion.unspentSkillPoints > 0
        ? 'Tienes puntos disponibles. Elige qué habilidad mejorar.'
        : 'Los próximos puntos llegan al avanzar Maestría.';
    UiKit.label(this, 22, 262, message, UI.font.tiny, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.secondary, true);
    UiKit.button(this, 470, 268, 58, 22, 'ATRÁS', () => this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex }), {
      accent: 'blue', fontSize: UI.font.tiny
    });
  }

  private allocatePoint(slot: ActiveSkillSlot): void {
    const champion = this.save.party[this.partyIndex];
    if (!champion || !ProgressionService.spendSkillPoint(champion, slot)) return;
    SaveService.save(this.save);
    this.scene.restart({ partyIndex: this.partyIndex });
  }
}
