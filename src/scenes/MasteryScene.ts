import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { SaveService } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

interface MasterySceneData {
  partyIndex?: number;
}

const SLOT_LABELS: Record<ActiveSkillSlot, string> = { q: 'Q', w: 'W', e: 'E', r: 'R' };
const SLOTS: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];

export class MasteryScene extends Phaser.Scene {
  private save!: SaveGame;
  private partyIndex = 0;
  private consoleSkillIndex = 0;

  constructor() {
    super('MasteryScene');
  }

  init(data: MasterySceneData): void {
    this.partyIndex = data.partyIndex ?? 0;
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.consoleSkillIndex = Phaser.Math.Clamp(Number(this.registry.get('mastery.consoleIndex') ?? 0), 0, SLOTS.length - 1);
    const champion = this.save.party[this.partyIndex];
    if (!champion) {
      this.scene.start('TeamScene');
      return;
    }

    Ui960Kit.backdrop(this, 'bandle-bg', 0x48646d, 0.28, 0.72);
    this.drawHeader(champion);
    this.drawSkills(champion);
    this.drawFooter(champion);
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (direction === 'up' || direction === 'down') {
      const delta = direction === 'up' ? -1 : 1;
      this.registry.set('mastery.consoleIndex', Phaser.Math.Wrap(this.consoleSkillIndex + delta, 0, SLOTS.length));
      this.scene.restart({ partyIndex: this.partyIndex });
      return;
    }
    if (ConsoleInput.consumeA()) this.allocatePoint(SLOTS[this.consoleSkillIndex]);
    if (ConsoleInput.consumeB()) this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex });
  }

  private drawHeader(champion: ChampionInstance): void {
    const definition = DataRegistry.champion(champion.championId);
    const required = ProgressionService.experienceToNext(champion.mastery);
    Ui960Kit.header(this, `${definition.name.toUpperCase()} · MAESTRÍA ${champion.mastery}`, required > 0 ? `EXP ${champion.masteryExperience} / ${required}` : 'MAESTRÍA MÁXIMA', `PUNTOS ${champion.unspentSkillPoints}`);
    Ui960Kit.progress(this, 560, 75, 270, 12, ProgressionService.experienceRatio(champion), UI.colors.blue);
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
      const y = 116 + index * 86;

      Ui960Kit.panel(this, 44, y, 872, 72, { alt: unlocked, alpha: 0.96, selected: canSpend });
      if (index === this.consoleSkillIndex) Ui960Kit.label(this, 28, y + 24, '◆', UI960_FONT.small, UI.text.gold, true);
      Ui960Kit.slot(this, 92, y + 36, 54, unlocked);
      Ui960Kit.label(this, 92, y + 20, SLOT_LABELS[slot], UI960_FONT.heading, unlocked ? UI.text.gold : UI.text.muted, true).setOrigin(0.5, 0);

      Ui960Kit.label(this, 132, y + 12, unlocked ? skill.name : `${skill.name} · BLOQUEADA`, UI960_FONT.body, unlocked ? UI.text.primary : UI.text.muted, true);
      Ui960Kit.label(this, 132, y + 42, unlocked ? `Rango ${rank}/${maxRank}` : `Se desbloquea en M${skill.unlockMastery}`, UI960_FONT.tiny, unlocked ? UI.text.accent : UI.text.secondary, true);

      for (let rankIndex = 0; rankIndex < maxRank; rankIndex += 1) {
        const filled = rankIndex < rank;
        const cx = 590 + rankIndex * 38;
        this.add.circle(cx, y + 35, 9, filled ? UI.colors.gold : 0x102538, 1).setStrokeStyle(2, filled ? UI.colors.gold : UI.colors.borderSoft);
      }

      if (rank >= maxRank) {
        Ui960Kit.label(this, 870, y + 22, 'MAX', UI960_FONT.small, UI.text.gold, true).setOrigin(0.5, 0);
        return;
      }

      const gateText = nextGate !== null && champion.mastery < nextGate
        ? `M${nextGate}`
        : champion.unspentSkillPoints > 0
          ? '+1'
          : 'SIN PTS';

      Ui960Kit.button(this, 862, y + 36, 92, 38, gateText, () => this.allocatePoint(slot), {
        selected: canSpend,
        disabled: !canSpend,
        fontSize: UI960_FONT.tiny
      });
    });
  }

  private drawFooter(champion: ChampionInstance): void {
    Ui960Kit.separator(this, 480, 474, 870);
    const message = champion.mastery < 8
      ? 'Q, W, E y R se desbloquean automáticamente hasta M8.'
      : champion.unspentSkillPoints > 0
        ? 'Tienes puntos disponibles. Elige qué habilidad mejorar.'
        : 'Los próximos puntos llegan al avanzar Maestría.';
    Ui960Kit.label(this, 44, 497, message, UI960_FONT.tiny, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.secondary, true);
    Ui960Kit.button(this, 868, 505, 126, 40, 'ATRÁS', () => this.scene.start('ChampionDetailScene', { partyIndex: this.partyIndex }), { fontSize: UI960_FONT.small });
  }

  private allocatePoint(slot: ActiveSkillSlot): void {
    const champion = this.save.party[this.partyIndex];
    if (!champion || !ProgressionService.spendSkillPoint(champion, slot)) return;
    SaveService.save(this.save);
    this.scene.restart({ partyIndex: this.partyIndex });
  }
}
