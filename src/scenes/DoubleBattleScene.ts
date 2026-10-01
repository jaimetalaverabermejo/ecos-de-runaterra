import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import { COMBAT_SKILL_DESCRIPTIONS } from '../data/skills/combatDescriptions';
import type { ActiveSkillSlot, ChampionInstance, SkillDefinition, SkillTarget, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
import {
  defaultSkillTarget,
  type BattleSide,
  type DoubleBattleChoice,
  type DoubleBattleSession,
  type DoubleBattleTurnEntry
} from '../systems/combat/BattleFormat';
import { SpecialEffectEngine, type BattleFormStore, type BattleResourceStore } from '../systems/combat/SpecialEffectEngine';
import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { CombatTempoEngine, type BattleTempoStore } from '../systems/combat/CombatTempoEngine';
import { CombatMechanicsEngine, type CombatMechanicsStore } from '../systems/combat/CombatMechanicsEngine';
import { TypeBadge } from '../ui/components/TypeBadge';
import { ProgressionService, type MasteryGainResult } from '../systems/progression/ProgressionService';
import { SanctuaryService } from '../systems/sanctuary/SanctuaryService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

interface DuoCombatant {
  champion: ChampionInstance;
  side: BattleSide;
  slot: number;
  hp: number;
  maxHp: number;
  stats: StatBlock;
  sprite?: Phaser.GameObjects.Image | Phaser.GameObjects.Container;
  hpFill?: Phaser.GameObjects.Rectangle;
  hpText?: Phaser.GameObjects.Text;
  card?: Phaser.GameObjects.Container;
}

const ACTION_WINDUP_MS = 140;
const BETWEEN_ACTIONS_MS = 90;
const ROUND_END_MS = 150;

export class DoubleBattleScene extends Phaser.Scene {
  private save!: SaveGame;
  private session!: DoubleBattleSession;
  private playerActive: DuoCombatant[] = [];
  private enemyActive: DuoCombatant[] = [];
  private playerReserves: ChampionInstance[] = [];
  private enemyReserves: ChampionInstance[] = [];
  private statuses: Record<string, CombatStatusInstance[]> = {};
  private resources: BattleResourceStore = {};
  private forms: BattleFormStore = {};
  private tempo: BattleTempoStore = CombatTempoEngine.createStore();
  private mechanics: CombatMechanicsStore = CombatMechanicsEngine.createStore();
  private selectedChoices: DoubleBattleChoice[] = [];
  private selectionIndex = 0;
  private participantIds = new Set<string>();
  private defeatedEnemyIds = new Set<string>();
  private gains: MasteryGainResult[] = [];
  private messageText!: Phaser.GameObjects.Text;
  private actionObjects: Phaser.GameObjects.GameObject[] = [];
  private targetLayer?: Phaser.GameObjects.Container;
  private continueLayer?: Phaser.GameObjects.Container;
  private battlefieldObjects: Phaser.GameObjects.GameObject[] = [];
  private busy = false;
  private awaitingContinue = false;
  private ended = false;

  constructor() {
    super('DoubleBattleScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    const session = this.registry.get('battle.doubleSession') as DoubleBattleSession | undefined;
    if (!session || session.format !== 'double') {
      this.scene.start('WorldScene');
      return;
    }

    this.session = session;
    this.busy = false;
    this.awaitingContinue = false;
    this.ended = false;
    this.selectedChoices = [];
    this.selectionIndex = 0;
    this.participantIds.clear();
    this.defeatedEnemyIds.clear();
    this.gains = [];
    this.statuses = {};
    this.resources = {};
    this.forms = {};
    this.tempo = CombatTempoEngine.createStore();
    this.mechanics = CombatMechanicsEngine.createStore();

    const playerTeam = session.playerTeam.filter((entry) => entry.currentHp > 0);
    const enemyTeam = session.enemyTeam.filter((entry) => entry.currentHp > 0);
    if (playerTeam.length < 2 || enemyTeam.length < 2) {
      this.registry.remove('battle.doubleSession');
      this.scene.start(session.returnScene || 'WorldScene');
      return;
    }

    this.playerActive = playerTeam.slice(0, 2).map((champion, slot) => this.makeCombatant(champion, 'player', slot));
    this.enemyActive = enemyTeam.slice(0, 2).map((champion, slot) => this.makeCombatant(champion, 'enemy', slot));
    this.playerReserves = playerTeam.slice(2);
    this.enemyReserves = enemyTeam.slice(2);

    for (const combatant of [...this.playerActive, ...this.enemyActive]) {
      this.initializeCombatant(combatant);
    }

    this.drawBattlefield();
    this.renderCombatants();
    this.beginSelectionRound();
  }

  private makeCombatant(champion: ChampionInstance, side: BattleSide, slot: number): DuoCombatant {
    const normalized = ProgressionService.normalizeChampion(champion);
    const stats = BattleEngine.statsFor(normalized);
    const hp = Phaser.Math.Clamp(normalized.currentHp, 1, stats.hp);
    normalized.currentHp = hp;
    return { champion: normalized, side, slot, hp, maxHp: stats.hp, stats };
  }

  private initializeCombatant(combatant: DuoCombatant, fromBench = false): void {
    this.statuses[combatant.champion.instanceId] = this.statuses[combatant.champion.instanceId] ?? [];
    SpecialEffectEngine.initializeResources(combatant.champion, this.resources, this.forms);
    CombatTempoEngine.initialize(combatant.champion, this.tempo, fromBench);
    CombatMechanicsEngine.initialize(combatant.champion, this.mechanics);
    if (fromBench) CombatTempoEngine.markBenchEntry(combatant.champion, this.tempo);
    if (combatant.side === 'player') this.participantIds.add(combatant.champion.instanceId);
  }

  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(480, 155, 'bandle-bg').setDisplaySize(960, 310).setTint(0x9bbcae).setAlpha(0.9);
    this.add.rectangle(0, 300, 960, 240, 0x020912, 0.98).setOrigin(0, 0).setDepth(500);
    this.add.image(11, 310, 'battle-ui-960', '04_dialog_panel.png').setOrigin(0, 0).setDepth(700);
    this.add.text(480, 10, this.session.kind === 'sandbox' ? 'LABORATORIO · COMBATE 2V2' : 'COMBATE DOBLE · 2 VS 2', {
      fontFamily: UI.font.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: UI.text.gold
    }).setOrigin(0.5, 0).setDepth(900);

    this.messageText = UiKit.label(this, 42, 329, '', '16px', UI.text.primary, true)
      .setWordWrapWidth(850, true)
      .setLineSpacing(2)
      .setDepth(710);
  }

  private renderCombatants(): void {
    for (const object of this.battlefieldObjects) object.destroy();
    this.battlefieldObjects = [];

    this.playerActive.forEach((combatant, index) => this.renderCombatant(combatant, index));
    this.enemyActive.forEach((combatant, index) => this.renderCombatant(combatant, index));
  }

  private renderCombatant(combatant: DuoCombatant, index: number): void {
    const player = combatant.side === 'player';
    const positions = player
      ? [{ x: 224, y: 294 }, { x: 410, y: 300 }]
      : [{ x: 690, y: 188 }, { x: 828, y: 204 }];
    const cardPositions = player
      ? [{ x: 24, y: 218 }, { x: 310, y: 230 }]
      : [{ x: 18, y: 42 }, { x: 305, y: 54 }];
    const pos = positions[index] ?? positions[0];
    const cardPos = cardPositions[index] ?? cardPositions[0];

    const sprite = this.createCombatVisual(combatant, pos.x, pos.y, 200 + index);
    combatant.sprite = sprite;

    const cardBg = this.add.rectangle(0, 0, 270, 68, 0x0a1c2a, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, player ? 0x4bc5df : 0xb8876c);
    const name = this.add.text(12, 7, DataRegistry.champion(combatant.champion.championId).name.toUpperCase(), {
      fontFamily: UI.font.family,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f8fbff'
    });
    const mastery = this.add.text(222, 8, `M${combatant.champion.mastery}`, {
      fontFamily: UI.font.family,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#70d8ff'
    });
    const hpBack = this.add.rectangle(12, 37, 200, 8, 0x172b36, 1).setOrigin(0, 0.5);
    const hpFill = this.add.rectangle(12, 37, 200, 8, UI.colors.hp, 1).setOrigin(0, 0.5);
    const hpText = this.add.text(220, 30, '', {
      fontFamily: UI.font.family,
      fontSize: '10px',
      color: '#f8fbff'
    });
    const status = this.add.text(12, 50, '', {
      fontFamily: UI.font.family,
      fontSize: '9px',
      color: '#b8d6e5'
    });

    const card = this.add.container(cardPos.x, cardPos.y, [cardBg, name, mastery, hpBack, hpFill, hpText, status]).setDepth(620);
    combatant.card = card;
    combatant.hpFill = hpFill;
    combatant.hpText = hpText;
    this.refreshCombatantUi(combatant, status);

    this.battlefieldObjects.push(sprite, card);
  }

  private refreshCombatantUi(combatant: DuoCombatant, statusLabel?: Phaser.GameObjects.Text): void {
    const formId = SpecialEffectEngine.formId(combatant.champion, this.forms);
    const base = BattleEngine.statsFor(combatant.champion, formId);
    const resourceStats = SpecialEffectEngine.statsWithResources(combatant.champion, base, this.resources, this.forms);
    const tempoStats = CombatTempoEngine.applyStatBonuses(combatant.champion, resourceStats, this.tempo);
    combatant.stats = StatusEngine.effectiveStats(tempoStats, this.statusesFor(combatant));
    combatant.maxHp = combatant.stats.hp;
    combatant.hp = Math.min(combatant.hp, combatant.maxHp);
    combatant.champion.currentHp = Math.max(0, combatant.hp);
    const ratio = Phaser.Math.Clamp(combatant.hp / Math.max(1, combatant.maxHp), 0, 1);
    if (combatant.hpFill) {
      combatant.hpFill.displayWidth = 200 * ratio;
      combatant.hpFill.setFillStyle(ratio > 0.5 ? UI.colors.hp : ratio > 0.2 ? UI.colors.hpMid : UI.colors.hpLow);
    }
    combatant.hpText?.setText(`${Math.max(0, combatant.hp)}/${combatant.maxHp}`);
    statusLabel?.setText(StatusEngine.format(this.statusesFor(combatant)));
  }

  private beginSelectionRound(): void {
    if (this.ended) return;
    this.busy = false;
    this.selectedChoices = [];
    this.selectionIndex = 0;
    this.destroyActionUi();
    this.selectNextPlayerAction();
  }

  private selectNextPlayerAction(): void {
    const alive = this.playerActive.filter((entry) => entry.hp > 0);
    if (this.selectionIndex >= alive.length) {
      void this.executeRound();
      return;
    }

    const actor = alive[this.selectionIndex];
    this.renderActionUi(actor, alive.length);
  }

  private renderActionUi(actor: DuoCombatant, total: number): void {
    this.destroyActionUi();
    const definition = DataRegistry.champion(actor.champion.championId);
    this.setMessage('Elige la acción de ' + definition.name + ' · ' + (this.selectionIndex + 1) + '/' + total + '.');

    const skillIds = CombatMechanicsEngine.skillIds(actor.champion, this.forms, this.mechanics);
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const positions = [32, 192, 352, 512];
    for (let i = 0; i < 4; i += 1) {
      const slot = slots[i];
      const skill = DataRegistry.skill(skillIds[i]);
      const rank = actor.champion.skillRanks[slot];
      const locked = rank <= 0;
      const resourceCheck = SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources);
      const tempoCheck = CombatTempoEngine.canUseSkill(actor.champion, skill, this.tempo);
      const disabled = locked || !resourceCheck.allowed || !tempoCheck.allowed;
      const baseFrame = disabled ? '07_skill_card_disabled.png' : '05_skill_card_base.png';
      const card = this.add.image(positions[i], 420, 'battle-ui-960', baseFrame)
        .setOrigin(0, 0)
        .setDepth(730);
      this.actionObjects.push(card);

      if (!disabled) {
        card.setInteractive({ useHandCursor: true });
        card.on(Phaser.Input.Events.POINTER_OVER, () => card.setFrame('06_skill_card_selected.png'));
        card.on(Phaser.Input.Events.POINTER_OUT, () => card.setFrame('05_skill_card_base.png'));
        card.on(Phaser.Input.Events.POINTER_UP, () => void this.selectSkill(actor, skill));
      }

      const fontSize = skill.name.length > 18 ? '10px' : skill.name.length > 13 ? '11px' : '13px';
      this.actionObjects.push(
        UiKit.label(this, positions[i] + 72, 432, skill.name.toUpperCase(), fontSize, disabled ? UI.text.muted : UI.text.primary, true)
          .setOrigin(0.5, 0)
          .setAlign('center')
          .setWordWrapWidth(118, true)
          .setDepth(735)
      );

      const targetMode = this.skillTargetMode(skill);
      const detail = locked
        ? 'M' + skill.unlockMastery
        : !tempoCheck.allowed
          ? (tempoCheck.short ?? 'NO DISP.')
          : 'R' + rank + ' · ' + this.targetLabel(targetMode);
      this.actionObjects.push(
        UiKit.label(this, positions[i] + 72, 462, detail, '9px', disabled ? UI.text.gold : UI.text.accent, true)
          .setOrigin(0.5, 0)
          .setDepth(735)
      );

      if (skill.affinityId) {
        this.actionObjects.push(TypeBadge.add(this, positions[i] + 22, 480, skill.affinityId, {
          width: 96,
          height: 20,
          iconSize: 14,
          fontSize: '8px',
          alpha: disabled ? 0.35 : 1
        }).setDepth(735));
      }

      const maxRank = ProgressionService.maxRank(slot);
      const dotXs = slot === 'r' ? [52, 68, 84] : [36, 52, 68, 84, 100];
      for (let dot = 0; dot < maxRank; dot += 1) {
        const frame = dot < rank ? '29_rank_dot_filled.png' : '30_rank_dot_empty.png';
        this.actionObjects.push(
          this.add.image(positions[i] + dotXs[dot], 514, 'battle-ui-960', frame)
            .setOrigin(0, 0)
            .setDepth(735)
            .setAlpha(disabled ? 0.45 : 1)
        );
      }

      const info = this.add.rectangle(positions[i] + 132, 432, 18, 18, 0x031523, 0.9)
        .setStrokeStyle(1, 0x70d8ff, 0.75)
        .setDepth(740)
        .setInteractive({ useHandCursor: true });
      const infoLabel = UiKit.label(this, positions[i] + 132, 430, 'i', '11px', UI.text.accent, true)
        .setOrigin(0.5, 0)
        .setDepth(741);
      info.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.openSkillInfo(skill, rank);
      });
      this.actionObjects.push(info, infoLabel);
    }

    const modifierLocked = CombatMechanicsEngine.hasLockedSkillOverride(actor.champion, this.mechanics);
    const labels = [
      SpecialEffectEngine.resourceLabel(actor.champion, this.resources, this.forms),
      CombatTempoEngine.resourceLabel(actor.champion, this.tempo),
      CombatMechanicsEngine.resourceLabel(actor.champion, this.mechanics, this.forms)
    ].filter((value): value is string => Boolean(value));
    if (labels.length > 0) {
      this.actionObjects.push(
        UiKit.label(this, 782, 386, labels.join(' · '), '9px', UI.text.gold, true)
          .setWordWrapWidth(156)
          .setDepth(735)
      );
    }

    const rooted = StatusEngine.isRooted(this.statusesFor(actor));
    const canSwitch = !modifierLocked && !rooted && this.playerReserves.some((entry) => entry.currentHp > 0);
    this.createSandboxSideButton(780, 420, rooted ? 'INMOVILIZ.' : 'CAMBIAR', canSwitch, () => this.showSwitchPicker(actor, total));

    const waitButton = this.add.rectangle(780, 482, 148, 42, modifierLocked ? 0x16232c : UI.colors.panelRaised, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, modifierLocked ? 0x30414d : UI.colors.borderSoft)
      .setDepth(730);
    const waitLabel = UiKit.label(this, 854, 493, 'ESPERAR', '12px', modifierLocked ? UI.text.muted : UI.text.primary, true)
      .setOrigin(0.5, 0)
      .setDepth(735);
    this.actionObjects.push(waitButton, waitLabel);
    if (!modifierLocked) {
      waitButton.setInteractive({ useHandCursor: true });
      waitButton.on(Phaser.Input.Events.POINTER_OVER, () => waitButton.setStrokeStyle(2, UI.colors.gold));
      waitButton.on(Phaser.Input.Events.POINTER_OUT, () => waitButton.setStrokeStyle(2, UI.colors.borderSoft));
      waitButton.on(Phaser.Input.Events.POINTER_UP, () =>
        this.commitPlayerChoice(actor, { type: 'wait' }, 'self', [actor.champion.instanceId])
      );
    }
  }

  private createSandboxSideButton(x: number, y: number, labelText: string, enabled: boolean, onClick: () => void): void {
    const frame = enabled ? '08_side_button_base.png' : '10_side_button_disabled.png';
    const button = this.add.image(x, y, 'battle-ui-960', frame).setOrigin(0, 0).setDepth(730);
    const label = UiKit.label(this, x + 104, y + 14, labelText, labelText.length > 10 ? '11px' : '14px', enabled ? UI.text.primary : UI.text.muted, true)
      .setOrigin(0.5, 0)
      .setDepth(735);
    this.actionObjects.push(button, label);
    if (!enabled) return;
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.POINTER_OVER, () => button.setFrame('09_side_button_selected.png'));
    button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFrame('08_side_button_base.png'));
    button.on(Phaser.Input.Events.POINTER_UP, onClick);
  }

  private openSkillInfo(skill: SkillDefinition, rank: number): void {
    if (this.busy || this.awaitingContinue || this.targetLayer) return;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 650, 280, 0x020912, 0.98).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 190, 158, skill.name.toUpperCase(), '20px', UI.text.primary, true));
    objects.push(UiKit.label(this, 770, 160, rank > 0 ? 'R' + rank : 'M' + skill.unlockMastery, '11px', UI.text.accent, true).setOrigin(1, 0));
    objects.push(
      UiKit.label(this, 190, 202, COMBAT_SKILL_DESCRIPTIONS[skill.id] ?? 'Habilidad de combate del Eco.', '13px', UI.text.secondary, true)
        .setWordWrapWidth(575, true)
        .setLineSpacing(5)
    );
    const tags = this.skillEffectTags(skill);
    if (tags) {
      objects.push(UiKit.label(this, 190, 315, tags, '10px', UI.text.gold, true).setWordWrapWidth(575, true));
    }
    const close = UiKit.button(this, 480, 380, 120, 30, 'CERRAR', () => {
      this.targetLayer?.destroy(true);
      this.targetLayer = undefined;
    }, { accent: 'neutral', fontSize: '10px' });
    objects.push(close.button, close.label);
    this.targetLayer = this.add.container(0, 0, objects).setDepth(14000);
  }

  private skillEffectTags(skill: SkillDefinition): string {
    const tags = new Set<string>();
    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());
    if (skill.slot !== 'passive') tags.add('CD ' + CombatTempoEngine.cooldownTurns(skill));
    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        if (effect.ignoreMitigation) tags.add('DAÑO VERDADERO');
        else tags.add(effect.stat === 'power' ? 'DAÑO MÁGICO' : 'DAÑO FÍSICO');
      }
      if (effect.type === 'heal') tags.add('CURACIÓN');
      if (effect.statusKind === 'shield') tags.add('ESCUDO');
      if (effect.statusKind === 'stun') tags.add('ATURDIMIENTO');
      if (effect.statusKind === 'root') tags.add('INMOVILIZACIÓN');
      if (effect.statusKind === 'airborne') tags.add('POR LOS AIRES');
      if (effect.statusKind === 'charm') tags.add('ENAMORAMIENTO');
      if (effect.statusKind === 'taunt') tags.add('PROVOCACIÓN');
      if ((effect.hits ?? 1) > 1) tags.add(String(effect.hits) + ' IMPACTOS');
      if (effect.handlerId === 'aumento-evasion') tags.add('EVASIÓN ↑');
      if (effect.handlerId === 'recarga') tags.add('RECARGA');
      if (effect.handlerId === 'invocar') tags.add('INVOCACIÓN');
      if (effect.handlerId === 'abrir-reactivacion') tags.add('REACTIVACIÓN');
      if (effect.handlerId === 'añadir-marca' || effect.handlerId === 'damage-per-mark') tags.add('MARCAS');
      if (effect.handlerId === 'transformar-forma-persistente') tags.add('CAMBIO DE FORMA');
    }
    return [...tags].join(' · ');
  }

  private async selectSkill(actor: DuoCombatant, skill: SkillDefinition): Promise<void> {
    if (this.busy || this.awaitingContinue || this.targetLayer) return;
    const check = SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources);
    if (!check.allowed) {
      this.setMessage(check.message ?? 'No puedes usar esa habilidad.');
      return;
    }
    const tempoCheck = CombatTempoEngine.canUseSkill(actor.champion, skill, this.tempo);
    if (!tempoCheck.allowed) {
      this.setMessage(tempoCheck.message ?? 'Esa habilidad todavía no está disponible.');
      return;
    }
    if (CombatMechanicsEngine.isPreActionSkill(skill)) {
      await this.activateDoublePreAction(actor, skill);
      return;
    }

    const action: CombatAction = { type: 'skill', skillId: skill.id };
    const targetMode = this.skillTargetMode(skill);
    const candidates = this.targetCandidates(actor, targetMode);

    if (this.isMultiTargetMode(targetMode) || targetMode === 'self' || targetMode === 'random-enemy' || candidates.length <= 1) {
      const ids = targetMode === 'random-enemy'
        ? this.pickRandom(candidates).map((entry) => entry.champion.instanceId)
        : candidates.map((entry) => entry.champion.instanceId);
      this.commitPlayerChoice(actor, action, targetMode, ids);
      return;
    }

    this.showTargetPicker(actor, action, targetMode, candidates);
  }

  private async activateDoublePreAction(actor: DuoCombatant, skill: SkillDefinition): Promise<void> {
    if (skill.effects.some((effect) => effect.handlerId === 'armar-habilidades-potenciadas')) {
      const baseIds = SpecialEffectEngine.skillIds(actor.champion, this.forms);
      const slots: ActiveSkillSlot[] = ['q', 'w', 'e'];
      const hasAvailableBasic = slots.some((slot, index) => {
        if ((actor.champion.skillRanks[slot] ?? 0) <= 0) return false;
        return CombatTempoEngine.canUseSkill(actor.champion, DataRegistry.skill(baseIds[index]), this.tempo).allowed;
      });
      if (!hasAvailableBasic) {
        this.setMessage('Mantra necesita al menos una habilidad básica disponible.');
        return;
      }
    }

    this.busy = true;
    const rank = BattleEngine.skillRank(actor.champion, skill);
    CombatTempoEngine.startSkillCooldown(actor.champion, skill, this.tempo);
    const powerMultiplier =
      SpecialEffectEngine.skillPowerMultiplier(actor.champion, skill, this.resources, this.forms) *
      CombatMechanicsEngine.skillPowerMultiplier(actor.champion, skill, undefined, this.mechanics, this.forms);
    StatusEngine.applySkillEffects(
      skill,
      rank,
      this.statusesFor(actor),
      this.statusesFor(actor),
      false,
      powerMultiplier,
      actor.champion.instanceId
    );
    const messages = CombatMechanicsEngine.activatePreAction(actor.champion, skill, this.mechanics);
    this.refreshAllUi();
    await this.awaitContinue(`${DataRegistry.champion(actor.champion.championId).name} activa ${skill.name}.`);
    for (const message of messages) await this.awaitContinue(message);
    this.busy = false;
    const total = this.playerActive.filter((entry) => entry.hp > 0).length;
    this.renderActionUi(actor, total);
  }

  private showSwitchPicker(actor: DuoCombatant, total: number): void {
    const reserves = this.playerReserves.filter((entry) => entry.currentHp > 0);
    if (reserves.length === 0 || StatusEngine.isRooted(this.statusesFor(actor))) return;
    const free = CombatMechanicsEngine.actorEligibleForFreePairSwitch(
      actor.champion,
      this.playerActive.filter((entry) => entry.hp > 0).map((entry) => entry.champion),
      'player',
      this.mechanics
    );

    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 560, 210, 0x020912, 0.97).setStrokeStyle(3, free ? 0xe9c965 : 0x5dcce2));
    objects.push(this.add.text(480, 190, free ? 'RETIRADA CONJUNTA · CAMBIO GRATIS' : 'CAMBIAR ECO', {
      fontFamily: UI.font.family,
      fontSize: free ? '15px' : '18px',
      fontStyle: 'bold',
      color: free ? UI.text.gold : UI.text.primary
    }).setOrigin(0.5));

    reserves.slice(0, 4).forEach((replacement, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 350 + col * 260;
      const y = 245 + row * 58;
      const button = this.add.rectangle(x, y, 220, 48, 0x14364b, 1)
        .setStrokeStyle(2, 0x5dcce2)
        .setInteractive({ useHandCursor: true });
      const stats = BattleEngine.statsFor(replacement);
      const name = this.add.text(x, y - 11, DataRegistry.champion(replacement.championId).name.toUpperCase(), {
        fontFamily: UI.font.family, fontSize: '12px', fontStyle: 'bold', color: '#f8fbff'
      }).setOrigin(0.5);
      const detail = this.add.text(x, y + 8, `M${replacement.mastery} · ${replacement.currentHp}/${stats.hp} VID`, {
        fontFamily: UI.font.family, fontSize: '9px', color: '#70d8ff'
      }).setOrigin(0.5);
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        this.targetLayer?.destroy(true);
        this.targetLayer = undefined;
        if (free) {
          CombatMechanicsEngine.consumeFreePairSwitch(
            this.playerActive.filter((entry) => entry.hp > 0).map((entry) => entry.champion),
            'player',
            this.mechanics
          );
          this.performImmediateFreeSwitch(actor, replacement);
          const incoming = this.playerActive[actor.slot];
          this.renderCombatants();
          this.renderActionUi(incoming, total);
          return;
        }
        this.commitPlayerChoice(
          actor,
          { type: 'switch', replacementInstanceId: replacement.instanceId },
          'self',
          [actor.champion.instanceId]
        );
      });
      objects.push(button, name, detail);
    });

    const cancel = UiKit.button(this, 480, 350, 110, 28, 'CANCELAR', () => {
      this.targetLayer?.destroy(true);
      this.targetLayer = undefined;
    }, { accent: 'neutral', fontSize: '10px' });
    objects.push(cancel.button, cancel.label);
    this.targetLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private performImmediateFreeSwitch(actor: DuoCombatant, replacement: ChampionInstance): void {
    const reserveIndex = this.playerReserves.findIndex((entry) => entry.instanceId === replacement.instanceId);
    if (reserveIndex < 0) return;
    const outgoing = actor.champion;
    outgoing.currentHp = Math.max(1, actor.hp);
    SpecialEffectEngine.clearPersistentFormOnBench(outgoing, this.forms);
    CombatMechanicsEngine.clearOnBench(outgoing, this.mechanics);
    this.playerReserves.splice(reserveIndex, 1);
    this.playerReserves.push(outgoing);

    const next = this.makeCombatant(replacement, 'player', actor.slot);
    this.initializeCombatant(next, true);
    this.playerActive[actor.slot] = next;
    this.participantIds.add(next.champion.instanceId);
  }

  private showTargetPicker(
    actor: DuoCombatant,
    action: CombatAction,
    targetMode: SkillTarget,
    candidates: DuoCombatant[]
  ): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 520, 190, 0x020912, 0.97).setStrokeStyle(3, 0xe9c965));
    objects.push(this.add.text(480, 198, 'ELIGE OBJETIVO', {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: 'bold',
      color: UI.text.gold
    }).setOrigin(0.5));

    candidates.forEach((target, index) => {
      const x = candidates.length === 1 ? 480 : 350 + index * 260;
      const button = this.add.rectangle(x, 275, 220, 64, 0x14364b, 1)
        .setStrokeStyle(2, 0x5dcce2)
        .setInteractive({ useHandCursor: true });
      const name = this.add.text(x, 258, DataRegistry.champion(target.champion.championId).name.toUpperCase(), {
        fontFamily: UI.font.family,
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f8fbff'
      }).setOrigin(0.5);
      const hp = this.add.text(x, 286, `${target.hp}/${target.maxHp} VID`, {
        fontFamily: UI.font.family,
        fontSize: '10px',
        color: '#70d8ff'
      }).setOrigin(0.5);
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        this.targetLayer?.destroy(true);
        this.targetLayer = undefined;
        this.commitPlayerChoice(actor, action, targetMode, [target.champion.instanceId]);
      });
      objects.push(button, name, hp);
    });

    const cancel = UiKit.button(this, 480, 340, 110, 28, 'CANCELAR', () => {
      this.targetLayer?.destroy(true);
      this.targetLayer = undefined;
    }, { accent: 'neutral', fontSize: '10px' });
    objects.push(cancel.button, cancel.label);
    this.targetLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private commitPlayerChoice(
    actor: DuoCombatant,
    action: CombatAction,
    targetMode: SkillTarget,
    targetInstanceIds: string[]
  ): void {
    this.selectedChoices.push({
      actorInstanceId: actor.champion.instanceId,
      actorSide: 'player',
      action,
      targetMode,
      targetInstanceIds
    });
    this.participantIds.add(actor.champion.instanceId);
    this.selectionIndex += 1;
    this.selectNextPlayerAction();
  }

  private async executeRound(): Promise<void> {
    if (this.ended) return;
    this.busy = true;
    this.destroyActionUi();

    const choices: DoubleBattleChoice[] = [
      ...this.selectedChoices,
      ...this.enemyChoices()
    ];
    const queue: DoubleBattleTurnEntry[] = choices.map((choice) => {
      const actor = this.findCombatant(choice.actorInstanceId);
      return {
        ...choice,
        priority: BattleEngine.actionPriority(choice.action),
        speed: actor?.stats.speed ?? 0,
        tieBreaker: Math.random()
      };
    }).sort((a, b) => b.priority - a.priority || b.speed - a.speed || b.tieBreaker - a.tieBreaker);

    for (const entry of queue) {
      if (this.ended) return;
      const actor = this.findCombatant(entry.actorInstanceId);
      if (!actor || actor.hp <= 0) continue;
      if (!await this.beginTurn(actor)) continue;
      if (this.ended) return;
      await this.resolveTurnEntry(actor, entry);
      if (this.ended) return;
      await this.handleKnockouts();
      if (this.ended) return;
      await this.wait(BETWEEN_ACTIONS_MS);
    }

    await this.wait(ROUND_END_MS);
    this.refreshAllUi();
    this.beginSelectionRound();
  }

  private enemyChoices(): DoubleBattleChoice[] {
    return this.enemyActive.filter((entry) => entry.hp > 0).map((actor) => {
      const action = this.chooseEnemyAction(actor);
      const skill = action.type === 'skill' ? DataRegistry.skill(action.skillId) : undefined;
      const targetMode = skill ? this.skillTargetMode(skill) : action.type === 'switch' ? 'self' : 'enemy';
      const candidates = this.targetCandidates(actor, targetMode);
      const targetInstanceIds = this.isMultiTargetMode(targetMode)
        ? candidates.map((entry) => entry.champion.instanceId)
        : this.pickRandom(candidates).map((entry) => entry.champion.instanceId);
      return {
        actorInstanceId: actor.champion.instanceId,
        actorSide: 'enemy' as const,
        action,
        targetMode,
        targetInstanceIds
      };
    });
  }

  private chooseEnemyAction(actor: DuoCombatant): CombatAction {
    const usableSkills = (): SkillDefinition[] => {
      const ids = CombatMechanicsEngine.skillIds(actor.champion, this.forms, this.mechanics);
      const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
      return ids
        .map((id, index) => ({ skill: DataRegistry.skill(id), slot: slots[index] }))
        .filter(({ slot }) => (actor.champion.skillRanks[slot] ?? 0) > 0)
        .map(({ skill }) => skill)
        .filter((skill) => SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources).allowed)
        .filter((skill) => CombatTempoEngine.canUseSkill(actor.champion, skill, this.tempo).allowed);
    };

    let usable = usableSkills();
    if (usable.length === 0) return { type: 'wait' };

    let skill = usable[Math.floor(Math.random() * usable.length)];
    if (CombatMechanicsEngine.isPreActionSkill(skill)) {
      if (skill.effects.some((effect) => effect.handlerId === 'armar-habilidades-potenciadas')) {
        const baseIds = SpecialEffectEngine.skillIds(actor.champion, this.forms);
        const slots: ActiveSkillSlot[] = ['q', 'w', 'e'];
        const hasAvailableBasic = slots.some((slot, index) =>
          (actor.champion.skillRanks[slot] ?? 0) > 0 &&
          CombatTempoEngine.canUseSkill(actor.champion, DataRegistry.skill(baseIds[index]), this.tempo).allowed
        );
        if (!hasAvailableBasic) {
          usable = usable.filter((entry) => entry.id !== skill.id);
          if (usable.length === 0) return { type: 'wait' };
          skill = usable[Math.floor(Math.random() * usable.length)];
        }
      }

      if (CombatMechanicsEngine.isPreActionSkill(skill)) {
        this.activateEnemyPreActionImmediate(actor, skill);
        usable = usableSkills().filter((entry) => !CombatMechanicsEngine.isPreActionSkill(entry));
        if (usable.length === 0) return { type: 'wait' };
        skill = usable[Math.floor(Math.random() * usable.length)];
      }
    }

    return { type: 'skill', skillId: skill.id };
  }

  private activateEnemyPreActionImmediate(actor: DuoCombatant, skill: SkillDefinition): void {
    const rank = BattleEngine.skillRank(actor.champion, skill);
    CombatTempoEngine.startSkillCooldown(actor.champion, skill, this.tempo);
    const powerMultiplier =
      SpecialEffectEngine.skillPowerMultiplier(actor.champion, skill, this.resources, this.forms) *
      CombatMechanicsEngine.skillPowerMultiplier(actor.champion, skill, undefined, this.mechanics, this.forms);
    StatusEngine.applySkillEffects(
      skill,
      rank,
      this.statusesFor(actor),
      this.statusesFor(actor),
      false,
      powerMultiplier,
      actor.champion.instanceId
    );
    CombatMechanicsEngine.activatePreAction(actor.champion, skill, this.mechanics);
    this.refreshCombatantUi(actor);
  }

  private async beginTurn(actor: DuoCombatant, action?: CombatAction): Promise<boolean> {
    const statuses = this.statusesFor(actor);
    const name = DataRegistry.champion(actor.champion.championId).name;

    const delayedEvents = CombatTempoEngine.consumeDelayedDamage(actor.champion, this.tempo);
    for (const event of delayedEvents) {
      const target = this.findCombatant(event.targetInstanceId);
      if (!target || target.hp <= 0) continue;
      const intercepted = CombatMechanicsEngine.interceptDamage(target.champion, event.power, this.mechanics);
      const shield = StatusEngine.absorbDamage(this.statusesFor(target), intercepted.ownerDamage);
      target.hp = Math.max(0, target.hp - shield.damage);
      target.champion.currentHp = target.hp;
      this.refreshAllUi();
      await this.awaitContinue(`El ${event.label} regresa y causa ${shield.damage} de daño real a ${DataRegistry.champion(target.champion.championId).name}.`);
      if (target.hp <= 0) {
        await this.handleKnockouts();
        if (this.ended) return false;
      }
    }

    const poison = StatusEngine.poisonDamage(statuses);
    if (poison > 0) {
      actor.hp = Math.max(0, actor.hp - poison);
      actor.champion.currentHp = actor.hp;
      this.refreshAllUi();
      await this.awaitContinue(`El veneno daña a ${name}.`);
      if (actor.hp <= 0) {
        await this.handleKnockouts();
        return false;
      }
    }

    const burn = StatusEngine.burnDamage(statuses);
    if (burn > 0) {
      actor.hp = Math.max(0, actor.hp - burn);
      actor.champion.currentHp = actor.hp;
      this.refreshAllUi();
      await this.awaitContinue(`La quemadura daña a ${name}.`);
      if (actor.hp <= 0) {
        await this.handleKnockouts();
        return false;
      }
    }

    const returnBanishIndex = statuses.findIndex((status) =>
      status.kind === 'banish' && status.params?.saleSinPerderTurno === true
    );
    if (returnBanishIndex >= 0) {
      statuses.splice(returnBanishIndex, 1);
      await this.awaitContinue(`${name} reaparece desde el Umbral y puede actuar.`);
    }

    const blocking = StatusEngine.blockingKind(statuses);
    if (blocking) {
      const label = blocking === 'stun'
        ? 'está aturdido'
        : blocking === 'airborne'
          ? 'está por los aires'
          : blocking === 'recharge'
            ? 'necesita recuperarse'
            : blocking === 'banish'
              ? 'está desterrado'
              : 'está transformado';
      await this.awaitContinue(`${name} ${label} y pierde su acción.`);
      await this.finishDoubleTurn(actor);
      return false;
    }

    if (action && CombatTempoEngine.isActionOffensive(action)) {
      const trap = StatusEngine.consumeTrap(statuses);
      if (trap) {
        const shield = StatusEngine.absorbDamage(statuses, trap.damage);
        actor.hp = Math.max(0, actor.hp - shield.damage);
        actor.champion.currentHp = actor.hp;
        StatusEngine.applyStatModifier(statuses, 'jhin-captive-audience-slow', 'Ralentización', 'speed', trap.slowPower, 2, trap.sourceSkillId);
        this.refreshAllUi();
        await this.awaitContinue(`¡Público cautivo detona bajo ${name} y lo ralentiza!`);
        if (actor.hp <= 0) {
          await this.handleKnockouts();
          return false;
        }
      }

      const charmChance = StatusEngine.charmFailureChance(statuses);
      if (charmChance > 0 && Math.random() < charmChance) {
        await this.awaitContinue(`${name} está enamorado y no consigue atacar.`);
        await this.finishDoubleTurn(actor);
        return false;
      }
    }

    return true;
  }

  private async resolveTurnEntry(actor: DuoCombatant, entry: DoubleBattleTurnEntry): Promise<void> {
    const action = entry.action;
    const attackerName = DataRegistry.champion(actor.champion.championId).name;

    if (action.type === 'switch') {
      await this.executeRegularSwitch(actor, action.replacementInstanceId);
      return;
    }

    if (action.type === 'wait') {
      this.setMessage(`${attackerName} espera y recompone su ritmo.`);
      CombatMechanicsEngine.onActionResolved(
        actor.champion,
        action,
        null,
        true,
        undefined,
        actor.maxHp,
        this.mechanics,
        this.forms
      );
      await this.wait(220);
      await this.finishDoubleTurn(actor);
      return;
    }

    const skill = action.type === 'skill' ? DataRegistry.skill(action.skillId) : null;
    if (skill) {
      const resourceCheck = SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources);
      const tempoCheck = CombatTempoEngine.canUseSkill(actor.champion, skill, this.tempo);
      if (!resourceCheck.allowed || !tempoCheck.allowed) {
        await this.awaitContinue(resourceCheck.message ?? tempoCheck.message ?? `${attackerName} no puede usar esa habilidad.`);
        await this.finishDoubleTurn(actor);
        return;
      }
    }

    let targets = entry.targetInstanceIds
      .map((id) => this.findCombatant(id))
      .filter((value): value is DuoCombatant => Boolean(value && value.hp > 0));

    if (targets.length === 0) {
      targets = this.targetCandidates(actor, entry.targetMode).filter((candidate) => candidate.hp > 0);
      if (!this.isMultiTargetMode(entry.targetMode)) targets = this.pickRandom(targets);
    }
    if (targets.length === 0) {
      await this.finishDoubleTurn(actor);
      return;
    }

    const actionLabel = skill?.name ?? 'Ataque básico';
    await this.awaitContinue(`${attackerName} usa ${actionLabel}.`);
    await this.wait(ACTION_WINDUP_MS);

    const selfStatuses = this.statusesFor(actor);
    const rank = skill ? BattleEngine.skillRank(actor.champion, skill) : 1;
    const ownerMaxHpBefore = actor.maxHp;
    let anyHit = false;
    let mechanicsCounted = false;
    let selfHealApplied = false;
    let transformed = false;
    const mechanicsMessages: string[] = [];

    if (skill && !CombatMechanicsEngine.shouldDeferCooldown(skill)) {
      CombatTempoEngine.startSkillCooldown(actor.champion, skill, this.tempo);
    }
    if (skill) {
      for (const target of targets) {
        CombatTempoEngine.scheduleDelayedDamage(actor.champion, target.champion, skill, rank, this.tempo);
      }
    }

    for (const target of targets) {
      if (target.hp <= 0) continue;
      const targetStatuses = this.statusesFor(target);
      const selectedTargetIsAlly = target.side === actor.side;
      this.refreshCombatantUi(actor);
      this.refreshCombatantUi(target);

      const markStacksById = skill
        ? CombatMechanicsEngine.markStacksById(actor.champion, target.champion.instanceId, skill, this.mechanics, this.forms)
        : {};
      const effectPowerMultiplier = skill
        ? SpecialEffectEngine.skillPowerMultiplier(actor.champion, skill, this.resources, this.forms) *
          CombatMechanicsEngine.skillPowerMultiplier(actor.champion, skill, target.champion.instanceId, this.mechanics, this.forms)
        : 1;

      const resolution = skill
        ? BattleEngine.resolveSkill(skill, rank, actor.stats, target.stats, {
          defenderCurrentHp: target.hp,
          defenderMaxHp: target.maxHp,
          affinityMultiplier: TypeEffectivenessService.forSkill(
            skill,
            target.champion,
            SpecialEffectEngine.formId(target.champion, this.forms)
          ).multiplier,
          stabMultiplier: TypeEffectivenessService.stabMultiplier(
            skill,
            actor.champion,
            SpecialEffectEngine.formId(actor.champion, this.forms)
          ),
          effectPowerMultiplier,
          markStacksById
        })
        : BattleEngine.resolveBasicAttack(actor.stats, target.stats);

      if (skill) {
        const extraHitRatio = CombatMechanicsEngine.extraHitRatio(actor.champion, skill, this.mechanics, this.forms);
        if (extraHitRatio > 0 && resolution.damage > 0) {
          const extraHit = Math.max(1, Math.round(actor.stats.attack * extraHitRatio));
          resolution.damage += extraHit;
          resolution.damageInstances.push(extraHit);
        }
      }

      const damagingAction = BattleEngine.actionHasDamage(action) && target.side !== actor.side;
      const blindChance = damagingAction ? StatusEngine.blindMissChance(selfStatuses) : 0;
      const evasionChance = damagingAction ? StatusEngine.evasionMissChance(targetStatuses) : 0;
      const accuracyBonus = damagingAction ? StatusEngine.accuracyBonus(selfStatuses) : 0;
      const baseAccuracy = damagingAction ? Phaser.Math.Clamp((skill?.accuracy ?? 1) + accuracyBonus, 0.05, 1) : 1;
      const hitChance = baseAccuracy * (1 - blindChance) * (1 - evasionChance);
      const missed = damagingAction && Math.random() > hitChance;

      if (missed) {
        await this.awaitContinue(`${attackerName} falla contra ${DataRegistry.champion(target.champion.championId).name}.`);
        continue;
      }

      anyHit = true;
      const directBlock = resolution.damage > 0 && target.side !== actor.side
        ? StatusEngine.consumeDirectBlock(targetStatuses)
        : null;
      let dealtDamage = 0;
      let absorbedDamage = 0;
      let interceptedDamage = 0;
      let summonName: string | undefined;
      let summonBroken = false;
      const brokenShields: CombatStatusInstance[] = [];

      if (!directBlock && target.side !== actor.side) {
        const instances = resolution.damageInstances.length > 0
          ? resolution.damageInstances
          : resolution.damage > 0 ? [resolution.damage] : [];
        for (const instance of instances) {
          const intercepted = CombatMechanicsEngine.interceptDamage(target.champion, instance, this.mechanics);
          interceptedDamage += intercepted.intercepted;
          summonName = intercepted.summonName ?? summonName;
          summonBroken = summonBroken || Boolean(intercepted.summonBroken);
          const shield = StatusEngine.absorbDamage(targetStatuses, intercepted.ownerDamage);
          dealtDamage += shield.damage;
          absorbedDamage += shield.absorbed;
          brokenShields.push(...shield.brokenStatuses);
        }
        if (dealtDamage > 0) {
          target.hp = Math.max(0, target.hp - dealtDamage);
          target.champion.currentHp = target.hp;
          SpecialEffectEngine.onDamageTaken(target.champion, this.resources, this.forms);
        }
      }

      let shieldExplosionDamage = 0;
      for (const brokenShield of brokenShields) {
        const endEffect = CombatMechanicsEngine.shieldEndEffect(brokenShield);
        if (!endEffect) continue;
        shieldExplosionDamage += endEffect.damage;
        StatusEngine.applyStatModifier(
          selfStatuses,
          `${brokenShield.id}-slow`,
          'Ralentización',
          'speed',
          endEffect.slowPower,
          endEffect.slowTurns,
          brokenShield.sourceSkillId
        );
      }
      if (shieldExplosionDamage > 0) {
        actor.hp = Math.max(0, actor.hp - shieldExplosionDamage);
        actor.champion.currentHp = actor.hp;
      }

      if (resolution.heal > 0) {
        const healsSelectedAlly = Boolean(skill?.effects.some((effect) =>
          effect.type === 'heal' && ['ally', 'any-ally', 'all-allies'].includes(effect.target ?? 'self')
        ));
        if (selectedTargetIsAlly && healsSelectedAlly) {
          target.hp = Math.min(target.maxHp, target.hp + resolution.heal);
          target.champion.currentHp = target.hp;
        } else if (!selfHealApplied) {
          actor.hp = Math.min(actor.maxHp, actor.hp + resolution.heal);
          actor.champion.currentHp = actor.hp;
          selfHealApplied = true;
        }
      }

      if (skill) {
        const application = StatusEngine.applySkillEffects(
          skill,
          rank,
          selfStatuses,
          targetStatuses,
          true,
          effectPowerMultiplier,
          actor.champion.instanceId,
          { selectedTargetIsAlly, markStacksById }
        );
        if (target.side !== actor.side) {
          const effectiveness = TypeEffectivenessService.forSkill(
            skill,
            target.champion,
            SpecialEffectEngine.formId(target.champion, this.forms)
          );
          const stab = TypeEffectivenessService.stabMultiplier(
            skill,
            actor.champion,
            SpecialEffectEngine.formId(actor.champion, this.forms)
          );
          StatusEngine.setAffinityMultiplier(targetStatuses, application.enemyAppliedIds, effectiveness.multiplier);
          StatusEngine.setStabMultiplier(targetStatuses, application.enemyAppliedIds, stab);
        }

        const mechanicsResult = CombatMechanicsEngine.onActionResolved(
          actor.champion,
          action,
          skill,
          true,
          target.champion.instanceId,
          ownerMaxHpBefore,
          this.mechanics,
          this.forms,
          !mechanicsCounted
        );
        mechanicsMessages.push(...mechanicsResult.messages);
        mechanicsCounted = true;
      }

      if (dealtDamage > 0) this.hitFeedback(target);
      this.refreshAllUi();

      if (directBlock) {
        await this.awaitContinue(`${DataRegistry.champion(target.champion.championId).name} bloquea el ataque con su Refugio.`);
      } else if (interceptedDamage > 0 && summonName) {
        await this.awaitContinue(`${summonName} intercepta ${interceptedDamage} de daño.`);
        if (summonBroken) await this.awaitContinue(`${summonName} cae y abandona el combate.`);
      } else if (absorbedDamage > 0 && dealtDamage <= 0) {
        await this.awaitContinue(`${DataRegistry.champion(target.champion.championId).name} bloquea el impacto con su escudo.`);
      }
      if (shieldExplosionDamage > 0) {
        await this.awaitContinue('El escudo detona al romperse y ralentiza al atacante.');
      }
      if (target.hp <= 0) {
        await this.awaitContinue(`${DataRegistry.champion(target.champion.championId).name} ha caído.`);
      }
      if (actor.hp <= 0) {
        await this.awaitContinue(`${attackerName} cae por la explosión del escudo.`);
        break;
      }
    }

    if (skill && !mechanicsCounted) {
      const mechanicsResult = CombatMechanicsEngine.onActionResolved(
        actor.champion,
        action,
        skill,
        false,
        undefined,
        ownerMaxHpBefore,
        this.mechanics,
        this.forms,
        true
      );
      mechanicsMessages.push(...mechanicsResult.messages);
    }

    if (skill && CombatMechanicsEngine.shouldDeferCooldown(skill) && skill.slot !== 'passive') {
      const slot = skill.slot as ActiveSkillSlot;
      if (!CombatMechanicsEngine.hasRecastForSlot(actor.champion, slot, this.mechanics)) {
        CombatTempoEngine.startSkillCooldown(actor.champion, skill, this.tempo);
      }
    }

    if (skill) {
      const form = SpecialEffectEngine.applyTransformation(actor.champion, skill, this.resources, this.forms);
      if (form) {
        transformed = true;
        const ratio = actor.hp / Math.max(1, actor.maxHp);
        actor.stats = BattleEngine.statsFor(actor.champion, form.formId);
        actor.maxHp = actor.stats.hp;
        actor.hp = Math.max(1, Math.min(actor.maxHp, Math.round(actor.maxHp * ratio)));
        actor.champion.currentHp = actor.hp;
        await this.awaitContinue(`${attackerName} cambia a ${DataRegistry.form(actor.champion.championId, form.formId).name}.`);
      }

      const specials = SpecialEffectEngine.onSkillResolved(
        actor.champion,
        skill,
        this.resources,
        this.forms,
        selfStatuses,
        anyHit
      );
      for (const message of specials.messages) await this.awaitContinue(message);

      const teamHeal = anyHit ? CombatMechanicsEngine.teamHealAmount(skill, rank) : 0;
      if (teamHeal > 0) {
        const allies = actor.side === 'player' ? this.playerActive : this.enemyActive;
        for (const ally of allies.filter((entry) => entry.hp > 0)) {
          ally.hp = Math.min(ally.maxHp, ally.hp + teamHeal);
          ally.champion.currentHp = ally.hp;
        }
        await this.awaitContinue(`${attackerName} restaura Vida a su equipo.`);
      }

      const collision = anyHit ? CombatMechanicsEngine.secondaryCollision(skill, rank) : null;
      if (collision && targets[0] && targets[0].side !== actor.side) {
        const enemies = actor.side === 'player' ? this.enemyActive : this.playerActive;
        const secondary = enemies.find((candidate) =>
          candidate.hp > 0 && candidate.champion.instanceId !== targets[0].champion.instanceId
        );
        if (secondary) {
          const intercepted = CombatMechanicsEngine.interceptDamage(secondary.champion, collision.damage, this.mechanics);
          const shield = StatusEngine.absorbDamage(this.statusesFor(secondary), intercepted.ownerDamage);
          secondary.hp = Math.max(0, secondary.hp - shield.damage);
          secondary.champion.currentHp = secondary.hp;
          StatusEngine.applySimpleStatus(
            this.statusesFor(secondary),
            'airborne',
            `${skill.id}-secondary-airborne`,
            'Por los aires',
            1,
            collision.airborneTurns,
            skill.id,
            actor.champion.instanceId
          );
          await this.awaitContinue(`La patada alcanza a ${DataRegistry.champion(secondary.champion.championId).name}: recibe ${shield.damage} de daño y sale por los aires.`);
        }
      }

      const tempoResult = CombatTempoEngine.onActionResolved(actor.champion, action, skill, anyHit, this.tempo);
      for (const message of mechanicsMessages) await this.awaitContinue(message);
      for (const message of tempoResult.messages) await this.awaitContinue(message);
    }

    const enemies = actor.side === 'player' ? this.enemyActive : this.playerActive;
    if (enemies.some((enemy) => enemy.hp <= 0) && CombatMechanicsEngine.shouldResetBasicCooldownsOnKnockout(selfStatuses)) {
      CombatTempoEngine.reduceBasicCooldowns(actor.champion, this.tempo);
      await this.awaitContinue(`${attackerName} encadena la baja y recupera sus habilidades básicas.`);
    }

    if (actor.hp > 0) await this.finishDoubleTurn(actor, transformed);
    this.refreshAllUi();
  }

  private async executeRegularSwitch(actor: DuoCombatant, replacementInstanceId: string): Promise<void> {
    const reserves = actor.side === 'player' ? this.playerReserves : this.enemyReserves;
    const active = actor.side === 'player' ? this.playerActive : this.enemyActive;
    const reserveIndex = reserves.findIndex((entry) => entry.instanceId === replacementInstanceId && entry.currentHp > 0);
    if (reserveIndex < 0 || StatusEngine.isRooted(this.statusesFor(actor))) {
      await this.awaitContinue('El cambio no puede realizarse.');
      return;
    }

    const replacement = reserves.splice(reserveIndex, 1)[0];
    const outgoing = actor.champion;
    outgoing.currentHp = Math.max(1, actor.hp);
    SpecialEffectEngine.clearPersistentFormOnBench(outgoing, this.forms);
    CombatMechanicsEngine.clearOnBench(outgoing, this.mechanics);
    reserves.push(outgoing);

    const next = this.makeCombatant(replacement, actor.side, actor.slot);
    this.initializeCombatant(next, true);
    active[actor.slot] = next;
    if (actor.side === 'player') this.participantIds.add(next.champion.instanceId);
    this.renderCombatants();
    await this.awaitContinue(`${DataRegistry.champion(next.champion.championId).name} entra al combate.`);
  }

  private async finishDoubleTurn(actor: DuoCombatant, skipFormAdvance = false): Promise<void> {
    const selfStatuses = this.statusesFor(actor);
    const removed = StatusEngine.advanceTurn(selfStatuses);
    SpecialEffectEngine.onTurnFinished(actor.champion, this.resources, this.forms);
    CombatTempoEngine.finishTurn(actor.champion, this.tempo);
    const mechanicsTurn = CombatMechanicsEngine.finishTurn(actor.champion, selfStatuses, this.mechanics, this.forms);

    for (const baseSkillId of mechanicsTurn.expiredRecastSkillIds) {
      CombatTempoEngine.startSkillCooldownById(actor.champion, baseSkillId, this.tempo);
    }

    const enemies = actor.side === 'player' ? this.enemyActive : this.playerActive;
    for (const expired of removed) {
      const endEffect = CombatMechanicsEngine.shieldEndEffect(expired);
      if (!endEffect) continue;
      for (const enemy of enemies.filter((entry) => entry.hp > 0)) {
        enemy.hp = Math.max(0, enemy.hp - endEffect.damage);
        enemy.champion.currentHp = enemy.hp;
        StatusEngine.applyStatModifier(
          this.statusesFor(enemy),
          `${expired.id}-slow`,
          'Ralentización',
          'speed',
          endEffect.slowPower,
          endEffect.slowTurns,
          expired.sourceSkillId
        );
      }
      await this.awaitContinue('El escudo expira, estalla y ralentiza a los rivales.');
    }

    if (mechanicsTurn.summonAttack) {
      const candidates = enemies.filter((entry) => entry.hp > 0);
      const target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;
      if (target) {
        const intercepted = CombatMechanicsEngine.interceptDamage(target.champion, mechanicsTurn.summonAttack.damage, this.mechanics);
        const shield = StatusEngine.absorbDamage(this.statusesFor(target), intercepted.ownerDamage);
        target.hp = Math.max(0, target.hp - shield.damage);
        target.champion.currentHp = target.hp;
        await this.awaitContinue(`${mechanicsTurn.summonAttack.name} golpea a ${DataRegistry.champion(target.champion.championId).name} y causa ${shield.damage} de daño.`);
      }
    }

    if (!skipFormAdvance && SpecialEffectEngine.formId(actor.champion, this.forms)) {
      SpecialEffectEngine.decrementFormAfterAction(actor.champion, this.forms);
      const state = SpecialEffectEngine.formState(actor.champion, this.forms);
      if (state && !state.persistentUntilBench && state.remainingTurns <= 0) {
        SpecialEffectEngine.expireFormAtTurnStart(actor.champion, this.forms);
      }
    }

    for (const message of mechanicsTurn.messages) await this.awaitContinue(message);
    this.refreshAllUi();
  }

  private async handleKnockouts(): Promise<void> {
    for (let slot = 0; slot < this.enemyActive.length; slot += 1) {
      const fallen = this.enemyActive[slot];
      if (fallen.hp > 0) continue;
      if (!this.defeatedEnemyIds.has(fallen.champion.instanceId)) {
        this.defeatedEnemyIds.add(fallen.champion.instanceId);
        if (this.session.persistPlayerState) this.awardEnemyExperience(fallen.champion);
      }
      const replacement = this.enemyReserves.shift();
      if (replacement) {
        const next = this.makeCombatant(replacement, 'enemy', slot);
        this.initializeCombatant(next, true);
        this.enemyActive[slot] = next;
        await this.awaitContinue(`${this.session.trainerName ?? 'El rival'} envía a ${DataRegistry.champion(next.champion.championId).name}.`);
      }
    }

    for (let slot = 0; slot < this.playerActive.length; slot += 1) {
      const fallen = this.playerActive[slot];
      if (fallen.hp > 0) continue;
      const replacement = this.playerReserves.shift();
      if (replacement) {
        const next = this.makeCombatant(replacement, 'player', slot);
        this.initializeCombatant(next, true);
        this.playerActive[slot] = next;
        await this.awaitContinue(`${DataRegistry.champion(next.champion.championId).name} entra al combate.`);
      }
    }

    this.renderCombatants();

    const enemyAlive = this.enemyActive.some((entry) => entry.hp > 0) || this.enemyReserves.some((entry) => entry.currentHp > 0);
    const playerAlive = this.playerActive.some((entry) => entry.hp > 0) || this.playerReserves.some((entry) => entry.currentHp > 0);
    if (!enemyAlive) await this.finishVictory();
    else if (!playerAlive) await this.finishDefeat();
  }

  private awardEnemyExperience(defeated: ChampionInstance): void {
    const gains = ProgressionService.awardPartyExperience(this.save, defeated, [...this.participantIds]);
    for (const gain of gains) {
      const existing = this.gains.find((entry) => entry.instanceId === gain.instanceId);
      if (!existing) {
        this.gains.push({ ...gain, unlockedSlots: [...gain.unlockedSlots] });
        continue;
      }
      existing.experienceGained += gain.experienceGained;
      existing.toMastery = gain.toMastery;
      existing.skillPointsGained += gain.skillPointsGained;
      existing.unlockedSlots = [...new Set([...existing.unlockedSlots, ...gain.unlockedSlots])];
    }
  }

  private async finishVictory(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.destroyActionUi();

    if (this.session.persistPlayerState) {
      for (const combatant of this.playerActive) {
        combatant.champion.currentHp = Math.max(1, combatant.hp);
      }
      if (this.session.victoryFlag && !this.save.worldProgress.flags.includes(this.session.victoryFlag)) {
        this.save.worldProgress.flags.push(this.session.victoryFlag);
      }
      this.save.gold += Math.max(0, Math.round(this.session.rewardGold ?? 0));
      SaveService.save(this.save);
      this.registry.set('lastMasteryGains', this.gains);
    }

    const reward = Math.max(0, Math.round(this.session.rewardGold ?? 0));
    await this.awaitContinue(this.session.kind === 'sandbox'
      ? 'Prueba 2v2 completada. El modo doble está operativo.'
      : `¡Victoria 2v2! ${reward > 0 ? `Recompensa: ${reward} de oro.` : ''}`);

    this.registry.remove('battle.doubleSession');
    if (this.session.persistPlayerState && this.gains.length > 0) this.scene.start('ProgressionScene');
    else this.scene.start(this.session.returnScene || 'WorldScene');
  }

  private async finishDefeat(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.destroyActionUi();

    if (this.session.persistPlayerState) {
      const recovery = SanctuaryService.recoverAfterDefeat(this.save);
      SaveService.save(this.save);
      this.registry.set('lastDefeat', recovery);
      this.registry.remove('battle.doubleSession');
      await this.awaitContinue('Tus dos Ecos activos han caído y no quedan reservas.');
      this.scene.start('DefeatScene');
      return;
    }

    await this.awaitContinue('La prueba 2v2 ha terminado en derrota. No se ha modificado la partida.');
    this.registry.remove('battle.doubleSession');
    this.scene.start(this.session.returnScene || 'WorldScene');
  }

  private skillTargetMode(skill: SkillDefinition): SkillTarget {
    const targets = skill.effects.map((effect) => effect.target ?? (
      effect.type === 'heal' || effect.type === 'buff' ? 'self' : 'enemy'
    ));
    return defaultSkillTarget(targets);
  }

  private targetCandidates(actor: DuoCombatant, mode: SkillTarget): DuoCombatant[] {
    const allies = actor.side === 'player' ? this.playerActive : this.enemyActive;
    const enemies = actor.side === 'player' ? this.enemyActive : this.playerActive;
    const aliveAllies = allies.filter((entry) => entry.hp > 0);
    const aliveEnemies = enemies.filter((entry) => entry.hp > 0);
    if (mode === 'self') return [actor];
    if (mode === 'ally') return aliveAllies.filter((entry) => entry.champion.instanceId !== actor.champion.instanceId);
    if (mode === 'any-ally' || mode === 'all-allies') return aliveAllies;
    if (mode === 'all') return [...aliveAllies, ...aliveEnemies];

    if (mode === 'enemy' || mode === 'any-enemy' || mode === 'random-enemy') {
      const forcedId = StatusEngine.forcedTargetInstanceId(this.statusesFor(actor));
      const forced = forcedId ? aliveEnemies.find((entry) => entry.champion.instanceId === forcedId) : undefined;
      if (forced) return [forced];
    }
    return aliveEnemies;
  }

  private isMultiTargetMode(mode: SkillTarget): boolean {
    return mode === 'all' || mode === 'all-allies' || mode === 'all-enemies';
  }

  private targetLabel(mode: SkillTarget): string {
    if (mode === 'self') return 'PROPIO';
    if (mode === 'ally' || mode === 'any-ally') return 'ALIADO';
    if (mode === 'all-allies') return 'TODOS ALIADOS';
    if (mode === 'all-enemies') return 'TODOS RIVALES';
    if (mode === 'all') return 'TODOS';
    return 'RIVAL';
  }

  private findCombatant(instanceId: string): DuoCombatant | undefined {
    return [...this.playerActive, ...this.enemyActive].find((entry) => entry.champion.instanceId === instanceId);
  }

  private statusesFor(combatant: DuoCombatant): CombatStatusInstance[] {
    this.statuses[combatant.champion.instanceId] = this.statuses[combatant.champion.instanceId] ?? [];
    return this.statuses[combatant.champion.instanceId];
  }

  private refreshAllUi(): void {
    for (const combatant of [...this.playerActive, ...this.enemyActive]) {
      this.refreshCombatantUi(combatant);
    }
    this.renderCombatants();
  }

  private destroyActionUi(): void {
    for (const object of this.actionObjects) object.destroy();
    this.actionObjects = [];
    this.targetLayer?.destroy(true);
    this.targetLayer = undefined;
  }

  private createCombatVisual(
    combatant: DuoCombatant,
    x: number,
    y: number,
    depth: number
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Container {
    const championId = combatant.champion.championId;
    const player = combatant.side === 'player';
    const texture = player ? this.playerBattleTexture(championId) : this.enemyBattleTexture(championId);
    if (texture) {
      return this.add.image(x, y, texture)
        .setOrigin(0.5, 1)
        .setScale(player ? 0.58 : 0.54)
        .setDepth(depth);
    }

    const champion = DataRegistry.champion(championId);
    const border = player ? 0x70d8ff : 0xe59a8a;
    const fill = player ? 0x12384a : 0x472c33;
    const body = this.add.rectangle(0, -52, 82, 104, fill, 0.96)
      .setStrokeStyle(3, border);
    const initials = UiKit.label(this, 0, -79, this.championInitials(champion.name), '22px', '#ffffff', true)
      .setOrigin(0.5, 0);
    const label = UiKit.label(this, 0, -38, champion.name.toUpperCase(), champion.name.length > 12 ? '8px' : '10px', UI.text.primary, true)
      .setOrigin(0.5, 0)
      .setAlign('center')
      .setWordWrapWidth(72, true);
    const pending = UiKit.label(this, 0, -17, 'SPRITE PEND.', '7px', UI.text.muted, true).setOrigin(0.5, 0);
    return this.add.container(x, y, [body, initials, label, pending]).setDepth(depth);
  }

  private championInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
    return name.slice(0, 3).toUpperCase();
  }

  private playerBattleTexture(championId: string): string | null {
    const back = championId + '-battle-back';
    if (this.textures.exists(back)) return back;
    const front = championId + '-battle-front';
    return this.textures.exists(front) ? front : null;
  }

  private enemyBattleTexture(championId: string): string | null {
    const key = championId + '-battle-front';
    return this.textures.exists(key) ? key : null;
  }

  private hitFeedback(target: DuoCombatant): void {
    if (!target.sprite) return;
    this.tweens.add({
      targets: target.sprite,
      alpha: 0.35,
      duration: 65,
      yoyo: true,
      repeat: 1,
      onComplete: () => target.sprite?.setAlpha(1)
    });
  }

  private setMessage(message: string): void {
    this.messageText.setText(message);
  }

  private awaitContinue(message: string): Promise<void> {
    this.setMessage(message);
    this.continueLayer?.destroy(true);
    this.awaitingContinue = true;
    return new Promise((resolve) => {
      let resolved = false;
      const keyboard = this.input.keyboard;
      const done = (): void => {
        if (resolved) return;
        resolved = true;
        keyboard?.off('keydown-A', done);
        keyboard?.off('keydown-ENTER', done);
        keyboard?.off('keydown-SPACE', done);
        this.input.off(Phaser.Input.Events.POINTER_UP, done);
        this.continueLayer?.destroy(true);
        this.continueLayer = undefined;
        this.awaitingContinue = false;
        resolve();
      };
      const prompt = UiKit.button(this, 850, 392, 176, 30, 'A · CONTINUAR', done, {
        accent: 'green',
        fontSize: '11px',
        selected: true
      });
      this.continueLayer = this.add.container(0, 0, [prompt.button, prompt.label]).setDepth(15000);
      keyboard?.once('keydown-A', done);
      keyboard?.once('keydown-ENTER', done);
      keyboard?.once('keydown-SPACE', done);
      this.input.once(Phaser.Input.Events.POINTER_UP, done);
    });
  }

  private pickRandom<T>(values: T[]): T[] {
    if (values.length === 0) return [];
    return [values[Math.floor(Math.random() * values.length)]];
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
