import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
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
  sprite?: Phaser.GameObjects.Image;
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

  private initializeCombatant(combatant: DuoCombatant): void {
    this.statuses[combatant.champion.instanceId] = this.statuses[combatant.champion.instanceId] ?? [];
    SpecialEffectEngine.initializeResources(combatant.champion, this.resources, this.forms);
    if (combatant.side === 'player') this.participantIds.add(combatant.champion.instanceId);
  }

  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(480, 188, 'bandle-bg').setDisplaySize(960, 376).setTint(0x9bbcae).setAlpha(0.9);
    this.add.rectangle(0, 376, 960, 164, 0x020912, 0.95).setOrigin(0, 0).setDepth(500);
    this.add.line(0, 376, 12, 0, 948, 0, 0x33535f, 0.9).setOrigin(0, 0).setDepth(505);
    this.add.text(480, 12, 'COMBATE DOBLE · 2 VS 2', {
      fontFamily: UI.font.family,
      fontSize: '14px',
      fontStyle: 'bold',
      color: UI.text.gold
    }).setOrigin(0.5, 0).setDepth(900);

    this.messageText = UiKit.label(this, 34, 386, '', '15px', UI.text.primary, true)
      .setWordWrapWidth(892, true)
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
      ? [{ x: 224, y: 313 }, { x: 410, y: 330 }]
      : [{ x: 690, y: 202 }, { x: 828, y: 224 }];
    const cardPositions = player
      ? [{ x: 24, y: 248 }, { x: 310, y: 270 }]
      : [{ x: 18, y: 42 }, { x: 305, y: 62 }];
    const pos = positions[index] ?? positions[0];
    const cardPos = cardPositions[index] ?? cardPositions[0];

    const texture = player
      ? this.playerBattleTexture(combatant.champion.championId)
      : this.enemyBattleTexture(combatant.champion.championId);
    const sprite = this.add.image(pos.x, pos.y, texture)
      .setOrigin(0.5, 1)
      .setScale(player ? 0.58 : 0.54)
      .setDepth(200 + index);
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
    combatant.stats = StatusEngine.effectiveStats(
      BattleEngine.statsFor(combatant.champion, SpecialEffectEngine.formId(combatant.champion, this.forms)),
      this.statusesFor(combatant)
    );
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
    const title = this.add.text(30, 414, `ACCIÓN ${this.selectionIndex + 1}/${total} · ${definition.name.toUpperCase()}`, {
      fontFamily: UI.font.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: UI.text.gold
    }).setDepth(730);
    this.actionObjects.push(title);

    const skillIds = SpecialEffectEngine.skillIds(actor.champion, this.forms);
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const positions = [30, 205, 380, 555];
    for (let i = 0; i < 4; i += 1) {
      const slot = slots[i];
      const skill = DataRegistry.skill(skillIds[i]);
      const rank = actor.champion.skillRanks[slot];
      const disabled = rank <= 0 || !SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources).allowed;
      const button = this.add.rectangle(positions[i], 452, 160, 66, disabled ? 0x13222d : 0x14364b, 0.98)
        .setOrigin(0, 0)
        .setStrokeStyle(2, disabled ? 0x44525b : 0x5dcce2)
        .setDepth(730);
      const name = this.add.text(positions[i] + 80, 461, skill.name.toUpperCase(), {
        fontFamily: UI.font.family,
        fontSize: skill.name.length > 17 ? '10px' : '12px',
        fontStyle: 'bold',
        color: disabled ? '#70808a' : '#f8fbff',
        align: 'center',
        wordWrap: { width: 140 }
      }).setOrigin(0.5, 0).setDepth(731);
      const target = this.skillTargetMode(skill);
      const detail = this.add.text(positions[i] + 80, 500, `R${rank} · ${this.targetLabel(target)}`, {
        fontFamily: UI.font.family,
        fontSize: '9px',
        color: disabled ? '#60717c' : '#70d8ff'
      }).setOrigin(0.5, 0).setDepth(731);
      if (!disabled) {
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(3, 0xe9c965));
        button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, 0x5dcce2));
        button.on(Phaser.Input.Events.POINTER_UP, () => this.selectSkill(actor, skill));
      }
      this.actionObjects.push(button, name, detail);
    }

    const resource = SpecialEffectEngine.resourceLabel(actor.champion, this.resources, this.forms);
    if (resource) {
      this.actionObjects.push(this.add.text(742, 426, resource, {
        fontFamily: UI.font.family,
        fontSize: '10px',
        color: '#e9c965'
      }).setDepth(731));
    }
  }

  private selectSkill(actor: DuoCombatant, skill: SkillDefinition): void {
    if (this.busy || this.awaitingContinue || this.targetLayer) return;
    const check = SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources);
    if (!check.allowed) {
      this.setMessage(check.message ?? 'No puedes usar esa habilidad.');
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
      const action = BattleEngine.chooseEnemyAction(actor.champion, SpecialEffectEngine.formId(actor.champion, this.forms));
      const skill = action.type === 'skill' ? DataRegistry.skill(action.skillId) : undefined;
      const targetMode = skill ? this.skillTargetMode(skill) : 'enemy';
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

  private async beginTurn(actor: DuoCombatant): Promise<boolean> {
    const statuses = this.statusesFor(actor);
    const name = DataRegistry.champion(actor.champion.championId).name;
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

    const blocking = StatusEngine.blockingKind(statuses);
    if (blocking) {
      const label = blocking === 'stun' ? 'está aturdido' : blocking === 'banish' ? 'está desterrado' : 'está transformado';
      await this.awaitContinue(`${name} ${label} y pierde su acción.`);
      StatusEngine.advanceTurn(statuses);
      return false;
    }
    return true;
  }

  private async resolveTurnEntry(actor: DuoCombatant, entry: DoubleBattleTurnEntry): Promise<void> {
    const action = entry.action;
    const skill = action.type === 'skill' ? DataRegistry.skill(action.skillId) : null;
    const attackerName = DataRegistry.champion(actor.champion.championId).name;

    if (skill) {
      const check = SpecialEffectEngine.canUseSkill(actor.champion, skill, this.resources);
      if (!check.allowed) {
        await this.awaitContinue(check.message ?? `${attackerName} no puede usar esa habilidad.`);
        return;
      }
    }

    let targets = entry.targetInstanceIds
      .map((id) => this.findCombatant(id))
      .filter((value): value is DuoCombatant => Boolean(value && value.hp > 0));

    if (targets.length === 0) {
      targets = this.targetCandidates(actor, entry.targetMode).filter((entry) => entry.hp > 0);
      if (!this.isMultiTargetMode(entry.targetMode)) targets = this.pickRandom(targets);
    }
    if (targets.length === 0) return;

    const actionLabel = skill?.name ?? 'Ataque básico';
    await this.awaitContinue(`${attackerName} usa ${actionLabel}.`);
    await this.wait(ACTION_WINDUP_MS);

    const selfStatuses = this.statusesFor(actor);
    const rank = skill ? BattleEngine.skillRank(actor.champion, skill) : 1;
    let selfApplied = false;

    for (const target of targets) {
      if (target.hp <= 0) continue;
      const targetStatuses = this.statusesFor(target);
      actor.stats = StatusEngine.effectiveStats(
        BattleEngine.statsFor(actor.champion, SpecialEffectEngine.formId(actor.champion, this.forms)),
        selfStatuses
      );
      target.stats = StatusEngine.effectiveStats(
        BattleEngine.statsFor(target.champion, SpecialEffectEngine.formId(target.champion, this.forms)),
        targetStatuses
      );

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
          )
        })
        : BattleEngine.resolveBasicAttack(actor.stats, target.stats);

      const blindChance = BattleEngine.actionHasDamage(action) ? StatusEngine.blindMissChance(selfStatuses) : 0;
      const evasionChance = BattleEngine.actionHasDamage(action) ? StatusEngine.evasionMissChance(targetStatuses) : 0;
      const missChance = 1 - (1 - blindChance) * (1 - evasionChance);
      const missed = missChance > 0 && Math.random() < missChance;

      if (missed) {
        await this.awaitContinue(`${attackerName} falla contra ${DataRegistry.champion(target.champion.championId).name}.`);
        continue;
      }

      if (resolution.damage > 0) {
        const shield = StatusEngine.absorbDamage(targetStatuses, resolution.damage);
        target.hp = Math.max(0, target.hp - shield.damage);
        target.champion.currentHp = target.hp;
        SpecialEffectEngine.onDamageTaken(target.champion, this.resources, this.forms);
      }

      if (resolution.heal > 0 && !selfApplied) {
        actor.hp = Math.min(actor.maxHp, actor.hp + resolution.heal);
        actor.champion.currentHp = actor.hp;
      }

      if (skill) {
        StatusEngine.applySkillEffects(skill, rank, selfStatuses, targetStatuses, true);
        const transformed = SpecialEffectEngine.applyTransformation(actor.champion, skill, this.resources, this.forms);
        if (transformed) {
          actor.stats = BattleEngine.statsFor(actor.champion, transformed.formId);
          actor.maxHp = actor.stats.hp;
          actor.hp = Math.min(actor.hp, actor.maxHp);
        }
      }

      selfApplied = true;
      this.hitFeedback(target);
      this.refreshAllUi();
      if (target.hp <= 0) {
        await this.awaitContinue(`${DataRegistry.champion(target.champion.championId).name} ha caído.`);
      }
    }

    StatusEngine.advanceTurn(selfStatuses);
    SpecialEffectEngine.onTurnFinished(actor.champion, this.resources, this.forms);
    SpecialEffectEngine.decrementFormAfterAction(actor.champion, this.forms);
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
        this.initializeCombatant(next);
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
        this.initializeCombatant(next);
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

  private playerBattleTexture(championId: string): string {
    const key = `${championId}-battle-back`;
    return this.textures.exists(key) ? key : `${championId}-battle-front`;
  }

  private enemyBattleTexture(championId: string): string {
    const key = `${championId}-battle-front`;
    return this.textures.exists(key) ? key : 'teemo-battle-front';
  }

  private hitFeedback(target: DuoCombatant): void {
    if (!target.sprite) return;
    target.sprite.setTint(0xffffff);
    this.tweens.add({
      targets: target.sprite,
      alpha: 0.42,
      duration: 65,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        target.sprite?.clearTint();
        target.sprite?.setAlpha(1);
      }
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
