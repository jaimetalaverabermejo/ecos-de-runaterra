import Phaser from 'phaser';
import { WildEscapeService } from '../systems/encounters/WildEscapeService';
import { addMarkIndicators } from '../ui/combat/MarkIndicators';
import { drawCombatBackdrop, playCombatVfx, skillVfx } from '../ui/combat/CombatVisuals';
import { createSummonVisual } from '../ui/combat/SummonVisual';
import { configureSceneLayout } from '../config/GameDimensions';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { DataRegistry } from '../data/DataRegistry';
import { COMBAT_SKILL_DESCRIPTIONS } from '../data/skills/combatDescriptions';
import type { ActiveSkillSlot, ChampionInstance, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { SpecialEffectEngine, type BattleFormStore, type BattleResourceStore } from '../systems/combat/SpecialEffectEngine';
import { CombatTempoEngine, type BattleTempoStore } from '../systems/combat/CombatTempoEngine';
import { CombatMechanicsEngine, type CombatMechanicsStore } from '../systems/combat/CombatMechanicsEngine';
import { EchoRegistryService } from '../systems/echoes/EchoRegistryService';
import { InventoryService } from '../systems/inventory/InventoryService';
import { LinkService } from '../systems/link/LinkService';
import { ProgressionService, type MasteryGainResult } from '../systems/progression/ProgressionService';
import { QuestService } from '../systems/quests/QuestService';
import { SanctuaryService } from '../systems/sanctuary/SanctuaryService';
import { SaveService } from '../systems/save/SaveService';
import { WorldActionService } from '../systems/world/WorldActionService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';
import { TypeBadge } from '../ui/components/TypeBadge';

interface PendingEncounter {
  zoneId: string;
  wildChampion: ChampionInstance;
}

interface PendingDuelSession {
  duelId: string;
  trainerName: string;
  rewardGold: number;
  victoryFlag: string;
  enemyIndex: number;
  team: ChampionInstance[];
}

interface HpUi {
  fill: Phaser.GameObjects.Rectangle;
  shieldFill: Phaser.GameObjects.Rectangle;
  expFill: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  typeLayer: Phaser.GameObjects.Container;
  statusLayer: Phaser.GameObjects.Container;
  executeMarker?: Phaser.GameObjects.Rectangle;
  executeThreshold?: number;
  maxWidth: number;
  expMaxWidth: number;
  maxHp: number;
  barX: number;
  barY: number;
  showNumbers: boolean;
}

type BattleStatusStore = Record<string, CombatStatusInstance[]>;
type BattleActor = 'player' | 'enemy';

type SkillDefinition = ReturnType<typeof DataRegistry.skill>;

interface BattleConsoleOption {
  activate: () => void;
  enabled: boolean;
  setSelected: (selected: boolean) => void;
}

const ACTION_WINDUP_MS = 180;
const BETWEEN_ACTIONS_MS = 100;
const ROUND_END_MS = 120;
const EXECUTION_THRESHOLD = 0.35;
const BATTLE_VISUAL_SCALE = 0.75;

export class BattleScene extends Phaser.Scene {
  private save!: SaveGame;
  private playerChampion!: ChampionInstance;
  private wildChampion!: ChampionInstance;
  private playerStats!: StatBlock;
  private wildStats!: StatBlock;
  private playerHp = 1;
  private wildHp = 1;
  private playerHpUi!: HpUi;
  private wildHpUi!: HpUi;
  private messageText!: Phaser.GameObjects.Text;
  private playerSprite!: Phaser.GameObjects.Image;
  private wildSprite!: Phaser.GameObjects.Image;
  private playerEffectLayer!: Phaser.GameObjects.Container;
  private wildEffectLayer!: Phaser.GameObjects.Container;
  private actionArmAt = 0;
  private actionObjects: Phaser.GameObjects.GameObject[] = [];
  private overlayLayer?: Phaser.GameObjects.Container;
  private continueLayer?: Phaser.GameObjects.Container;
  private busy = false;
  private battleEnded = false;
  private awaitingSwitch = false;
  private awaitingContinue = false;
  private consoleOptions: BattleConsoleOption[] = [];
  private consoleIndex = 0;
  private consoleOverlayOptions: BattleConsoleOption[] = [];
  private consoleOverlayIndex = 0;
  private consoleOverlayCancelable = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    ConsoleInput.clearTransient();
    this.busy = false;
    this.battleEnded = false;
    this.awaitingSwitch = false;
    this.awaitingContinue = false;
    this.actionObjects = [];
    this.overlayLayer = undefined;
    this.continueLayer = undefined;
    this.consoleOptions = [];
    this.consoleIndex = 0;
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = false;

    this.save = this.registry.get('save') as SaveGame;
    const encounter = this.registry.get('pendingEncounter') as PendingEncounter | undefined;
    const activeInstanceId = this.registry.get('battle.activeInstanceId') as string | undefined;
    const playerChampion = this.save.party.find((champion) => champion.instanceId === activeInstanceId && champion.currentHp > 0)
      ?? this.save.party.find((champion) => champion.currentHp > 0);
    const wildChampion = encounter?.wildChampion;

    if (!wildChampion) {
      this.cleanupBattleSession();
      this.scene.start('WorldScene');
      return;
    }

    if (!playerChampion) {
      const recovery = SanctuaryService.recoverAfterDefeat(this.save);
      SaveService.save(this.save);
      this.cleanupBattleSession();
      this.registry.set('lastDefeat', recovery);
      this.scene.start('DefeatScene');
      return;
    }

    this.registry.set('battle.activeInstanceId', playerChampion.instanceId);
    const participants = this.participantIds();
    if (!participants.includes(playerChampion.instanceId)) {
      this.registry.set('battle.participants', [...participants, playerChampion.instanceId]);
    }

    this.playerChampion = ProgressionService.normalizeChampion(playerChampion);
    this.wildChampion = ProgressionService.normalizeChampion(wildChampion);
    this.ensureStatusStore();
    const resources = this.ensureResourceStore();
    const forms = this.ensureFormStore();
    const tempo = this.ensureTempoStore();
    this.ensureMechanicsStore();
    const battleStarted = Boolean(this.registry.get('battle.started'));
    CombatTempoEngine.initialize(this.playerChampion, tempo, battleStarted);
    CombatTempoEngine.initialize(this.wildChampion, tempo, battleStarted);
    this.registry.set('battle.started', true);
    this.persistTempoStore();

    const openingDuel = this.pendingDuel();
    if (openingDuel) {
      const openingEntry = DataRegistry.duel(openingDuel.duelId).team[openingDuel.enemyIndex];
      if (openingEntry?.formId && !forms[this.wildChampion.instanceId]) {
        forms[this.wildChampion.instanceId] = {
          formId: openingEntry.formId,
          remainingTurns: Math.max(1, Math.round(openingEntry.initialFormTurns ?? 3))
        };
      }
    }

    SpecialEffectEngine.initializeResources(this.playerChampion, resources, forms);
    SpecialEffectEngine.initializeResources(this.wildChampion, resources, forms);
    this.applyOpeningPassive(this.playerChampion, this.wildChampion);
    this.applyOpeningPassive(this.wildChampion, this.playerChampion);
    this.refreshCombatStats();
    this.playerHp = Phaser.Math.Clamp(this.playerChampion.currentHp, 1, this.statsForChampion(this.playerChampion).hp);
    this.wildHp = Phaser.Math.Clamp(this.wildChampion.currentHp, 1, this.statsForChampion(this.wildChampion).hp);

    this.drawBattlefield();
    this.createCombatants();
    this.createPanels();
    this.createActions();
    this.consoleIndex = this.findEnabledConsoleOption(0, 1);
    this.actionArmAt = this.time.now + 300;
    this.refreshConsoleSelection();
    this.refreshUi();

    const wildName = DataRegistry.champion(this.wildChampion.championId).name;
    const playerName = DataRegistry.champion(this.playerChampion.championId).name;
    const pendingEnemyAction = Boolean(this.registry.get('battle.pendingEnemyAction'));
    if (pendingEnemyAction) {
      this.registry.remove('battle.pendingEnemyAction');
      void this.resumeAfterSwitch(playerName, wildName);
      return;
    }

    const duel = this.pendingDuel();
    this.setMessage(duel
      ? `${duel.trainerName} envía a ${wildName}. ${playerName} entra al combate.`
      : DataRegistry.champion(this.wildChampion.championId).wildBehavior
        ? `${wildName} aparece inquieto: puede huir. Inmovilízalo o usa el Vinculador antes de que escape.`
        : `${wildName} salvaje aparece frente a ${playerName}.`);
  }

  update(): void {
    if (this.awaitingContinue) {
      if (ConsoleInput.consumeA()) this.input.keyboard?.emit('keydown-A');
      ConsoleInput.consumeB();
      ConsoleInput.consumeDirection();
      return;
    }

    if (this.overlayLayer) {
      const direction = ConsoleInput.consumeDirection();
      if (direction && this.consoleOverlayOptions.length > 0) {
        const delta = direction === 'up' || direction === 'left' ? -1 : 1;
        this.moveConsoleOverlay(delta);
      }
      if (ConsoleInput.consumeA()) {
        const option = this.consoleOverlayOptions[this.consoleOverlayIndex];
        if (option?.enabled) option.activate();
      }
      if (ConsoleInput.consumeB() && this.consoleOverlayCancelable) this.closeBattleOverlay(true);
      return;
    }

    if (this.busy || this.battleEnded || this.awaitingSwitch) {
      ConsoleInput.consumeA();
      ConsoleInput.consumeB();
      ConsoleInput.consumeDirection();
      return;
    }

    const direction = ConsoleInput.consumeDirection();
    if (direction) this.moveConsoleAction(direction);

    if (ConsoleInput.consumeA() && this.time.now >= this.actionArmAt) {
      const option = this.consoleOptions[this.consoleIndex];
      if (option?.enabled) option.activate();
    }
    ConsoleInput.consumeB();
  }

  private moveConsoleAction(direction: Exclude<import('../input/ConsoleInput').ConsoleDirection, 'none'>): void {
    if (this.consoleOptions.length === 0) return;
    let next = this.consoleIndex;
    if (next <= 3) {
      if (direction === 'left') next = Phaser.Math.Wrap(next - 1, 0, 4);
      else if (direction === 'right') next = next === 3 ? 4 : next + 1;
      else if (direction === 'down') next = 4;
    } else {
      if (direction === 'up') next = next === 4 ? 4 : next - 1;
      else if (direction === 'down') next = next === 7 ? 7 : next + 1;
      else if (direction === 'left') next = 3;
    }
    this.consoleIndex = this.findEnabledConsoleOption(next, direction === 'left' || direction === 'up' ? -1 : 1);
    this.refreshConsoleSelection();
  }

  private findEnabledConsoleOption(start: number, delta: number): number {
    if (this.consoleOptions[start]?.enabled) return start;
    let index = start;
    for (let attempt = 0; attempt < this.consoleOptions.length; attempt += 1) {
      index = Phaser.Math.Wrap(index + delta, 0, this.consoleOptions.length);
      if (this.consoleOptions[index]?.enabled) return index;
    }
    return this.consoleIndex;
  }

  private refreshConsoleSelection(): void {
    this.consoleOptions.forEach((option, index) => option.setSelected(index === this.consoleIndex && option.enabled));
  }

  private moveConsoleOverlay(delta: number): void {
    if (this.consoleOverlayOptions.length === 0) return;
    let index = this.consoleOverlayIndex;
    for (let attempt = 0; attempt < this.consoleOverlayOptions.length; attempt += 1) {
      index = Phaser.Math.Wrap(index + delta, 0, this.consoleOverlayOptions.length);
      if (this.consoleOverlayOptions[index]?.enabled) break;
    }
    this.consoleOverlayIndex = index;
    this.refreshConsoleOverlaySelection();
  }

  private refreshConsoleOverlaySelection(): void {
    this.consoleOverlayOptions.forEach((option, index) => option.setSelected(index === this.consoleOverlayIndex && option.enabled));
  }

  private closeBattleOverlay(resetSwitch: boolean): void {
    this.overlayLayer?.destroy(true);
    this.overlayLayer = undefined;
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = false;
    if (resetSwitch) this.awaitingSwitch = false;
  }

  private async resumeAfterSwitch(playerName: string, wildName: string): Promise<void> {
    this.busy = true;
    await this.awaitContinue(`${playerName} entra al combate. ${wildName} aprovecha el cambio.`);
    await this.resolveEnemyResponse();
  }

  private drawBattlefield(): void {
    drawCombatBackdrop(this);
    this.add.ellipse(260, 303, 220, 34, 0x000000, 0.20).setDepth(100);
    this.add.ellipse(735, 202, 184, 28, 0x000000, 0.17).setDepth(100);
  }

  private createCombatants(): void {
    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));
    this.playerSprite = this.add.image(260, 303, playerTexture).setOrigin(0.5, 1).setDepth(200);
    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);

    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));
    this.wildSprite = this.add.image(735, 202, wildTexture).setOrigin(0.5, 1).setDepth(200);
    if (this.isNarrativeEchoEnemy()) {
      const echoAura = this.add.ellipse(735, 192, 132, 42, 0x55d8ff, 0.12)
        .setStrokeStyle(2, 0xbef6ff, 0.34)
        .setDepth(180);
      this.tweens.add({
        targets: echoAura,
        alpha: { from: 0.08, to: 0.22 },
        scaleX: { from: 0.90, to: 1.10 },
        scaleY: { from: 0.90, to: 1.06 },
        duration: 760,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
    this.playerEffectLayer = this.add.container(0, 0).setDepth(400);
    this.wildEffectLayer = this.add.container(0, 0).setDepth(400);
    this.syncCombatantVisual('player', false);
    this.syncCombatantVisual('enemy', false);
  }

  private playerBattleTexture(championId: string, formId?: string): string {
    if (formId) {
      const formBack = championId + '-form-' + formId + '-battle-back';
      if (this.textures.exists(formBack)) return formBack;
      const formFront = championId + '-form-' + formId + '-battle-front';
      if (this.textures.exists(formFront)) return formFront;
    }
    const back = championId + '-battle-back';
    if (this.textures.exists(back)) return back;
    const front = championId + '-battle-front';
    if (this.textures.exists(front)) return front;
    return 'garen-battle-back';
  }

  private wildBattleTexture(championId: string, formId?: string): string {
    if (formId) {
      const formFront = championId + '-form-' + formId + '-battle-front';
      if (this.textures.exists(formFront)) return formFront;
    }
    const front = championId + '-battle-front';
    if (this.textures.exists(front)) return front;
    return 'teemo-battle-front';
  }

  private createPanels(): void {
    this.wildHpUi = this.createHpPanel('enemy', this.wildChampion, this.executionThresholdFor(this.playerChampion));
    this.playerHpUi = this.createHpPanel('player', this.playerChampion);

    this.add.image(11, 310, 'battle-ui-960', '04_dialog_panel.png').setOrigin(0, 0).setDepth(700);
    this.messageText = UiKit.label(this, 42, 329, '', '16px', UI.text.primary, true)
      .setWordWrapWidth(850, true)
      .setLineSpacing(2)
      .setDepth(710);
  }

  private createHpPanel(variant: 'enemy' | 'player', champion: ChampionInstance, executeThreshold?: number): HpUi {
    const enemy = variant === 'enemy';
    const x = enemy ? 16 : 578;
    const y = enemy ? 16 : 204;
    const panelFrame = enemy ? '02_panel_enemy.png' : '03_panel_player.png';
    const hpFrame = enemy ? '23_hp_bar_frame_enemy.png' : '24_hp_bar_frame_player.png';
    const masteryX = enemy ? 337 : 286;

    this.add.image(x, y, 'battle-ui-960', panelFrame).setOrigin(0, 0).setDepth(600);
    const typeLayer = this.add.container(x + 17, y + 41).setDepth(624);
    this.renderTypeIcons(typeLayer, champion);
    UiKit.label(this, x + 17, y + 15, DataRegistry.champion(champion.championId).name.toUpperCase(), '20px', UI.text.primary, true).setDepth(620);
    if (enemy && EchoRegistryService.state(this.save, champion.championId) === 'linked') {
      this.add.image(x + 300, y + 27, 'item-echo-linker-hextech')
        .setDisplaySize(18, 18)
        .setDepth(626)
        .setAlpha(0.92);
    }
    UiKit.label(this, x + masteryX, y + 19, 'M' + champion.mastery, '13px', UI.text.accent, true).setDepth(620);

    this.add.image(x + 68, y + 44, 'battle-ui-960', hpFrame).setOrigin(0, 0).setDepth(620);
    const barX = x + 72;
    const barY = y + 52;
    const maxWidth = 280;
    const fill = this.add.rectangle(barX, barY, maxWidth, 6, UI.colors.hp, 1).setOrigin(0, 0.5).setDepth(621);
    const shieldFill = this.add.rectangle(barX, barY, 0, 6, 0xe8f6ff, 0.98).setOrigin(0, 0.5).setVisible(false).setDepth(622);
    const text = UiKit.label(this, x + (enemy ? 336 : 300), y + 64, '', '12px', UI.text.primary, true).setOrigin(0.5, 0).setDepth(625);

    let expFill = this.add.rectangle(0, 0, 0, 0, 0x5fd8ff, 0).setVisible(false);
    if (!enemy) {
      this.add.image(x + 56, y + 77, 'battle-ui-960', '26_exp_bar_frame_player.png').setOrigin(0, 0).setDepth(620);
      expFill = this.add.rectangle(x + 60, y + 83, 280, 6, 0x5fd8ff, 1).setOrigin(0, 0.5).setDepth(621);
    }
    const statusLayer = this.add.container(x + 56, y + (enemy ? 82 : 96)).setDepth(630);

    let executeMarker: Phaser.GameObjects.Rectangle | undefined;
    if (executeThreshold !== undefined) {
      executeMarker = this.add.rectangle(barX + maxWidth * executeThreshold, barY, 2, 16, 0xffffff, 0.9).setDepth(626);
    }
    return { fill, shieldFill, expFill, text, typeLayer, statusLayer, executeMarker, executeThreshold, maxWidth, expMaxWidth: enemy ? 0 : 280, maxHp: this.statsForChampion(champion).hp, barX, barY, showNumbers: true };
  }

  private renderTypeIcons(layer: Phaser.GameObjects.Container, champion: ChampionInstance): void {
    layer.removeAll(true);
    const ids = TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion));
    ids.slice(0, 2).forEach((id, index) => {
      layer.add(TypeBadge.add(this, index * 26, 0, id, {
        width: 20,
        height: 20,
        iconSize: 12,
        showLabel: false
      }));
    });
  }

  private createActions(): void {
    const skillIds = CombatMechanicsEngine.skillIds(this.playerChampion, this.ensureFormStore(), this.ensureMechanicsStore());
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const positions = [{ x: 32, y: 420 }, { x: 192, y: 420 }, { x: 352, y: 420 }, { x: 512, y: 420 }];
    const tempo = this.ensureTempoStore();

    for (let i = 0; i < 4; i += 1) {
      const skill = DataRegistry.skill(skillIds[i]);
      const slot = slots[i];
      const rank = this.playerChampion.skillRanks[slot];
      const unlocked = rank > 0;
      const tempoCheck = unlocked ? CombatTempoEngine.canUseSkill(this.playerChampion, skill, tempo) : { allowed: false, short: `M${skill.unlockMastery}` };
      const disabled = !unlocked || !tempoCheck.allowed;
      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));
      this.createSkillActionButton(positions[i].x, positions[i].y, skill, slot, rank, TypeEffectivenessService.actionGlyph(effectiveness), () => {
        if (disabled) return;
        void this.handleCombatAction({ type: 'skill', skillId: skill.id });
      }, disabled, tempoCheck.short);
    }

    const lockedByModifier = CombatMechanicsEngine.hasLockedSkillOverride(this.playerChampion, this.ensureMechanicsStore());
    this.createWaitActionButton(718, 504, () => void this.handleCombatAction({ type: 'wait' }), lockedByModifier);
    this.createSideActionButton(780, 378, '20_action_switch.png', 'CAMBIAR', () => this.openManualSwitch(), lockedByModifier || this.availableReplacements().length === 0);
    this.createSideActionButton(780, 432, '21_action_items.png', 'OBJETOS', () => this.openBattleItems(), lockedByModifier || this.inventoryItems().length === 0);
    this.createSideActionButton(780, 486, '22_action_flee.png', 'HUIR', () => void this.flee(), lockedByModifier || this.isNpcDuel());
  }

  private createSkillActionButton(
    x: number,
    y: number,
    skill: SkillDefinition,
    slot: ActiveSkillSlot,
    rank: number,
    effectivenessGlyph: string,
    onClick: () => void,
    disabled = false,
    disabledReason?: string
  ): void {
    const baseFrame = disabled ? '07_skill_card_disabled.png' : '05_skill_card_base.png';
    const card = this.add.image(x, y, 'battle-ui-960', baseFrame).setOrigin(0, 0).setDepth(720);
    this.consoleOptions.push({
      activate: onClick,
      enabled: !disabled,
      setSelected: (selected) => {
        if (disabled) card.setFrame('07_skill_card_disabled.png');
        else card.setFrame(selected ? '06_skill_card_selected.png' : '05_skill_card_base.png');
      }
    });
    if (!disabled) {
      let pressArmed = false;
      card.setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.POINTER_OVER, () => card.setFrame('06_skill_card_selected.png'));
      card.on(Phaser.Input.Events.POINTER_OUT, () => {
        pressArmed = false;
        card.setFrame('05_skill_card_base.png');
      });
      card.on(Phaser.Input.Events.POINTER_DOWN, () => {
        pressArmed = this.time.now >= this.actionArmAt;
        if (pressArmed) card.setFrame('06_skill_card_selected.png');
      });
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        card.setFrame('05_skill_card_base.png');
        if (!pressArmed) return;
        pressArmed = false;
        onClick();
      });
    }

    this.actionObjects.push(card);
    const fontSize = skill.name.length > 18 ? '11px' : skill.name.length > 13 ? '12px' : '14px';
    this.actionObjects.push(
      UiKit.label(this, x + 72, y + 12, skill.name.toUpperCase(), fontSize, disabled ? UI.text.muted : UI.text.primary, true)
        .setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(118, true).setDepth(730)
    );
    if (disabled && disabledReason) {
      this.actionObjects.push(
        UiKit.label(this, x + 72, y + 39, disabledReason, '9px', UI.text.gold, true).setOrigin(0.5).setDepth(732)
      );
    }

    if (skill.affinityId) {
      this.actionObjects.push(TypeBadge.add(this, x + 20, y + 54, skill.affinityId, {
        width: 100, height: 21, iconSize: 15, fontSize: '9px', alpha: disabled ? 0.32 : 1
      }).setDepth(730));
    }
    if (!disabled && effectivenessGlyph) {
      this.actionObjects.push(UiKit.label(this, x + 132, y + 64, effectivenessGlyph, '16px', UI.text.accent, true).setOrigin(0.5).setDepth(730));
    }

    const maxRank = ProgressionService.maxRank(slot);
    const dotXs = slot === 'r' ? [52, 68, 84] : [36, 52, 68, 84, 100];
    for (let i = 0; i < maxRank; i += 1) {
      const frame = i < rank ? '29_rank_dot_filled.png' : '30_rank_dot_empty.png';
      this.actionObjects.push(this.add.image(x + dotXs[i], y + 94, 'battle-ui-960', frame).setOrigin(0, 0).setDepth(730).setAlpha(disabled ? 0.48 : 1));
    }

    const infoButton = this.add.rectangle(x + 132, y + 12, 16, 16, 0x031523, 0.86)
      .setStrokeStyle(1, 0x70d8ff, 0.7).setDepth(735).setInteractive({ useHandCursor: true });
    const infoLabel = UiKit.label(this, x + 132, y + 10, 'i', '11px', UI.text.accent, true).setOrigin(0.5).setDepth(736);
    infoButton.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.openSkillInfo(skill, rank);
    });
    this.actionObjects.push(infoButton, infoLabel);
  }

  private createWaitActionButton(x: number, y: number, onClick: () => void, disabled = false): void {
    const button = this.add.rectangle(x, y, 100, 32, disabled ? 0x16232c : UI.colors.panelRaised, 0.98)
      .setStrokeStyle(2, disabled ? 0x30414d : UI.colors.borderSoft).setDepth(720);
    const label = UiKit.label(this, x, y - 7, 'ESPERAR', '11px', disabled ? UI.text.muted : UI.text.primary, true)
      .setOrigin(0.5, 0).setDepth(730);
    this.consoleOptions.push({
      activate: onClick,
      enabled: !disabled,
      setSelected: (selected) => button.setStrokeStyle(2, selected ? UI.colors.gold : (disabled ? 0x30414d : UI.colors.borderSoft))
    });
    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(2, UI.colors.gold));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, UI.colors.borderSoft));
      button.on(Phaser.Input.Events.POINTER_UP, onClick);
    }
    this.actionObjects.push(button, label);
  }

  private createSideActionButton(x: number, y: number, iconFrame: string, labelText: string, onClick: () => void, disabled: boolean): void {
    const baseFrame = disabled ? '10_side_button_disabled.png' : '08_side_button_base.png';
    const button = this.add.image(x, y, 'battle-ui-960', baseFrame).setOrigin(0, 0).setDepth(720);
    this.consoleOptions.push({
      activate: onClick,
      enabled: !disabled,
      setSelected: (selected) => {
        if (disabled) button.setFrame('10_side_button_disabled.png');
        else button.setFrame(selected ? '09_side_button_selected.png' : '08_side_button_base.png');
      }
    });
    if (!disabled) {
      let pressArmed = false;
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setFrame('09_side_button_selected.png'));
      button.on(Phaser.Input.Events.POINTER_OUT, () => {
        pressArmed = false;
        button.setFrame('08_side_button_base.png');
      });
      button.on(Phaser.Input.Events.POINTER_DOWN, () => {
        pressArmed = this.time.now >= this.actionArmAt;
        if (pressArmed) button.setFrame('09_side_button_selected.png');
      });
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        button.setFrame('08_side_button_base.png');
        if (!pressArmed) return;
        pressArmed = false;
        onClick();
      });
    }
    const icon = this.add.image(x + 12, y + 12, 'battle-ui-960', iconFrame).setOrigin(0, 0).setDepth(730);
    const label = UiKit.label(this, x + 104, y + 14, labelText, '15px', disabled ? UI.text.muted : UI.text.primary, true).setOrigin(0.5, 0).setDepth(730);
    this.actionObjects.push(button, icon, label);
  }

  private openSkillInfo(skill: SkillDefinition, rank: number): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || this.overlayLayer) return;
    ConsoleInput.clearTransient();
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = true;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.image(61, 56, 'battle-ui-v2', '42_skill_info_popup.png').setOrigin(0, 0));
    objects.push(UiKit.label(this, 79, 68, skill.name.toUpperCase(), UI.font.title, UI.text.primary, true));
    objects.push(UiKit.label(this, 367, 68, rank > 0 ? 'R' + rank : 'M' + skill.unlockMastery, UI.font.tiny, rank > 0 ? UI.text.accent : UI.text.muted, true));
    objects.push(UiKit.label(this, 79, 101, COMBAT_SKILL_DESCRIPTIONS[skill.id] ?? 'Habilidad de combate del Eco.', UI.font.small, UI.text.secondary, true).setWordWrapWidth(354, true).setLineSpacing(4));
    const tags = this.skillEffectTags(skill);
    if (tags) objects.push(UiKit.label(this, 79, 189, tags, UI.font.tiny, UI.text.gold, true).setWordWrapWidth(354, true));
    const close = UiKit.button(this, 256, 218, 96, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setScale(1.875).setDepth(12000);
  }

  private skillEffectTags(skill: SkillDefinition): string {
    const tags = new Set<string>();
    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());
    if ((skill.accuracy ?? 1) < 0.999) tags.add(`PRECISIÓN ${Math.round((skill.accuracy ?? 1) * 100)}%`);
    if (skill.slot !== 'passive') tags.add(CombatTempoEngine.cooldownLabel(skill));
    for (const effect of skill.effects) {
      if (effect.type === 'damage') tags.add(effect.handlerId === 'fixed-damage' ? 'DAÑO FIJO' : effect.stat === 'power' ? 'DAÑO MÁGICO' : 'DAÑO FÍSICO');
      if (effect.type === 'heal') tags.add('CURACIÓN');
      if (effect.statusKind === 'shield') tags.add('ESCUDO');
      if (effect.statusKind === 'poison') tags.add('VENENO');
      if (effect.statusKind === 'burn') tags.add('QUEMADURA');
      if (effect.statusKind === 'blind') tags.add('CEGUERA');
      if (effect.statusKind === 'stun') tags.add('ATURDIMIENTO');
      if (effect.statusKind === 'charm') tags.add('ENAMORAMIENTO');
      if (effect.statusKind === 'taunt') tags.add('PROVOCACIÓN');
      if (effect.statusKind === 'block') tags.add('BLOQUEO');
      if (effect.statusKind === 'trap') tags.add('TRAMPA');
      if ((effect.hits ?? 1) > 1) tags.add(`${effect.hits} IMPACTOS`);
      if (effect.handlerId === 'execute-low-hp') tags.add('EJECUCIÓN');
      if (effect.handlerId === 'destierro-temporal') tags.add('DESTIERRO');
      if (effect.handlerId === 'transformacion-control') tags.add('TRANSFORMACIÓN');
      if (effect.handlerId === 'marca-explosiva') tags.add('BOMBA');
      if (effect.handlerId === 'aumento-evasion') tags.add('EVASIÓN ↑');
      if (effect.handlerId === 'precision-habilidad') tags.add('PRECISIÓN ↑');
      if (effect.handlerId === 'recarga') tags.add('RECARGA');
      if (effect.handlerId === 'transformar-forma') tags.add('CAMBIO DE FORMA');
      if (effect.type === 'buff' && effect.stat === 'speed') tags.add('VELOCIDAD ↑');
      if (effect.type === 'buff' && (effect.stat === 'defense' || effect.stat === 'resistance')) tags.add('DEFENSA ↑');
      if (effect.type === 'debuff' && effect.stat === 'speed') tags.add('RALENTIZA');
    }
    return [...tags].join(' · ');
  }

  private async handleCombatAction(playerAction: CombatAction): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    if (this.time.now < this.actionArmAt) return;
    if (playerAction.type === 'skill') {
      const skill = DataRegistry.skill(playerAction.skillId);
      const tempoCheck = CombatTempoEngine.canUseSkill(this.playerChampion, skill, this.ensureTempoStore());
      if (!tempoCheck.allowed) {
        this.setMessage(tempoCheck.message ?? 'Esa habilidad todavía no está disponible.');
        return;
      }
      const check = SpecialEffectEngine.canUseSkill(this.playerChampion, skill, this.ensureResourceStore());
      if (!check.allowed) {
        this.setMessage(check.message ?? 'No puedes usar esa habilidad todavía.');
        return;
      }
      if (CombatMechanicsEngine.isPreActionSkill(skill)) {
        await this.activatePlayerPreAction(skill);
        return;
      }
    }
    this.busy = true;
    this.refreshCombatStats();
    const enemyAction = this.chooseEnemyAction();
    const playerFirst = BattleEngine.playerActsFirst(
      this.playerChampion,
      this.wildChampion,
      playerAction,
      enemyAction,
      this.playerStats,
      this.wildStats
    );
    const order: BattleActor[] = playerFirst ? ['player', 'enemy'] : ['enemy', 'player'];

    for (let i = 0; i < order.length; i += 1) {
      const actor = order[i];
      if (this.battleEnded || this.awaitingSwitch || this.playerHp <= 0 || this.wildHp <= 0) break;
      if (actor === 'player') await this.performAction('player', playerAction);
      else await this.performAction('enemy', enemyAction);
      if (!this.battleEnded && !this.awaitingSwitch && i < order.length - 1) await this.wait(BETWEEN_ACTIONS_MS);
    }

    if (!this.battleEnded && !this.awaitingSwitch && this.playerHp > 0 && this.wildHp > 0) {
      await this.wait(ROUND_END_MS);
      this.busy = false;
      this.refreshUi();
      this.setMessage(this.idlePrompt());
    }
  }

  private async activatePlayerPreAction(skill: SkillDefinition): Promise<void> {
    const tempo = this.ensureTempoStore();
    const mechanics = this.ensureMechanicsStore();
    const forms = this.ensureFormStore();
    const resources = this.ensureResourceStore();

    if (skill.effects.some((effect) => effect.handlerId === 'armar-habilidades-potenciadas')) {
      const baseIds = SpecialEffectEngine.skillIds(this.playerChampion, forms);
      const basicSlots: ActiveSkillSlot[] = ['q', 'w', 'e'];
      const hasAvailableBasic = basicSlots.some((slot, index) => {
        if ((this.playerChampion.skillRanks[slot] ?? 0) <= 0) return false;
        return CombatTempoEngine.canUseSkill(this.playerChampion, DataRegistry.skill(baseIds[index]), tempo).allowed;
      });
      if (!hasAvailableBasic) {
        this.setMessage('Mantra necesita al menos una habilidad básica disponible.');
        return;
      }
    }

    this.busy = true;
    const rank = BattleEngine.skillRank(this.playerChampion, skill);
    CombatTempoEngine.startSkillCooldown(this.playerChampion, skill, tempo);
    const powerMultiplier =
      SpecialEffectEngine.skillPowerMultiplier(this.playerChampion, skill, resources, forms) *
      CombatMechanicsEngine.skillPowerMultiplier(this.playerChampion, skill, undefined, mechanics, forms);
    StatusEngine.applySkillEffects(
      skill,
      rank,
      this.statusesFor(this.playerChampion),
      this.statusesFor(this.wildChampion),
      false,
      powerMultiplier,
      this.playerChampion.instanceId
    );
    const messages = CombatMechanicsEngine.activatePreAction(this.playerChampion, skill, mechanics);
    this.persistStatusStore();
    this.persistTempoStore();
    this.persistMechanicsStore();
    this.refreshUi();
    await this.awaitContinue(`${DataRegistry.champion(this.playerChampion.championId).name} activa ${skill.name}.`);
    for (const message of messages) await this.awaitContinue(message);
    this.busy = false;
    this.actionArmAt = this.time.now + 120;
    this.rebuildActions();
    this.setMessage(this.idlePrompt());
  }

  private async performAction(actor: BattleActor, action: CombatAction, skipTurnStart = false): Promise<void> {
    const attacker = actor === 'player' ? this.playerChampion : this.wildChampion;
    const defender = actor === 'player' ? this.wildChampion : this.playerChampion;
    const attackerName = DataRegistry.champion(attacker.championId).name;
    const defenderName = DataRegistry.champion(defender.championId).name;

    const attemptsEscape = actor === 'enemy' && !skipTurnStart && WildEscapeService.wantsToFlee(
      DataRegistry.champion(attacker.championId), this.statusesFor(attacker), this.isNpcDuel()
    );
    if (!skipTurnStart && !await this.beginActorTurn(actor, attemptsEscape ? { type: 'wait' } : action)) return;
    if (this.battleEnded || this.awaitingSwitch) return;
    if (attemptsEscape && WildEscapeService.canFlee(this.statusesFor(attacker))) {
      await this.finishWildEscape();
      return;
    }

    if (actor === 'enemy' && action.type === 'skill') {
      const preSkill = DataRegistry.skill(action.skillId);
      if (CombatMechanicsEngine.isPreActionSkill(preSkill)) {
        await this.activateEnemyPreAction(preSkill);
        if (this.battleEnded || this.awaitingSwitch) return;
        await this.performAction('enemy', this.chooseEnemyAction(), true);
        return;
      }
    }

    this.refreshCombatStats();
    const attackerStats = actor === 'player' ? this.playerStats : this.wildStats;
    const defenderStats = actor === 'player' ? this.wildStats : this.playerStats;
    const attackerStatuses = this.statusesFor(attacker);
    const defenderStatuses = this.statusesFor(defender);
    const targetSprite = actor === 'player' ? this.wildSprite : this.playerSprite;
    const defenderHp = actor === 'player' ? this.wildHp : this.playerHp;
    const defenderMaxHp = this.statsForChampion(defender).hp;
    const attackerMaxHpBefore = this.statsForChampion(attacker).hp;
    const resources = this.ensureResourceStore();
    const forms = this.ensureFormStore();
    const tempo = this.ensureTempoStore();
    const mechanics = this.ensureMechanicsStore();

    if (action.type === 'wait') {
      this.setMessage(`${attackerName} espera y recompone su ritmo.`);
      const waitResult = CombatMechanicsEngine.onActionResolved(
        attacker,
        action,
        null,
        true,
        undefined,
        this.statsForChampion(attacker).hp,
        this.ensureMechanicsStore(),
        this.ensureFormStore()
      );
      this.persistMechanicsStore();
      await this.wait(260);
      for (const message of waitResult.messages) await this.awaitContinue(message);
      await this.finishActorTurn(actor);
      return;
    }
    if (action.type === 'switch') return;

    let resolution;
    let skill: SkillDefinition | null = null;
    let rank = 1;
    let effectiveness = TypeEffectivenessService.multiplier(undefined, []);
    let stabMultiplier = 1;
    if (action.type === 'basic') {
      resolution = BattleEngine.resolveBasicAttack(attackerStats, defenderStats);
    } else {
      skill = DataRegistry.skill(action.skillId);
      rank = BattleEngine.skillRank(attacker, skill);
      if (!CombatMechanicsEngine.shouldDeferCooldown(skill)) {
        CombatTempoEngine.startSkillCooldown(attacker, skill, tempo);
      }
      CombatTempoEngine.scheduleDelayedDamage(attacker, defender, skill, rank, tempo);
      effectiveness = TypeEffectivenessService.forSkill(skill, defender, this.currentFormId(defender));
      stabMultiplier = TypeEffectivenessService.stabMultiplier(skill, attacker, this.currentFormId(attacker));
      const markStacksById = CombatMechanicsEngine.markStacksById(attacker, defender.instanceId, skill, mechanics, forms);
      const effectPowerMultiplier =
        SpecialEffectEngine.skillPowerMultiplier(attacker, skill, resources, forms) *
        CombatMechanicsEngine.skillPowerMultiplier(attacker, skill, defender.instanceId, mechanics, forms);
      const fourthAct = CombatTempoEngine.isJhinFourthAct(attacker, action, tempo);
      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {
        defenderCurrentHp: defenderHp,
        defenderMaxHp,
        affinityMultiplier: effectiveness.multiplier,
        stabMultiplier,
        effectPowerMultiplier,
        criticalMultiplier: fourthAct ? 1.5 : 1,
        missingHpScale: fourthAct ? 0.5 : 0,
        markStacksById
      });

      const extraHitRatio = CombatMechanicsEngine.extraHitRatio(attacker, skill, mechanics, forms);
      if (extraHitRatio > 0 && resolution.damage > 0) {
        const extraHit = Math.max(1, Math.round(attackerStats.attack * extraHitRatio));
        resolution.damage += extraHit;
        resolution.damageInstances.push(extraHit);
      }
    }
    this.persistTempoStore();
    this.persistMechanicsStore();

    if (resolution.damage > 0) {
      const passiveBonus = SpecialEffectEngine.bonusDamageFromPassive(attacker, forms);
      if (passiveBonus > 0) {
        const passive = SpecialEffectEngine.passive(attacker, this.ensureFormStore());
        const passiveEffectiveness = TypeEffectivenessService.forSkill(passive, defender, this.currentFormId(defender));
        const passiveStab = TypeEffectivenessService.stabMultiplier(passive, attacker, this.currentFormId(attacker));
        const bonus = Math.max(0, Math.round(passiveBonus * passiveEffectiveness.multiplier * passiveStab));
        resolution.damage += bonus;
        if (bonus > 0) {
          if (resolution.damageInstances.length > 0) resolution.damageInstances[0] += bonus;
          else resolution.damageInstances.push(bonus);
        }
      }
      const fixedBonus = Math.max(0, Math.round(SpecialEffectEngine.fixedBonusDamageFromPassive(attacker, skill, forms)));
      resolution.damage += fixedBonus;
      if (fixedBonus > 0) {
        if (resolution.damageInstances.length > 0) resolution.damageInstances[0] += fixedBonus;
        else resolution.damageInstances.push(fixedBonus);
      }
    }

    const damagingAction = BattleEngine.actionHasDamage(action);
    const blindChance = damagingAction ? StatusEngine.blindMissChance(attackerStatuses) : 0;
    const evasionChance = damagingAction ? StatusEngine.evasionMissChance(defenderStatuses) : 0;
    const accuracyBonus = damagingAction ? StatusEngine.accuracyBonus(attackerStatuses) : 0;
    const baseAccuracy = damagingAction ? Phaser.Math.Clamp((skill?.accuracy ?? 1) + accuracyBonus, 0.05, 1) : 1;
    const hitChance = baseAccuracy * (1 - blindChance) * (1 - evasionChance);
    const missed = damagingAction && Math.random() > hitChance;

    await this.awaitContinue(`${attackerName} usa ${resolution.label}.`);
    await this.wait(ACTION_WINDUP_MS);
    await this.animateAction(actor, skill, resolution.damage > 0);

    if (missed) {
      const markStacksById = skill
        ? CombatMechanicsEngine.markStacksById(attacker, defender.instanceId, skill, mechanics, forms)
        : {};
      const effectPowerMultiplier = skill
        ? SpecialEffectEngine.skillPowerMultiplier(attacker, skill, resources, forms) *
          CombatMechanicsEngine.skillPowerMultiplier(attacker, skill, defender.instanceId, mechanics, forms)
        : 1;
      const application = skill
        ? StatusEngine.applySkillEffects(
          skill,
          rank,
          attackerStatuses,
          defenderStatuses,
          false,
          effectPowerMultiplier,
          attacker.instanceId,
          { markStacksById }
        )
        : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
      const specials = skill
        ? SpecialEffectEngine.onSkillResolved(attacker, skill, resources, forms, attackerStatuses, false)
        : { messages: [], appliedStatusIds: [] };
      const mechanicsResult = CombatMechanicsEngine.onActionResolved(
        attacker,
        action,
        skill,
        false,
        defender.instanceId,
        attackerMaxHpBefore,
        mechanics,
        forms
      );
      const transformedOnMiss = skill
        ? SpecialEffectEngine.applyTransformation(attacker, skill, resources, forms)
        : null;
      if (skill && CombatMechanicsEngine.shouldDeferCooldown(skill)) {
        CombatTempoEngine.startSkillCooldown(attacker, skill, tempo);
      }
      const tempoResult = CombatTempoEngine.onActionResolved(attacker, action, skill, false, tempo);
      if (transformedOnMiss) this.syncFormVisualAndHp(actor, attackerMaxHpBefore);
      this.persistSpecialStores();
      this.persistStatusStore();
      this.persistTempoStore();
      this.persistMechanicsStore();
      this.refreshUi();
      const missMessage = evasionChance > 0
        ? `${defenderName} evita el ataque.`
        : blindChance > 0
          ? `${attackerName} falla por Ceguera.`
          : `${attackerName} falla el ataque.`;
      await this.awaitContinue(missMessage);
      await this.announceAppliedStatuses(attacker, attackerStatuses, application.selfAppliedIds);
      await this.announceAppliedStatuses(attacker, attackerStatuses, specials.appliedStatusIds);
      for (const message of specials.messages) await this.awaitContinue(message);
      for (const message of mechanicsResult.messages) await this.awaitContinue(message);
      for (const message of tempoResult.messages) await this.awaitContinue(message);
      if (transformedOnMiss) {
        await this.awaitContinue(`${attackerName} cambia a ${DataRegistry.form(attacker.championId, transformedOnMiss.formId).name}.`);
      }
      await this.finishActorTurn(actor, [...application.selfAppliedIds, ...specials.appliedStatusIds], Boolean(transformedOnMiss));
      return;
    }

    const directBlock = resolution.damage > 0 ? StatusEngine.consumeDirectBlock(defenderStatuses) : null;
    let actualDamage = 0;
    let absorbedDamage = 0;
    let interceptedDamage = 0;
    let summonName: string | undefined;
    let summonBroken = false;
    const brokenShields: CombatStatusInstance[] = [];
    const damageInstances = resolution.damageInstances.length > 0 ? resolution.damageInstances : (resolution.damage > 0 ? [resolution.damage] : []);
    if (!directBlock) {
      for (const instance of damageInstances) {
        const intercepted = CombatMechanicsEngine.interceptDamage(defender, instance, mechanics);
        interceptedDamage += intercepted.intercepted;
        summonName = intercepted.summonName ?? summonName;
        summonBroken = summonBroken || Boolean(intercepted.summonBroken);
        const shieldResult = StatusEngine.absorbDamage(defenderStatuses, intercepted.ownerDamage);
        actualDamage += shieldResult.damage;
        absorbedDamage += shieldResult.absorbed;
        brokenShields.push(...shieldResult.brokenStatuses);
        if (shieldResult.damage > 0) {
          StatusEngine.chargeExplosive(defenderStatuses);
          SpecialEffectEngine.onDamageTaken(defender, this.ensureResourceStore(), this.ensureFormStore());
        }
      }
    }
    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - actualDamage);
    else this.playerHp = Math.max(0, this.playerHp - actualDamage);

    const essenceHeal = directBlock ? 0 : CombatTempoEngine.recordDamageInstances(attacker, damageInstances.length, attackerMaxHpBefore, tempo);
    if (essenceHeal > 0) {
      if (actor === 'player') this.playerHp = Math.min(attackerMaxHpBefore, this.playerHp + essenceHeal);
      else this.wildHp = Math.min(attackerMaxHpBefore, this.wildHp + essenceHeal);
    }

    if (resolution.heal > 0) {
      if (actor === 'player') this.playerHp = Math.min(this.statsForChampion(attacker).hp, this.playerHp + resolution.heal);
      else this.wildHp = Math.min(this.statsForChampion(attacker).hp, this.wildHp + resolution.heal);
    }

    let shieldExplosionDamage = 0;
    for (const brokenShield of brokenShields) {
      const endEffect = CombatMechanicsEngine.shieldEndEffect(brokenShield);
      if (!endEffect) continue;
      shieldExplosionDamage += endEffect.damage;
      StatusEngine.applyStatModifier(
        attackerStatuses,
        `${brokenShield.id}-slow`,
        'Ralentización',
        'speed',
        endEffect.slowPower,
        endEffect.slowTurns,
        brokenShield.sourceSkillId
      );
    }
    if (shieldExplosionDamage > 0) {
      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - shieldExplosionDamage);
      else this.wildHp = Math.max(0, this.wildHp - shieldExplosionDamage);
    }

    const markStacksById = skill
      ? CombatMechanicsEngine.markStacksById(attacker, defender.instanceId, skill, mechanics, forms)
      : {};
    const effectPowerMultiplier = skill
      ? SpecialEffectEngine.skillPowerMultiplier(attacker, skill, resources, forms) *
        CombatMechanicsEngine.skillPowerMultiplier(attacker, skill, defender.instanceId, mechanics, forms)
      : 1;
    const application = skill
      ? StatusEngine.applySkillEffects(
        skill,
        rank,
        attackerStatuses,
        defenderStatuses,
        true,
        effectPowerMultiplier,
        attacker.instanceId,
        { markStacksById }
      )
      : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
    if (skill) {
      StatusEngine.setAffinityMultiplier(defenderStatuses, application.enemyAppliedIds, effectiveness.multiplier);
      StatusEngine.setStabMultiplier(defenderStatuses, application.enemyAppliedIds, stabMultiplier);
    }
    const transformed = skill
      ? SpecialEffectEngine.applyTransformation(attacker, skill, resources, forms)
      : null;
    const specials = skill
      ? SpecialEffectEngine.onSkillResolved(attacker, skill, resources, forms, attackerStatuses, true)
      : { messages: [], appliedStatusIds: [] };
    const mechanicsResult = CombatMechanicsEngine.onActionResolved(
      attacker,
      action,
      skill,
      true,
      defender.instanceId,
      attackerMaxHpBefore,
      mechanics,
      forms
    );
    const tempoResult = CombatTempoEngine.onActionResolved(attacker, action, skill, true, tempo);
    if (transformed) this.syncFormVisualAndHp(actor, attackerMaxHpBefore);
    this.persistSpecialStores();
    this.persistStatusStore();
    this.persistTempoStore();
    this.persistMechanicsStore();
    this.refreshUi();

    if (actualDamage > 0) this.hitFeedback(targetSprite);
    const effectivenessMessage = skill && actualDamage > 0 ? TypeEffectivenessService.battleMessage(effectiveness) : null;
    if (effectivenessMessage) await this.awaitContinue(effectivenessMessage);
    if (directBlock) {
      await this.awaitContinue(`${defenderName} bloquea por completo el ataque con su Refugio.`);
    } else if (interceptedDamage > 0 && summonName) {
      await this.awaitContinue(`${summonName} intercepta ${interceptedDamage} de daño dirigido a ${defenderName}.`);
      if (summonBroken) await this.awaitContinue(`${summonName} cae y abandona el combate.`);
    }
    if (!directBlock && absorbedDamage > 0) {
      await this.awaitContinue(
        actualDamage > 0
          ? `El escudo de ${defenderName} amortigua el golpe.`
          : `${defenderName} bloquea el impacto con su escudo.`
      );
    }
    if (resolution.notes.includes('EJECUCIÓN')) {
      await this.awaitContinue('¡El rival ha cruzado el umbral de ejecución!');
    }
    if (resolution.notes.includes('CRÍTICO')) await this.awaitContinue('¡Golpe crítico!');
    if (essenceHeal > 0) await this.awaitContinue(`${attackerName} roba esencia y recupera Vida.`);
    if (shieldExplosionDamage > 0) await this.awaitContinue('El escudo detona al romperse y ralentiza al atacante.');

    await this.announceAppliedStatuses(attacker, attackerStatuses, application.selfAppliedIds);
    await this.announceAppliedStatuses(attacker, attackerStatuses, specials.appliedStatusIds);
    await this.announceAppliedStatuses(defender, defenderStatuses, application.enemyAppliedIds);
    for (const message of specials.messages) await this.awaitContinue(message);
    for (const message of mechanicsResult.messages) await this.awaitContinue(message);
    for (const message of tempoResult.messages) await this.awaitContinue(message);
    if (transformed) await this.awaitContinue(`${attackerName} cambia a ${DataRegistry.form(attacker.championId, transformed.formId).name}.`);

    if (this.wildHp <= 0) {
      await this.finishVictory();
      return;
    }
    if (this.playerHp <= 0) {
      await this.handlePlayerKnockout();
      return;
    }

    const passiveHeal = BattleEngine.passiveHealing(attacker, this.currentFormId(attacker));
    if (passiveHeal > 0) {
      if (actor === 'player') {
        const healed = Math.min(passiveHeal, this.statsForChampion(attacker).hp - this.playerHp);
        this.playerHp += healed;
      } else {
        this.wildHp += Math.min(passiveHeal, this.statsForChampion(attacker).hp - this.wildHp);
      }
      this.refreshUi();
    }

    await this.finishActorTurn(actor, [...application.selfAppliedIds, ...specials.appliedStatusIds], Boolean(transformed));
  }

  private async beginActorTurn(actor: BattleActor, action?: CombatAction): Promise<boolean> {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const opponent = actor === 'player' ? this.wildChampion : this.playerChampion;
    const statuses = this.statusesFor(champion);
    const opponentStatuses = this.statusesFor(opponent);
    const name = DataRegistry.champion(champion.championId).name;
    const opponentName = DataRegistry.champion(opponent.championId).name;

    const delayedEvents = CombatTempoEngine.consumeDelayedDamage(champion, this.ensureTempoStore());
    for (const event of delayedEvents) {
      if (event.targetInstanceId !== opponent.instanceId) continue;
      const shield = StatusEngine.absorbDamage(opponentStatuses, event.power);
      if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - shield.damage);
      else this.playerHp = Math.max(0, this.playerHp - shield.damage);
      if (shield.damage > 0) {
        StatusEngine.chargeExplosive(opponentStatuses);
        SpecialEffectEngine.onDamageTaken(opponent, this.ensureResourceStore(), this.ensureFormStore());
        this.hitFeedback(actor === 'player' ? this.wildSprite : this.playerSprite);
      }
      const heal = CombatTempoEngine.recordDamageInstances(champion, 1, this.statsForChampion(champion).hp, this.ensureTempoStore());
      if (heal > 0) {
        if (actor === 'player') this.playerHp = Math.min(this.statsForChampion(champion).hp, this.playerHp + heal);
        else this.wildHp = Math.min(this.statsForChampion(champion).hp, this.wildHp + heal);
      }
      this.persistTempoStore();
      this.refreshUi();
      await this.awaitContinue(`El ${event.label} regresa y causa ${event.power} de daño real a ${opponentName}.`);
      if (heal > 0) await this.awaitContinue(`${name} roba esencia y recupera Vida.`);
      if (this.wildHp <= 0) { await this.finishVictory(); return false; }
      if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }
    }

    const explosive = StatusEngine.consumeExplosiveDetonation(statuses);
    if (explosive) {
      const shield = StatusEngine.absorbDamage(statuses, explosive.damage);
      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - shield.damage);
      else this.wildHp = Math.max(0, this.wildHp - shield.damage);
      this.statusTickFeedback(actor === 'player' ? this.playerSprite : this.wildSprite);
      this.refreshUi();
      await this.awaitContinue(`¡La Carga explosiva detona sobre ${name}${explosive.stacks > 0 ? ` con ${explosive.stacks} carga${explosive.stacks === 1 ? '' : 's'}` : ''}!`);
      if (this.wildHp <= 0) { await this.finishVictory(); return false; }
      if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }
    }

    const poisonDamage = StatusEngine.poisonDamage(statuses);
    if (poisonDamage > 0) {
      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - poisonDamage);
      else this.wildHp = Math.max(0, this.wildHp - poisonDamage);
      this.statusTickFeedback(actor === 'player' ? this.playerSprite : this.wildSprite);
      this.refreshUi();
      await this.awaitContinue(`El veneno daña a ${name}.`);
      if (this.wildHp <= 0) { await this.finishVictory(); return false; }
      if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }
    }

    const burnDamage = StatusEngine.burnDamage(statuses);
    if (burnDamage > 0) {
      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - burnDamage);
      else this.wildHp = Math.max(0, this.wildHp - burnDamage);
      this.statusTickFeedback(actor === 'player' ? this.playerSprite : this.wildSprite);
      this.refreshUi();
      await this.awaitContinue(`La quemadura daña a ${name}.`);
      if (this.wildHp <= 0) { await this.finishVictory(); return false; }
      if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }
    }

    const returnBanishIndex = statuses.findIndex((status) =>
      status.kind === 'banish' && status.params?.saleSinPerderTurno === true
    );
    if (returnBanishIndex >= 0) {
      statuses.splice(returnBanishIndex, 1);
      await this.awaitContinue(`${name} reaparece desde el Umbral y puede actuar.`);
      this.persistStatusStore();
    }

    const blocked = StatusEngine.blockingKind(statuses);
    if (blocked) {
      const message = blocked === 'banish'
        ? `${name} está fuera del combate este turno.`
        : blocked === 'polymorph'
          ? `${name} está transformado y no puede actuar.`
          : blocked === 'recharge'
            ? `${name} necesita este turno para recuperarse.`
            : blocked === 'airborne'
              ? `${name} está por los aires y pierde su acción.`
              : `${name} está aturdido y no puede actuar.`;
      await this.awaitContinue(message);
      await this.finishActorTurn(actor);
      return false;
    }

    if (action && CombatTempoEngine.isActionOffensive(action)) {
      const trap = StatusEngine.consumeTrap(statuses);
      if (trap) {
        const shield = StatusEngine.absorbDamage(statuses, trap.damage);
        if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - shield.damage);
        else this.wildHp = Math.max(0, this.wildHp - shield.damage);
        StatusEngine.applyStatModifier(statuses, 'jhin-captive-audience-slow', 'Ralentización', 'speed', trap.slowPower, 2, trap.sourceSkillId);
        if (shield.damage > 0) SpecialEffectEngine.onDamageTaken(champion, this.ensureResourceStore(), this.ensureFormStore());
        this.statusTickFeedback(actor === 'player' ? this.playerSprite : this.wildSprite);
        this.refreshUi();
        await this.awaitContinue(`¡Público cautivo detona bajo ${name} y lo ralentiza!`);
        if (this.wildHp <= 0) { await this.finishVictory(); return false; }
        if (this.playerHp <= 0) { await this.handlePlayerKnockout(); return false; }
      }

      const charmChance = StatusEngine.charmFailureChance(statuses);
      if (charmChance > 0 && Math.random() < charmChance) {
        await this.awaitContinue(`${name} está enamorado y no consigue atacar.`);
        await this.finishActorTurn(actor);
        return false;
      }
    }
    return true;
  }

  private async announceAppliedStatuses(champion: ChampionInstance, statuses: CombatStatusInstance[], ids: string[]): Promise<void> {
    const name = DataRegistry.champion(champion.championId).name;
    for (const id of ids) {
      const status = statuses.find((entry) => entry.id === id);
      if (!status) continue;
      let message: string | null = null;
      if (status.kind === 'poison') message = `¡${name} está envenenado!`;
      if (status.kind === 'burn') message = `¡${name} sufre una quemadura!`;
      if (status.kind === 'blind') message = `¡${name} queda cegado!`;
      if (status.kind === 'stun') message = `¡${name} queda aturdido!`;
      if (status.kind === 'root') message = `¡${name} queda inmovilizado!`;
      if (status.kind === 'airborne') message = `¡${name} sale por los aires!`;
      if (status.kind === 'shield') message = `${name} obtiene un escudo.`;
      if (status.kind === 'evasion') message = `${name} aumenta su evasión.`;
      if (status.kind === 'accuracy') message = `${name} afina su precisión.`;
      if (status.kind === 'recharge') message = `${name} necesitará recargar tras este esfuerzo.`;
      if (status.kind === 'polymorph') message = `¡${name} queda transformado!`;
      if (status.kind === 'banish') message = `¡${name} es expulsado temporalmente del combate!`;
      if (status.kind === 'explosive') message = `¡${name} queda marcado con una Carga explosiva!`;
      if (status.kind === 'charm') message = `¡${name} queda enamorado!`;
      if (status.kind === 'taunt') message = `¡${name} queda provocado y deberá fijar al provocador como objetivo!`;
      if (status.kind === 'block') message = `${name} prepara un Refugio contra el siguiente ataque directo.`;
      if (status.kind === 'trap') message = `¡${name} queda marcado por una trampa!`;
      if (message) await this.awaitContinue(message);
    }
  }

  private async finishActorTurn(actor: BattleActor, protectedIds: string[] = [], skipFormAdvance = false): Promise<void> {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const opponent = actor === 'player' ? this.wildChampion : this.playerChampion;
    const championStatuses = this.statusesFor(champion);
    const opponentStatuses = this.statusesFor(opponent);
    const removedStatuses = StatusEngine.advanceTurn(championStatuses, protectedIds);
    const forms = this.ensureFormStore();
    const tempo = this.ensureTempoStore();
    const mechanics = this.ensureMechanicsStore();

    SpecialEffectEngine.onTurnFinished(champion, this.ensureResourceStore(), forms);
    CombatTempoEngine.finishTurn(champion, tempo);
    const mechanicsTurn = CombatMechanicsEngine.finishTurn(champion, championStatuses, mechanics, forms);
    for (const baseSkillId of mechanicsTurn.expiredRecastSkillIds) {
      CombatTempoEngine.startSkillCooldownById(champion, baseSkillId, tempo);
    }

    let expirationDamage = 0;
    for (const removed of removedStatuses) {
      const endEffect = CombatMechanicsEngine.shieldEndEffect(removed);
      if (!endEffect) continue;
      expirationDamage += endEffect.damage;
      StatusEngine.applyStatModifier(
        opponentStatuses,
        `${removed.id}-slow`,
        'Ralentización',
        'speed',
        endEffect.slowPower,
        endEffect.slowTurns,
        removed.sourceSkillId
      );
    }
    if (expirationDamage > 0) {
      if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - expirationDamage);
      else this.playerHp = Math.max(0, this.playerHp - expirationDamage);
    }

    if (mechanicsTurn.summonAttack && !this.battleEnded) {
      const interception = CombatMechanicsEngine.interceptDamage(opponent, mechanicsTurn.summonAttack.damage, mechanics);
      const shield = StatusEngine.absorbDamage(opponentStatuses, interception.ownerDamage);
      if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - shield.damage);
      else this.playerHp = Math.max(0, this.playerHp - shield.damage);
    }

    if (!skipFormAdvance && this.currentFormId(champion)) {
      const oldMaxHp = this.statsForChampion(champion).hp;
      SpecialEffectEngine.decrementFormAfterAction(champion, forms);
      const state = SpecialEffectEngine.formState(champion, forms);
      if (state && !state.persistentUntilBench && state.remainingTurns <= 0) {
        SpecialEffectEngine.expireFormAtTurnStart(champion, forms);
        this.syncFormVisualAndHp(actor, oldMaxHp);
      }
    }

    this.persistSpecialStores();
    this.persistStatusStore();
    this.persistTempoStore();
    this.persistMechanicsStore();
    this.refreshUi();

    if (expirationDamage > 0) await this.awaitContinue('El escudo expira, estalla y ralentiza al rival.');
    if (mechanicsTurn.summonAttack) {
      await this.awaitContinue(`${mechanicsTurn.summonAttack.name} golpea al rival y causa ${mechanicsTurn.summonAttack.damage} de daño.`);
    }
    for (const message of mechanicsTurn.messages) await this.awaitContinue(message);

    if (this.wildHp <= 0) {
      await this.finishVictory();
      return;
    }
    if (this.playerHp <= 0) {
      await this.handlePlayerKnockout();
      return;
    }

    if (actor === 'player' && !this.battleEnded) this.rebuildActions();
  }

  private async activateEnemyPreAction(skill: SkillDefinition): Promise<void> {
    const tempo = this.ensureTempoStore();
    const mechanics = this.ensureMechanicsStore();
    const forms = this.ensureFormStore();
    const resources = this.ensureResourceStore();
    const rank = BattleEngine.skillRank(this.wildChampion, skill);

    CombatTempoEngine.startSkillCooldown(this.wildChampion, skill, tempo);
    const powerMultiplier =
      SpecialEffectEngine.skillPowerMultiplier(this.wildChampion, skill, resources, forms) *
      CombatMechanicsEngine.skillPowerMultiplier(this.wildChampion, skill, undefined, mechanics, forms);
    StatusEngine.applySkillEffects(
      skill,
      rank,
      this.statusesFor(this.wildChampion),
      this.statusesFor(this.playerChampion),
      false,
      powerMultiplier,
      this.wildChampion.instanceId
    );
    const messages = CombatMechanicsEngine.activatePreAction(this.wildChampion, skill, mechanics);
    this.persistStatusStore();
    this.persistTempoStore();
    this.persistMechanicsStore();
    this.refreshUi();
    await this.awaitContinue(`${DataRegistry.champion(this.wildChampion.championId).name} activa ${skill.name}.`);
    for (const message of messages) await this.awaitContinue(message);
  }

  private chooseEnemyAction(): CombatAction {
    const resources = this.ensureResourceStore();
    const tempo = this.ensureTempoStore();
    const forms = this.ensureFormStore();
    const mechanics = this.ensureMechanicsStore();
    const ids = CombatMechanicsEngine.skillIds(this.wildChampion, forms, mechanics);
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const usable = ids
      .map((id, index) => ({ skill: DataRegistry.skill(id), slot: slots[index] }))
      .filter(({ slot }) => (this.wildChampion.skillRanks[slot] ?? 0) > 0)
      .map(({ skill }) => skill)
      .filter((skill) => SpecialEffectEngine.canUseSkill(this.wildChampion, skill, resources).allowed)
      .filter((skill) => CombatTempoEngine.canUseSkill(this.wildChampion, skill, tempo).allowed);
    if (usable.length > 0) {
      const skill = usable[Math.floor(Math.random() * usable.length)];
      return { type: 'skill', skillId: skill.id };
    }
    return { type: 'wait' };
  }

  private availableReplacements(): ChampionInstance[] {
    return this.save.party.filter((champion) => champion.instanceId !== this.playerChampion.instanceId && champion.currentHp > 0);
  }

  private openManualSwitch(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    if (StatusEngine.isRooted(this.statusesFor(this.playerChampion))) {
      this.setMessage('Este Eco está inmovilizado y no puede cambiarse.');
      return;
    }
    const available = this.availableReplacements();
    if (available.length === 0) return;
    this.awaitingSwitch = true;
    this.showSwitchOverlay(available, true);
  }

  private async handlePlayerKnockout(): Promise<void> {
    if (this.battleEnded || this.awaitingSwitch) return;
    this.playerHp = 0;
    this.playerChampion.currentHp = 0;
    this.refreshUi();
    this.disableActions();

    const available = this.availableReplacements();
    const playerName = DataRegistry.champion(this.playerChampion.championId).name;
    await this.awaitContinue(`${playerName} ha caído.`);
    if (available.length === 0) {
      await this.finishPartyDefeat();
      return;
    }

    this.awaitingSwitch = true;
    this.busy = true;
    this.setMessage('Elige otro Eco para continuar.');
    this.showSwitchOverlay(available, false);
  }

  private showSwitchOverlay(available: ChampionInstance[], manual: boolean): void {
    this.overlayLayer?.destroy(true);
    ConsoleInput.clearTransient();
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = manual;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.rectangle(256, 142, 382, 188, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 256, 58, manual ? 'CAMBIAR ECO' : 'ELIGE TU SIGUIENTE ECO', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0));
    objects.push(UiKit.label(this, 256, 82, manual ? 'Cambiar consume el turno.' : 'Los Ecos debilitados no pueden volver al combate.', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));

    available.slice(0, 4).forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const stats = BattleEngine.statsFor(champion);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 170 + col * 172;
      const y = 122 + row * 54;
      const button = this.add.rectangle(x, y, 154, 42, UI.colors.panelRaised, 1)
        .setStrokeStyle(2, UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      this.consoleOverlayOptions.push({
        activate: () => this.selectReplacement(champion, manual),
        enabled: champion.currentHp > 0,
        setSelected: (selected) => button.setStrokeStyle(2, selected ? UI.colors.gold : UI.colors.borderSoft)
      });
      const name = UiKit.label(this, x - 66, y - 13, definition.name.toUpperCase(), UI.font.small, UI.text.primary, true);
      const detail = UiKit.label(this, x - 66, y + 4, `M${champion.mastery} · ${champion.currentHp}/${stats.hp} VID`, UI.font.tiny, UI.text.accent, true);
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(2, UI.colors.gold));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, UI.colors.borderSoft));
      button.on(Phaser.Input.Events.POINTER_UP, () => this.selectReplacement(champion, manual));
      objects.push(button, name, detail);
    });

    if (manual) {
      const cancel = UiKit.button(this, 256, 218, 90, 24, 'CANCELAR', () => {
        this.overlayLayer?.destroy(true);
        this.overlayLayer = undefined;
        this.awaitingSwitch = false;
      }, { accent: 'neutral', fontSize: UI.font.tiny });
      objects.push(cancel.button, cancel.label);
    }

    this.overlayLayer = this.add.container(0, 0, objects).setScale(1.875).setDepth(12000);
    this.refreshConsoleOverlaySelection();
  }

  private selectReplacement(champion: ChampionInstance, manual: boolean): void {
    if (!this.awaitingSwitch || champion.currentHp <= 0) return;
    this.closeBattleOverlay(false);
    this.wildChampion.currentHp = Math.max(1, this.wildHp);
    SpecialEffectEngine.clearPersistentFormOnBench(this.playerChampion, this.ensureFormStore());
    CombatMechanicsEngine.clearOnBench(this.playerChampion, this.ensureMechanicsStore());
    const participants = this.participantIds();
    if (!participants.includes(champion.instanceId)) participants.push(champion.instanceId);
    this.registry.set('battle.participants', participants);
    CombatTempoEngine.markBenchEntry(champion, this.ensureTempoStore());
    this.persistTempoStore();
    this.persistSpecialStores();
    this.persistMechanicsStore();
    this.registry.set('battle.activeInstanceId', champion.instanceId);
    if (manual) this.registry.set('battle.pendingEnemyAction', true);
    SaveService.save(this.save);
    this.awaitingSwitch = false;
    this.scene.restart();
  }

  private inventoryItems(): ItemDefinition[] {
    return Object.entries(this.save.inventory)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId]) => DataRegistry.item(itemId));
  }

  private battleItemPocket(item: ItemDefinition): 'consumables' | 'link' | 'equipment' | 'runic' | 'materials' | 'key' {
    if (item.battleEffect?.type === 'echo-link') return 'link';
    if (item.category === 'consumable') return 'consumables';
    if (item.category === 'runic') return 'runic';
    if (item.category === 'material') return 'materials';
    if (item.category === 'key') return 'key';
    return 'equipment';
  }

  private openBattleItems(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    ConsoleInput.clearTransient();
    const items = this.inventoryItems();
    if (items.length === 0) return;

    this.overlayLayer?.destroy(true);
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = true;

    const pockets = [
      { id: 'consumables' as const, label: 'CONSUMIBLES' },
      { id: 'link' as const, label: 'VINCULACIÓN' },
      { id: 'equipment' as const, label: 'EQUIPO' },
      { id: 'runic' as const, label: 'RÚNICOS' },
      { id: 'materials' as const, label: 'MATERIALES' },
      { id: 'key' as const, label: 'CLAVE' }
    ];

    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.rectangle(256, 142, 390, 190, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 256, 53, 'BOLSA', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0));
    objects.push(UiKit.label(this, 256, 76, 'Elige un bolsillo del inventario.', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));

    pockets.forEach((pocket, index) => {
      const pocketItems = items.filter((item) => this.battleItemPocket(item) === pocket.id);
      const totalQuantity = pocketItems.reduce((sum, item) => sum + InventoryService.quantity(this.save, item.id), 0);
      const enabled = pocketItems.length > 0;
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 174 + col * 170;
      const y = 112 + row * 42;
      const button = this.add.rectangle(x, y, 154, 34, enabled ? UI.colors.panelRaised : 0x16232c, 1)
        .setStrokeStyle(2, enabled ? UI.colors.borderSoft : 0x30414d);
      const label = UiKit.label(this, x - 66, y - 10, pocket.label, UI.font.tiny, enabled ? UI.text.primary : UI.text.muted, true);
      const detail = UiKit.label(this, x - 66, y + 6, enabled ? `${pocketItems.length} tipos · ×${totalQuantity}` : 'VACÍO', UI.font.tiny, enabled ? UI.text.accent : UI.text.muted, true);

      this.consoleOverlayOptions.push({
        activate: () => this.openBattleItemPocket(pocket.id, pocket.label, 0),
        enabled,
        setSelected: (selected) => button.setStrokeStyle(2, selected ? UI.colors.cyanGlow : (enabled ? UI.colors.borderSoft : 0x30414d))
      });

      if (enabled) {
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(2, UI.colors.cyanGlow));
        button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, UI.colors.borderSoft));
        button.on(Phaser.Input.Events.POINTER_UP, () => this.openBattleItemPocket(pocket.id, pocket.label, 0));
      }
      objects.push(button, label, detail);
    });

    const cancel = UiKit.button(this, 256, 236, 90, 22, 'CERRAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(cancel.button, cancel.label);
    this.overlayLayer = this.add.container(0, 0, objects).setScale(1.875).setDepth(12000);
    this.refreshConsoleOverlaySelection();
  }

  private openBattleItemPocket(
    pocketId: 'consumables' | 'link' | 'equipment' | 'runic' | 'materials' | 'key',
    pocketLabel: string,
    page: number
  ): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    ConsoleInput.clearTransient();
    const items = this.inventoryItems().filter((item) => this.battleItemPocket(item) === pocketId);
    if (items.length === 0) {
      this.openBattleItems();
      return;
    }

    const pageSize = 6;
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Phaser.Math.Clamp(page, 0, pageCount - 1);
    const visibleItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

    this.overlayLayer?.destroy(true);
    this.consoleOverlayOptions = [];
    this.consoleOverlayIndex = 0;
    this.consoleOverlayCancelable = true;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.rectangle(256, 142, 390, 190, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 256, 52, pocketLabel, UI.font.title, UI.text.primary, true).setOrigin(0.5, 0));
    objects.push(UiKit.label(this, 256, 75, 'Usar un objeto de combate consume el turno.', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));

    visibleItems.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 174 + col * 170;
      const y = 111 + row * 40;
      const quantity = InventoryService.quantity(this.save, item.id);
      const blockedInDuel = this.isNpcDuel() && item.battleEffect?.type === 'echo-link';
      const usable = Boolean(item.battleEffect) && !blockedInDuel;
      const linkerLevel = item.battleEffect?.type === 'echo-link' ? ` · NV ${LinkService.linkerLevel(this.save)}` : '';
      const button = this.add.rectangle(x, y, 154, 32, usable ? UI.colors.panelRaised : 0x16232c, 1)
        .setStrokeStyle(2, item.battleEffect?.type === 'echo-link' && usable ? UI.colors.gold : (usable ? UI.colors.borderSoft : 0x30414d));
      const normalStroke = item.battleEffect?.type === 'echo-link' && usable ? UI.colors.gold : (usable ? UI.colors.borderSoft : 0x30414d);
      const detailText = blockedInDuel
        ? 'NO EN DUELO'
        : item.battleEffect?.consumes
          ? `×${quantity}`
          : item.battleEffect?.type === 'echo-link'
            ? `PERMANENTE${linkerLevel}`
            : `×${quantity} · NO USABLE`;

      this.consoleOverlayOptions.push({
        activate: () => void this.useBattleItem(item),
        enabled: usable,
        setSelected: (selected) => button.setStrokeStyle(2, selected ? UI.colors.cyanGlow : normalStroke)
      });

      if (usable) {
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(2, UI.colors.cyanGlow));
        button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, normalStroke));
        button.on(Phaser.Input.Events.POINTER_UP, () => void this.useBattleItem(item));
      }

      const name = UiKit.label(this, x - 67, y - 10, item.name.toUpperCase(), UI.font.tiny, usable ? UI.text.primary : UI.text.muted, true).setWordWrapWidth(120);
      const detail = UiKit.label(this, x - 67, y + 5, detailText, UI.font.tiny, usable ? (item.battleEffect?.type === 'echo-link' ? UI.text.gold : UI.text.accent) : UI.text.muted, true);
      objects.push(button, name, detail);
    });

    if (pageCount > 1) {
      objects.push(UiKit.label(this, 256, 221, `${safePage + 1}/${pageCount}`, UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));
      if (safePage > 0) {
        const prev = UiKit.button(this, 160, 230, 74, 20, '◀ ANTERIOR', () => this.openBattleItemPocket(pocketId, pocketLabel, safePage - 1), { accent: 'neutral', fontSize: UI.font.tiny });
        objects.push(prev.button, prev.label);
      }
      if (safePage < pageCount - 1) {
        const next = UiKit.button(this, 352, 230, 74, 20, 'SIG. ▶', () => this.openBattleItemPocket(pocketId, pocketLabel, safePage + 1), { accent: 'neutral', fontSize: UI.font.tiny });
        objects.push(next.button, next.label);
      }
    }

    const back = UiKit.button(this, 256, 238, 82, 20, 'VOLVER', () => this.openBattleItems(), { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(back.button, back.label);
    this.overlayLayer = this.add.container(0, 0, objects).setScale(1.875).setDepth(12000);
    this.refreshConsoleOverlaySelection();
  }

  private async useBattleItem(item: ItemDefinition): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || !item.battleEffect) return;
    this.closeBattleOverlay(false);

    if (item.battleEffect.type === 'heal') {
      const missing = this.statsForChampion(this.playerChampion).hp - this.playerHp;
      if (missing <= 0) {
        this.setMessage(`${DataRegistry.champion(this.playerChampion.championId).name} ya tiene la Vida al máximo.`);
        return;
      }
      this.busy = true;
      if (!await this.beginActorTurn('player')) return;
      const healed = Math.min(item.battleEffect.amount, missing);
      this.playerHp += healed;
      if (item.battleEffect.consumes) InventoryService.remove(this.save, item.id, 1);
      this.playerChampion.currentHp = this.playerHp;
      SaveService.save(this.save);
      this.refreshUi();
      await this.awaitContinue(`${DataRegistry.champion(this.playerChampion.championId).name} usa ${item.name} y recupera Vida.`);
      await this.finishActorTurn('player');
      if (!this.battleEnded && !this.awaitingSwitch) await this.resolveEnemyResponse();
      return;
    }

    if (item.battleEffect.type === 'echo-link') {
      if (this.isNpcDuel()) {
        this.setMessage('No puedes vincular un Eco que ya está ligado a otro Vinculador.');
        return;
      }
      await this.handleLinkWithArtifact();
    }
  }

  private async handleLinkWithArtifact(): Promise<void> {
    if (this.isNpcDuel()) {
      this.setMessage('No puedes vincular un Eco que ya está ligado a otro Vinculador.');
      return;
    }
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || !LinkService.hasLinker(this.save)) return;
    this.busy = true;
    if (!await this.beginActorTurn('player')) return;
    const statusMultiplier = StatusEngine.linkModifier(this.statusesFor(this.wildChampion));
    const chance = LinkService.chance(
      this.save,
      this.playerChampion,
      this.wildChampion,
      this.wildHp,
      this.statsForChampion(this.wildChampion).hp,
      statusMultiplier
    );
    await this.awaitContinue(LinkService.feedback(chance));
    const linked = Math.random() <= chance;
    await this.animateLinkAttempt(linked);

    if (linked) {
      this.wildChampion.currentHp = Math.max(1, this.wildHp);
      this.playerChampion.currentHp = Math.max(1, this.playerHp);
      const goesToParty = this.save.party.length < 5;
      if (goesToParty) this.save.party.push(this.wildChampion);
      else this.save.storage.push(this.wildChampion);
      QuestService.recordEvent(this.save, { type: 'link', targetId: this.wildChampion.championId });
      const firstLinkProgress = QuestService.progress(this.save, 'bandle-first-link');
      if (firstLinkProgress && (firstLinkProgress.currentStepIndex ?? 0) >= 1) {
        WorldActionService.applyAll(this.save, [
          { type: 'set-flag', id: 'story:first-conventional-echo-linked', value: true }
        ]);
      }
      SaveService.save(this.save);
      this.cleanupBattleSession();
      this.battleEnded = true;
      this.disableActions();
      await this.awaitContinue(`¡Sincronización completa! ${DataRegistry.champion(this.wildChampion.championId).name} ${goesToParty ? 'se une al equipo.' : 'queda en reserva.'}`);
      this.scene.start('WorldScene');
      return;
    }

    await this.finishActorTurn('player');
    if (this.battleEnded || this.awaitingSwitch) return;
    await this.awaitContinue('La conexión se rompe. El Eco rechaza el Vinculador.');
    await this.resolveEnemyResponse();
  }

  private async resolveEnemyResponse(): Promise<void> {
    this.busy = true;
    if (this.battleEnded || this.awaitingSwitch || this.playerHp <= 0 || this.wildHp <= 0) return;
    await this.performAction('enemy', this.chooseEnemyAction());
    if (!this.battleEnded && !this.awaitingSwitch && this.playerHp > 0) {
      this.busy = false;
      this.refreshUi();
      this.setMessage(this.idlePrompt());
    }
  }

  private async flee(): Promise<void> {
    if (this.isNpcDuel()) {
      this.setMessage('No puedes huir de un duelo contra otro Vinculador.');
      return;
    }
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;

    this.busy = true;
    if (!await this.beginActorTurn('player', { type: 'wait' })) {
      if (!this.battleEnded && !this.awaitingSwitch && this.playerHp > 0 && this.wildHp > 0) {
        await this.resolveEnemyResponse();
      }
      return;
    }

    this.refreshCombatStats();
    const speedDifference = this.playerStats.speed - this.wildStats.speed;
    const fleeChance = Phaser.Math.Clamp(0.75 + speedDifference * 0.025, 0.35, 0.95);
    const escaped = Math.random() <= fleeChance;

    if (escaped) {
      this.playerChampion.currentHp = Math.max(0, this.playerHp);
      this.wildChampion.currentHp = Math.max(1, this.wildHp);
      SaveService.save(this.save);
      this.setMessage('¡Has conseguido escapar!');
      await this.wait(260);
      this.cleanupBattleSession();
      this.scene.start('WorldScene');
      return;
    }

    this.setMessage('No has conseguido escapar.');
    await this.wait(320);
    await this.finishActorTurn('player');
    if (!this.battleEnded && !this.awaitingSwitch) await this.resolveEnemyResponse();
  }

  private async finishWildEscape(): Promise<void> {
    this.battleEnded = true;
    this.disableActions();
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(1, this.wildHp);
    SaveService.save(this.save);
    this.cleanupBattleSession();
    await this.awaitContinue(`${DataRegistry.champion(this.wildChampion.championId).name} escapa antes de que puedas estabilizar su resonancia.`);
    this.scene.start('WorldScene');
  }

  private async finishVictory(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.playerChampion.currentHp = Math.max(1, this.playerHp);
    this.wildChampion.currentHp = 0;
    QuestService.recordEvent(this.save, { type: 'defeat', targetId: this.wildChampion.championId });

    const duel = this.pendingDuel();
    const finalDuelOpponent = Boolean(duel && duel.enemyIndex + 1 >= duel.team.length);

    // Final-duel world actions are applied before XP. This lets narrative milestones
    // such as Kennen lifting Bandle's M7 cap affect the reward from the winning fight.
    if (duel && finalDuelOpponent) {
      const duelDefinition = DataRegistry.duel(duel.duelId);
      if (!this.save.worldProgress.flags.includes(duel.victoryFlag)) {
        this.save.worldProgress.flags.push(duel.victoryFlag);
      }
      WorldActionService.applyAll(this.save, duelDefinition.victoryActions ?? []);
      if (duelDefinition.victoryDialogueId) {
        this.registry.set('world.pendingDialogueId', duelDefinition.victoryDialogueId);
      }
    }

    const participants = this.participantIds();
    const gains = ProgressionService.awardPartyExperience(
      this.save,
      this.wildChampion,
      participants.length > 0 ? participants : [this.playerChampion.instanceId]
    );

    if (duel) {
      this.appendDuelGains(gains);
      this.disableActions();

      const defeatedName = DataRegistry.champion(this.wildChampion.championId).name;
      const nextIndex = duel.enemyIndex + 1;
      if (nextIndex < duel.team.length) {
        const nextChampion = duel.team[nextIndex];
        duel.enemyIndex = nextIndex;
        this.registry.set('pendingDuel', duel);
        this.registry.set('pendingEncounter', {
          zoneId: `duel:${duel.duelId}`,
          wildChampion: nextChampion
        });
        SaveService.save(this.save);
        await this.awaitContinue(`${defeatedName} ha caído. ${duel.trainerName} prepara su siguiente Eco.`);
        this.cleanupBetweenDuelOpponents();
        this.scene.restart();
        return;
      }

      this.save.gold += Math.max(0, Math.round(duel.rewardGold));
      SaveService.save(this.save);
      const totalGains = this.duelGains();
      this.cleanupBattleSession();
      this.registry.set('lastMasteryGains', totalGains);
      await this.awaitContinue(
        `Has derrotado a ${duel.trainerName}. Recompensa: ${Math.max(0, Math.round(duel.rewardGold))} de oro.`
      );
      this.scene.start('ProgressionScene');
      return;
    }

    SaveService.save(this.save);
    this.cleanupBattleSession();
    this.registry.set('lastMasteryGains', gains);
    this.disableActions();
    await this.awaitContinue(`${DataRegistry.champion(this.wildChampion.championId).name} ha caído. ¡Victoria!`);
    this.scene.start('ProgressionScene');
  }

  private async finishPartyDefeat(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.awaitingSwitch = false;
    this.playerHp = 0;
    this.playerChampion.currentHp = 0;
    this.refreshUi();
    this.disableActions();
    const recovery = SanctuaryService.recoverAfterDefeat(this.save);
    SaveService.save(this.save);
    this.cleanupBattleSession();
    this.registry.set('lastDefeat', recovery);
    await this.awaitContinue('Todo el equipo ha caído. La luz del último santuario responde…');
    this.scene.start('DefeatScene');
  }

  private pendingDuel(): PendingDuelSession | undefined {
    const value = this.registry.get('pendingDuel') as PendingDuelSession | undefined;
    return value && Array.isArray(value.team) ? value : undefined;
  }

  private isNpcDuel(): boolean {
    return Boolean(this.pendingDuel());
  }

  private isNarrativeEchoEnemy(): boolean {
    return this.pendingDuel()?.duelId === 'veigar-seal-trial';
  }

  private duelGains(): MasteryGainResult[] {
    const gains = this.registry.get('battle.duelGains') as MasteryGainResult[] | undefined;
    return Array.isArray(gains) ? gains : [];
  }

  private appendDuelGains(gains: MasteryGainResult[]): void {
    const aggregated = this.duelGains().map((gain) => ({
      ...gain,
      unlockedSlots: [...gain.unlockedSlots]
    }));

    for (const gain of gains) {
      const existing = aggregated.find((entry) => entry.instanceId === gain.instanceId);
      if (!existing) {
        aggregated.push({ ...gain, unlockedSlots: [...gain.unlockedSlots] });
        continue;
      }
      existing.experienceGained += gain.experienceGained;
      existing.toMastery = gain.toMastery;
      existing.skillPointsGained += gain.skillPointsGained;
      existing.unlockedSlots = [...new Set([...existing.unlockedSlots, ...gain.unlockedSlots])];
    }

    this.registry.set('battle.duelGains', aggregated);
  }

  private cleanupBetweenDuelOpponents(): void {
    this.registry.remove('battle.pendingEnemyAction');
    this.registry.remove('battle.statuses');
    this.registry.remove('battle.resources');
    this.registry.remove('battle.forms');
    this.registry.remove('battle.openingPassives');
  }

  private participantIds(): string[] {
    const stored = this.registry.get('battle.participants') as string[] | undefined;
    return Array.isArray(stored) ? [...stored] : [];
  }

  private ensureStatusStore(): BattleStatusStore {
    const stored = this.registry.get('battle.statuses') as BattleStatusStore | undefined;
    if (stored && typeof stored === 'object') return stored;
    const created: BattleStatusStore = {};
    this.registry.set('battle.statuses', created);
    return created;
  }

  private statusesFor(champion: ChampionInstance): CombatStatusInstance[] {
    const store = this.ensureStatusStore();
    if (!Array.isArray(store[champion.instanceId])) store[champion.instanceId] = [];
    return store[champion.instanceId];
  }

  private persistStatusStore(): void {
    this.registry.set('battle.statuses', this.ensureStatusStore());
  }

  private ensureTempoStore(): BattleTempoStore {
    const stored = this.registry.get('battle.tempo') as BattleTempoStore | undefined;
    if (stored && typeof stored === 'object' && stored.combatants && Array.isArray(stored.delayedDamage)) return stored;
    const created = CombatTempoEngine.createStore();
    this.registry.set('battle.tempo', created);
    return created;
  }

  private ensureMechanicsStore(): CombatMechanicsStore {
    const stored = this.registry.get('battle.mechanics') as CombatMechanicsStore | undefined;
    if (stored && typeof stored === 'object' && stored.combatants && stored.marks && stored.summons) return stored;
    const created = CombatMechanicsEngine.createStore();
    this.registry.set('battle.mechanics', created);
    return created;
  }

  private persistTempoStore(): void {
    this.registry.set('battle.tempo', this.ensureTempoStore());
  }

  private persistMechanicsStore(): void {
    this.registry.set('battle.mechanics', this.ensureMechanicsStore());
  }

  private refreshCombatStats(): void {
    const resources = this.ensureResourceStore();
    const forms = this.ensureFormStore();
    const playerSpecial = SpecialEffectEngine.statsWithResources(this.playerChampion, this.statsForChampion(this.playerChampion), resources, forms);
    const wildSpecial = SpecialEffectEngine.statsWithResources(this.wildChampion, this.statsForChampion(this.wildChampion), resources, forms);
    const playerBase = CombatTempoEngine.applyStatBonuses(this.playerChampion, playerSpecial, this.ensureTempoStore());
    const wildBase = CombatTempoEngine.applyStatBonuses(this.wildChampion, wildSpecial, this.ensureTempoStore());
    this.playerStats = StatusEngine.effectiveStats(playerBase, this.statusesFor(this.playerChampion));
    this.wildStats = StatusEngine.effectiveStats(wildBase, this.statusesFor(this.wildChampion));
  }

  private cleanupBattleSession(): void {
    this.registry.remove('pendingEncounter');
    this.registry.remove('pendingDuel');
    this.registry.remove('battle.duelGains');
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
    this.registry.remove('battle.pendingEnemyAction');
    this.registry.remove('battle.statuses');
    this.registry.remove('battle.resources');
    this.registry.remove('battle.forms');
    this.registry.remove('battle.openingPassives');
    this.registry.remove('battle.tempo');
    this.registry.remove('battle.mechanics');
    this.registry.remove('battle.started');
  }

  private ensureResourceStore(): BattleResourceStore {
    const stored = this.registry.get('battle.resources') as BattleResourceStore | undefined;
    if (stored && typeof stored === 'object') return stored;
    const created: BattleResourceStore = {};
    this.registry.set('battle.resources', created);
    return created;
  }

  private ensureFormStore(): BattleFormStore {
    const stored = this.registry.get('battle.forms') as BattleFormStore | undefined;
    if (stored && typeof stored === 'object') return stored;
    const created: BattleFormStore = {};
    this.registry.set('battle.forms', created);
    return created;
  }

  private persistSpecialStores(): void {
    this.registry.set('battle.resources', this.ensureResourceStore());
    this.registry.set('battle.forms', this.ensureFormStore());
  }

  private currentFormId(champion: ChampionInstance): string | undefined {
    return SpecialEffectEngine.formId(champion, this.ensureFormStore());
  }

  private statsForChampion(champion: ChampionInstance): StatBlock {
    return BattleEngine.statsFor(champion, this.currentFormId(champion));
  }

  private applyOpeningPassive(champion: ChampionInstance, opponent: ChampionInstance): void {
    const initialized = (this.registry.get('battle.openingPassives') as string[] | undefined) ?? [];
    if (initialized.includes(champion.instanceId)) return;
    const passive = SpecialEffectEngine.passive(champion, this.ensureFormStore());
    StatusEngine.applySkillEffects(passive, 1, this.statusesFor(champion), this.statusesFor(opponent), true);
    initialized.push(champion.instanceId);
    this.registry.set('battle.openingPassives', initialized);
  }

  private syncFormVisualAndHp(actor: BattleActor, oldMaxHp: number): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const oldHp = actor === 'player' ? this.playerHp : this.wildHp;
    const newMaxHp = this.statsForChampion(champion).hp;
    const ratio = Math.max(0, Math.min(1, oldHp / Math.max(1, oldMaxHp)));
    const newHp = Math.max(1, Math.round(newMaxHp * ratio));
    if (actor === 'player') {
      this.playerHp = newHp;
      this.playerChampion.currentHp = newHp;
      this.playerHpUi.maxHp = newMaxHp;
      this.playerSprite.setTexture(this.playerBattleTexture(champion.championId, this.currentFormId(champion)));
      this.syncCombatantVisual('player', true);
      this.rebuildActions();
    } else {
      this.wildHp = newHp;
      this.wildChampion.currentHp = newHp;
      this.wildHpUi.maxHp = newMaxHp;
      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));
      this.syncCombatantVisual('enemy', true);
      this.rebuildActions();
    }
  }

  private rebuildActions(): void {
    for (const object of this.actionObjects) object.destroy();
    this.actionObjects = [];
    this.consoleOptions = [];
    this.consoleIndex = 0;
    ConsoleInput.clearTransient();
    this.createActions();
    this.consoleIndex = this.findEnabledConsoleOption(0, 1);
    this.refreshConsoleSelection();
  }

  private idlePrompt(): string {
    const resource = SpecialEffectEngine.resourceLabel(this.playerChampion, this.ensureResourceStore(), this.ensureFormStore());
    const tempo = CombatTempoEngine.resourceLabel(this.playerChampion, this.ensureTempoStore());
    const mechanics = CombatMechanicsEngine.resourceLabel(this.playerChampion, this.ensureMechanicsStore(), this.ensureFormStore());
    const form = SpecialEffectEngine.formState(this.playerChampion, this.ensureFormStore());
    const extras = [resource, tempo, mechanics].filter((value): value is string => Boolean(value));
    if (form) extras.unshift(`${DataRegistry.form(this.playerChampion.championId, form.formId).name} ${form.remainingTurns}t`);
    return extras.length > 0 ? `Elige tu siguiente acción. · ${extras.join(' · ')}` : 'Elige tu siguiente acción.';
  }

  private disableActions(): void {
    for (const object of this.actionObjects) {
      if (!object.active) continue;
      object.disableInteractive();
      (object as Phaser.GameObjects.GameObject & { setAlpha?: (value: number) => unknown }).setAlpha?.(0.55);
    }
  }

  private refreshUi(): void {
    this.refreshCombatStats();
    this.playerHpUi.maxHp = this.playerStats.hp;
    this.wildHpUi.maxHp = this.wildStats.hp;
    this.playerHp = Math.min(this.playerHp, this.playerStats.hp);
    this.wildHp = Math.min(this.wildHp, this.wildStats.hp);
    this.renderTypeIcons(this.playerHpUi.typeLayer, this.playerChampion);
    this.renderTypeIcons(this.wildHpUi.typeLayer, this.wildChampion);
    this.playerHpUi.expFill.displayWidth = this.playerHpUi.expMaxWidth * ProgressionService.experienceRatio(this.playerChampion);
    this.wildHpUi.expFill.displayWidth = this.wildHpUi.expMaxWidth * ProgressionService.experienceRatio(this.wildChampion);
    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));
    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));
    for (const [champion, ui] of [[this.playerChampion, this.playerHpUi], [this.wildChampion, this.wildHpUi]] as const) {
      const statusCount = this.statusesFor(champion).filter(status => status.kind !== 'explosive' && status.kind !== 'shield').slice(0, 7).length;
      addMarkIndicators(this, ui.statusLayer, this.ensureMechanicsStore().marks[champion.instanceId] ?? [], statusCount * 20 + 4);
    }
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(0, this.wildHp);
    this.refreshCombatVisuals();
  }

  private updateHpUi(ui: HpUi, hp: number, statuses: CombatStatusInstance[]): void {
    const ratio = Phaser.Math.Clamp(hp / ui.maxHp, 0, 1);
    const hpWidth = ui.maxWidth * ratio;
    ui.fill.displayWidth = hpWidth;
    ui.fill.setFillStyle(this.hpColor(ratio), 1);
    ui.text.setText(ui.showNumbers ? `${Math.max(0, hp)} / ${ui.maxHp}` : '');

    const shield = this.totalShield(statuses);
    if (shield > 0) {
      const shieldWidth = Math.min(ui.maxWidth, ui.maxWidth * (shield / ui.maxHp));
      const shieldStart = hpWidth + shieldWidth <= ui.maxWidth
        ? hpWidth
        : Math.max(0, ui.maxWidth - shieldWidth);
      ui.shieldFill.setPosition(ui.barX + shieldStart, ui.barY);
      ui.shieldFill.displayWidth = shieldWidth;
      ui.shieldFill.setVisible(true);
    } else {
      ui.shieldFill.setVisible(false);
      ui.shieldFill.displayWidth = 0;
    }

    if (ui.executeMarker && ui.executeThreshold !== undefined) {
      const executable = ratio <= ui.executeThreshold;
      ui.executeMarker.setFillStyle(executable ? UI.colors.gold : 0xffffff, executable ? 1 : 0.82);
      ui.executeMarker.setScale(executable ? 1.2 : 1);
    }

    this.renderStatusIcons(ui.statusLayer, statuses);
  }

  private totalShield(statuses: CombatStatusInstance[]): number {
    return statuses
      .filter((status) => status.kind === 'shield')
      .reduce((total, status) => total + Math.max(0, status.power), 0);
  }

  private renderStatusIcons(layer: Phaser.GameObjects.Container, statuses: CombatStatusInstance[]): void {
    layer.removeAll(true);
    const visibleStatuses = statuses.filter((status) => status.kind !== 'explosive');
    visibleStatuses.slice(0, 7).forEach((status, index) => {
      const x = index * 20;
      const frames: Partial<Record<CombatStatusInstance['kind'], string>> = {
        poison: '31_status_poison.png', blind: '32_status_blind.png', stun: '33_status_stun.png', shield: '34_status_shield.png',
        evasion: '35_status_evasion.png', polymorph: '36_status_polymorph.png', banish: '37_status_banish.png'
      };
      const frame = frames[status.kind];
      if (frame) layer.add(this.add.image(x, 0, 'battle-ui-960', frame).setOrigin(0, 0));
      else {
        const color = status.beneficial ? 0x3eaf72 : 0xc85c64;
        const circle = this.add.circle(x + 6, 6, 6, color, 0.96).setStrokeStyle(1, 0x07131e, 0.9);
        const symbol = UiKit.label(this, x + 6, 5, this.statusSymbol(status), '7px', '#ffffff', true).setOrigin(0.5);
        layer.add([circle, symbol]);
      }
    });
  }

  private statusSymbol(status: CombatStatusInstance): string {
    if (status.kind === 'poison') return '×';
    if (status.kind === 'burn') return '♨';
    if (status.kind === 'blind') return '○';
    if (status.kind === 'stun') return '!';
    if (status.kind === 'root') return '⌁';
    if (status.kind === 'airborne') return '↑';
    if (status.kind === 'shield') return '◆';
    if (status.kind === 'evasion') return '◇';
    if (status.kind === 'accuracy') return '◎';
    if (status.kind === 'recharge') return '…';
    if (status.kind === 'polymorph') return '?';
    if (status.kind === 'banish') return '↗';
    if (status.kind === 'explosive') return String(status.stacks ?? 0);
    if (status.kind === 'charm') return '♥';
    if (status.kind === 'taunt') return 'T';
    if (status.kind === 'block') return '▣';
    if (status.kind === 'trap') return '✦';
    if (status.id === 'slow') return '↓';
    return status.beneficial ? '↑' : '↓';
  }

  private refreshCombatVisuals(): void {
    this.syncCombatantVisual('player', true);
    this.syncCombatantVisual('enemy', true);
  }

  private syncCombatantVisual(actor: BattleActor, animate: boolean): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const sprite = actor === 'player' ? this.playerSprite : this.wildSprite;
    if (!sprite) return;
    if (actor === 'enemy' && this.isNarrativeEchoEnemy()) {
      sprite.setAlpha(0.82).setTint(0x79e2f2);
    } else {
      sprite.setAlpha(1).clearTint();
    }
    const base = this.baseBattleSize(champion.championId, actor);
    const formScale = CatalogoContenido.escalaCombate(champion.championId, this.currentFormId(champion));
    const statusScale = this.statusVisualScale(this.statusesFor(champion));
    const scale = formScale * statusScale * BATTLE_VISUAL_SCALE;
    const width = Math.round(base.width * scale);
    const height = Math.round(base.height * scale);
    const baseY = actor === 'player' ? 303 : 202;
    const targetY = actor === 'enemy' ? baseY + Math.max(0, height - base.height) : baseY;
    const scaleX = width / Math.max(1, sprite.width);
    const scaleY = height / Math.max(1, sprite.height);
    const changed = Math.abs(sprite.scaleX - scaleX) > 0.01 || Math.abs(sprite.scaleY - scaleY) > 0.01 || Math.abs(sprite.y - targetY) > 0.5;

    if (animate && changed) {
      this.tweens.killTweensOf(sprite);
      this.tweens.add({ targets: sprite, scaleX, scaleY, y: targetY, duration: 180, ease: 'Sine.easeOut' });
    } else if (!animate || changed) {
      sprite.setScale(scaleX, scaleY);
      sprite.setY(targetY);
    }

    this.renderCombatantMarker(actor, width, height, targetY);
  }

  private baseBattleSize(championId: string, actor: BattleActor): { width: number; height: number } {
    if (championId === 'garen') return actor === 'player' ? { width: 248, height: 251 } : { width: 218, height: 225 };
    return { width: 195, height: 218 };
  }

  private statusVisualScale(statuses: CombatStatusInstance[]): number {
    return Math.max(1, ...statuses.map((status) => {
      const value = status.params?.escalaVisual;
      return typeof value === 'number' ? Math.max(1, value) : 1;
    }));
  }

  private renderCombatantMarker(actor: BattleActor, width: number, height: number, groundY: number): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const sprite = actor === 'player' ? this.playerSprite : this.wildSprite;
    const layer = actor === 'player' ? this.playerEffectLayer : this.wildEffectLayer;
    if (!layer || !sprite) return;
    layer.removeAll(true);
    layer.setPosition(0, 0);

    const summon = CombatMechanicsEngine.summon(champion, this.ensureMechanicsStore());
    if (summon) {
      const summonX = sprite.x + (actor === 'player' ? 100 : -86);
      const summonSize = actor === 'player' ? 162 : 152;
      const summonVisual = createSummonVisual(this, champion.championId, summon.id, actor === 'player', summonX, groundY + 2, summonSize);
      if (summonVisual) {
        layer.add(summonVisual);
        const barY = groundY - summonSize - 10;
        layer.add(this.add.rectangle(summonX - 49, barY, 98, 8, 0x172b36).setOrigin(0, 0.5));
        layer.add(this.add.rectangle(summonX - 49, barY, 98 * summon.hp / Math.max(1, summon.maxHp), 8, UI.colors.hp).setOrigin(0, 0.5));
        layer.add(UiKit.label(this, summonX, barY - 19, `${summon.name} ${summon.hp}/${summon.maxHp}`, '10px', UI.text.primary, true).setOrigin(0.5, 0));
      }
    }

    const explosive = this.statusesFor(champion).find((status) => status.kind === 'explosive');
    if (explosive) {
      const stacks = Math.max(0, explosive.stacks ?? 0);
      const frame = stacks <= 0 ? '38_bomb_charge_0.png' : stacks === 1 ? '39_bomb_charge_1.png' : stacks === 2 ? '40_bomb_charge_2.png' : '41_bomb_charge_3.png';
      layer.add(
        this.add.image(sprite.x + width * 0.38, groundY - height * 0.7, 'battle-ui-960', frame).setOrigin(0.5)
      );
    }
  }

  private executionThresholdFor(champion: ChampionInstance): number | undefined {
    const hasExecution = BattleEngine.unlockedSkills(champion, this.currentFormId(champion))
      .some((skill) => skill.effects.some((effect) => effect.handlerId === 'execute-low-hp'));
    return hasExecution ? EXECUTION_THRESHOLD : undefined;
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
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

      const prompt = UiKit.button(this, 866, 338, 172, 30, 'A · CONTINUAR', done, {
        accent: 'green', fontSize: '12px', selected: true
      });
      this.continueLayer = this.add.container(0, 0, [prompt.button, prompt.label]).setDepth(11500);
      keyboard?.once('keydown-A', done);
      keyboard?.once('keydown-ENTER', done);
      keyboard?.once('keydown-SPACE', done);
      this.input.once(Phaser.Input.Events.POINTER_UP, done);
    });
  }

  private async animateAction(actor: BattleActor, skill: SkillDefinition | null, hasDamage: boolean): Promise<void> {
    const attacker = actor === 'player' ? this.playerSprite : this.wildSprite;
    const target = actor === 'player' ? this.wildSprite : this.playerSprite;
    await playCombatVfx(this, attacker, target, skillVfx(skill, hasDamage));
  }

  private async animateLinkAttempt(success: boolean): Promise<void> {
    const textureKey = 'item-echo-linker-hextech';
    const startX = this.playerSprite.x + 42;
    const startY = this.playerSprite.y - 72;
    const targetX = this.wildSprite.x - 78;
    const targetY = Math.max(118, this.wildSprite.y - 18);

    const shell = this.add.image(startX, startY, textureKey)
      .setDisplaySize(48, 48)
      .setDepth(560)
      .setAlpha(0.96);

    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: shell,
        x: targetX,
        y: targetY,
        angle: 540,
        duration: 760,
        ease: 'Cubic.easeInOut',
        onComplete: () => resolve()
      });
    });

    this.tweens.killTweensOf(this.wildSprite);
    this.wildSprite.setAlpha(1).clearTint().setTint(0xc7a4ff);
    await new Promise<void>((resolve) => {
      this.tweens.add({
        targets: this.wildSprite,
        alpha: 0.28,
        scaleX: this.wildSprite.scaleX * 0.92,
        scaleY: this.wildSprite.scaleY * 0.92,
        duration: 460,
        ease: 'Sine.easeInOut',
        yoyo: true,
        onComplete: () => {
          this.wildSprite.setAlpha(1);
          resolve();
        }
      });
    });

    shell.setTint(0x29445a).setAlpha(0.94);

    const charge = this.add.image(targetX, targetY, textureKey)
      .setDisplaySize(48, 48)
      .setDepth(561)
      .setTint(0x66e8ff)
      .setAlpha(0.98);

    const maskGraphics = this.make.graphics({ x: 0, y: 0 });
    const mask = maskGraphics.createGeometryMask();
    charge.setMask(mask);

    const progress = { value: 0 };
    const redrawMask = (): void => {
      const height = 48 * Phaser.Math.Clamp(progress.value, 0, 1);
      maskGraphics.clear();
      maskGraphics.fillStyle(0xffffff, 1);
      maskGraphics.fillRect(targetX - 24, targetY + 24 - height, 48, height);
    };
    redrawMask();

    const targets = success ? [0.34, 0.68, 1] : [0.3, 0.58, 0.82];
    for (const target of targets) {
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: progress,
          value: target,
          duration: 650,
          ease: 'Sine.easeInOut',
          onUpdate: redrawMask,
          onComplete: () => resolve()
        });
      });

      const pulse = this.add.circle(targetX, targetY, 18, 0x66e8ff, 0)
        .setStrokeStyle(3, 0x66e8ff, 0.9)
        .setDepth(559);
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: pulse,
          scale: 1.75,
          alpha: 0,
          duration: 320,
          ease: 'Quad.easeOut',
          onComplete: () => {
            pulse.destroy();
            resolve();
          }
        });
      });
      await this.wait(170);
    }

    if (success) {
      const glow = this.add.circle(targetX, targetY, 24, 0x78f3ff, 0.22).setDepth(558);
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: [shell, charge],
          alpha: 0,
          scaleX: shell.scaleX * 1.12,
          scaleY: shell.scaleY * 1.12,
          duration: 420,
          ease: 'Quad.easeOut',
          onComplete: () => resolve()
        });
        this.tweens.add({
          targets: glow,
          scale: 1.65,
          alpha: 0,
          duration: 420,
          ease: 'Quad.easeOut',
          onComplete: () => glow.destroy()
        });
        this.tweens.add({
          targets: this.wildSprite,
          alpha: 0,
          duration: 420,
          ease: 'Quad.easeIn'
        });
      });
    } else {
      charge.setAlpha(0);
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: shell,
          x: targetX + 8,
          duration: 90,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => resolve()
        });
      });
      await new Promise<void>((resolve) => {
        this.tweens.add({
          targets: shell,
          alpha: 0,
          duration: 260,
          onComplete: () => resolve()
        });
      });
      this.wildSprite.clearTint().setAlpha(1);
    }

    charge.clearMask(true);
    maskGraphics.destroy();
    charge.destroy();
    shell.destroy();
  }

  private hitFeedback(sprite: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(sprite);
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;
    sprite.setAlpha(1).clearTint().setTint(0xffffff);
    this.tweens.add({
      targets: sprite,
      alpha: 0.42,
      scaleX: baseScaleX * 1.04,
      scaleY: baseScaleY * 0.96,
      duration: 70,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        sprite.clearTint();
        sprite.setAlpha(1);
        sprite.setScale(baseScaleX, baseScaleY);
      }
    });
  }

  private statusTickFeedback(sprite: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(sprite);
    sprite.setAlpha(1).clearTint().setTint(0x8bc56d);
    this.tweens.add({
      targets: sprite,
      alpha: 0.55,
      duration: 90,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        sprite.clearTint();
        sprite.setAlpha(1);
      }
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
