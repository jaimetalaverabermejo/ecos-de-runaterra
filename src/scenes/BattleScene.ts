import Phaser from 'phaser';
import { CatalogoContenido } from '../contenido/CatalogoContenido';
import { DataRegistry } from '../data/DataRegistry';
import { COMBAT_SKILL_DESCRIPTIONS } from '../data/skills/combatDescriptions';
import type { ActiveSkillSlot, ChampionInstance, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { SpecialEffectEngine, type BattleFormStore, type BattleResourceStore } from '../systems/combat/SpecialEffectEngine';
import { InventoryService } from '../systems/inventory/InventoryService';
import { LinkService } from '../systems/link/LinkService';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { QuestService } from '../systems/quests/QuestService';
import { SanctuaryService } from '../systems/sanctuary/SanctuaryService';
import { SaveService } from '../systems/save/SaveService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

interface PendingEncounter {
  zoneId: string;
  wildChampion: ChampionInstance;
}

interface HpUi {
  fill: Phaser.GameObjects.Rectangle;
  shieldFill: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  affinityText: Phaser.GameObjects.Text;
  statusLayer: Phaser.GameObjects.Container;
  executeMarker?: Phaser.GameObjects.Rectangle;
  executeThreshold?: number;
  maxWidth: number;
  maxHp: number;
  barX: number;
  barY: number;
  showNumbers: boolean;
}

type BattleStatusStore = Record<string, CombatStatusInstance[]>;
type BattleActor = 'player' | 'enemy';

type SkillDefinition = ReturnType<typeof DataRegistry.skill>;

const ACTION_WINDUP_MS = 180;
const BETWEEN_ACTIONS_MS = 100;
const ROUND_END_MS = 120;
const EXECUTION_THRESHOLD = 0.35;

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
  private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private overlayLayer?: Phaser.GameObjects.Container;
  private continueLayer?: Phaser.GameObjects.Container;
  private busy = false;
  private battleEnded = false;
  private awaitingSwitch = false;
  private awaitingContinue = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.busy = false;
    this.battleEnded = false;
    this.awaitingSwitch = false;
    this.awaitingContinue = false;
    this.actionObjects = [];
    this.overlayLayer = undefined;
    this.continueLayer = undefined;

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
    this.actionArmAt = this.time.now + 300;
    this.refreshUi();

    const wildName = DataRegistry.champion(this.wildChampion.championId).name;
    const playerName = DataRegistry.champion(this.playerChampion.championId).name;
    const pendingEnemyAction = Boolean(this.registry.get('battle.pendingEnemyAction'));
    if (pendingEnemyAction) {
      this.registry.remove('battle.pendingEnemyAction');
      void this.resumeAfterSwitch(playerName, wildName);
      return;
    }

    this.setMessage(`${wildName} salvaje aparece frente a ${playerName}.`);
  }

  private async resumeAfterSwitch(playerName: string, wildName: string): Promise<void> {
    this.busy = true;
    await this.awaitContinue(`${playerName} entra al combate. ${wildName} aprovecha el cambio.`);
    await this.resolveEnemyResponse();
  }

  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(256, 106, 'bandle-bg').setDisplaySize(512, 212).setTint(0x9bbba8).setAlpha(0.72);
    this.add.rectangle(0, 0, 512, 188, 0x05131a, 0.16).setOrigin(0, 0);
    this.add.rectangle(0, 188, 512, 100, UI.colors.backdrop, 0.98).setOrigin(0, 0);
    this.add.rectangle(0, 187, 512, 2, UI.colors.border, 0.85).setOrigin(0, 0);
    this.add.ellipse(128, 178, 152, 25, 0x000000, 0.22);
    this.add.ellipse(401, 118, 110, 20, 0x000000, 0.18);
  }

  private createCombatants(): void {
    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));
    this.playerSprite = this.add.image(126, 180, playerTexture).setOrigin(0.5, 1);
    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);

    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));
    this.wildSprite = this.add.image(402, 121, wildTexture).setOrigin(0.5, 1);
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
    this.wildHpUi = this.createHpPanel(
      12,
      10,
      DataRegistry.champion(this.wildChampion.championId).name,
      this.wildChampion.mastery,
      this.statsForChampion(this.wildChampion).hp,
      false,
      this.affinityLabelFor(this.wildChampion),
      this.executionThresholdFor(this.playerChampion)
    );
    this.playerHpUi = this.createHpPanel(
      322,
      126,
      DataRegistry.champion(this.playerChampion.championId).name,
      this.playerChampion.mastery,
      this.statsForChampion(this.playerChampion).hp,
      true,
      this.affinityLabelFor(this.playerChampion)
    );

    this.messageText = UiKit.label(this, 16, 193, '', UI.font.small, UI.text.primary, true)
      .setWordWrapWidth(350, true)
      .setLineSpacing(2);
  }

  private createHpPanel(
    x: number,
    y: number,
    title: string,
    mastery: number,
    maxHp: number,
    showNumbers: boolean,
    affinityLabel: string,
    executeThreshold?: number
  ): HpUi {
    const width = 178;
    const barX = x + 11;
    const barY = y + 32;
    const maxWidth = 148;
    this.add.rectangle(x, y, width, 60, UI.colors.panel, 0.97).setOrigin(0, 0).setStrokeStyle(2, UI.colors.gold);
    UiKit.label(this, x + 10, y + 7, title, UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + width - 10, y + 8, `M ${mastery}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    const affinityText = UiKit.label(this, x + 10, y + 19, affinityLabel, '7px', affinityLabel === 'TIPO PENDIENTE' ? UI.text.muted : UI.text.accent, true);
    this.add.rectangle(x + 10, barY, 150, 9, UI.colors.hpTrack, 1).setOrigin(0, 0.5).setStrokeStyle(1, UI.colors.borderSoft);
    const fill = this.add.rectangle(barX, barY, maxWidth, 7, UI.colors.hp, 1).setOrigin(0, 0.5);
    const shieldFill = this.add.rectangle(barX, barY, 0, 7, 0xf7fbff, 0.98).setOrigin(0, 0.5).setVisible(false);
    const text = UiKit.label(this, x + width - 12, y + 38, '', UI.font.tiny, UI.text.primary, true).setOrigin(1, 0);
    const statusLayer = this.add.container(x + 12, y + 51);
    let executeMarker: Phaser.GameObjects.Rectangle | undefined;
    if (executeThreshold !== undefined) {
      executeMarker = this.add.rectangle(barX + maxWidth * executeThreshold, barY, 2, 15, 0xffffff, 0.9)
        .setStrokeStyle(1, 0x07131e, 0.8);
    }
    return { fill, shieldFill, text, affinityText, statusLayer, executeMarker, executeThreshold, maxWidth, maxHp, barX, barY, showNumbers };
  }

  private createActions(): void {
    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const xs = [44, 126, 208, 290];

    for (let i = 0; i < 4; i += 1) {
      const skill = DataRegistry.skill(skillIds[i]);
      const slot = slots[i];
      const rank = this.playerChampion.skillRanks[slot];
      const unlocked = rank > 0;
      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));
      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);
      this.createSkillActionButton(xs[i], 253, 76, 56, skill, slot, rank, glyph, () => {
        if (!unlocked) return;
        void this.handleCombatAction({ type: 'skill', skillId: skill.id });
      }, !unlocked);
    }

    const canSwitch = this.availableReplacements().length > 0;
    const hasBattleItems = this.battleItems().length > 0;
    this.createActionButton(416, 224, 88, 26, 'CAMBIAR', () => this.openManualSwitch(), !canSwitch, 'blue');
    this.createActionButton(416, 253, 88, 26, 'OBJETOS', () => this.openBattleItems(), !hasBattleItems, 'gold');
    this.createActionButton(416, 282, 88, 22, 'HUIR', () => this.flee(), false, 'neutral');
  }

  private createSkillActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    skill: SkillDefinition,
    slot: ActiveSkillSlot,
    rank: number,
    effectivenessGlyph: string,
    onClick: () => void,
    disabled = false
  ): void {
    const button = this.add.rectangle(x, y, width, height, UI.colors.panelRaised, disabled ? 0.58 : 0.98)
      .setStrokeStyle(1, disabled ? UI.colors.borderSoft : UI.colors.border, disabled ? 0.55 : 0.9);
    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_UP, onClick);
    }

    const name = UiKit.label(this, x, y - 16, this.shortSkillName(skill.name), UI.font.tiny, disabled ? UI.text.muted : UI.text.primary, true)
      .setOrigin(0.5);
    const typeName = skill.affinityId ? DataRegistry.affinity(skill.affinityId).name.toUpperCase() : 'NEUTRAL';
    const typeLine = UiKit.label(
      this,
      x,
      y + 1,
      `${typeName}${effectivenessGlyph ? `  ${effectivenessGlyph}` : ''}`,
      '7px',
      disabled ? UI.text.muted : UI.text.accent,
      true
    ).setOrigin(0.5);

    const maxRank = ProgressionService.maxRank(slot);
    const pips = Array.from({ length: maxRank }, (_, index) => index < rank ? '●' : '○').join(' ');
    const rankPips = UiKit.label(this, x, y + 18, pips, '7px', disabled ? UI.text.muted : UI.text.gold, true).setOrigin(0.5);

    const infoButton = this.add.rectangle(x + 30, y - 21, 12, 12, UI.colors.panel, 0.96)
      .setStrokeStyle(1, UI.colors.borderSoft)
      .setInteractive({ useHandCursor: true });
    const infoLabel = UiKit.label(this, x + 30, y - 22, 'i', '7px', UI.text.accent, true).setOrigin(0.5);
    infoButton.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.openSkillInfo(skill, rank);
    });

    this.actionObjects.push(button, name, typeLine, rankPips, infoButton, infoLabel);
  }

  private openSkillInfo(skill: SkillDefinition, rank: number): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || this.overlayLayer) return;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.rectangle(256, 142, 390, 176, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 82, 70, skill.name.toUpperCase(), UI.font.title, UI.text.primary, true));
    objects.push(UiKit.label(this, 82, 94, rank > 0 ? `RANGO ${rank}` : `BLOQUEADA · M${skill.unlockMastery}`, UI.font.tiny, rank > 0 ? UI.text.accent : UI.text.muted, true));
    objects.push(UiKit.label(this, 82, 118, COMBAT_SKILL_DESCRIPTIONS[skill.id] ?? 'Habilidad de combate del Eco.', UI.font.small, UI.text.secondary, true)
      .setWordWrapWidth(348, true)
      .setLineSpacing(4));
    const tags = this.skillEffectTags(skill);
    if (tags) objects.push(UiKit.label(this, 82, 170, tags, UI.font.tiny, UI.text.gold, true).setWordWrapWidth(348, true));
    const close = UiKit.button(this, 256, 210, 96, 26, 'CERRAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private skillEffectTags(skill: SkillDefinition): string {
    const tags = new Set<string>();
    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());
    for (const effect of skill.effects) {
      if (effect.type === 'damage') tags.add(effect.stat === 'power' ? 'DAÑO MÁGICO' : 'DAÑO FÍSICO');
      if (effect.type === 'heal') tags.add('CURACIÓN');
      if (effect.statusKind === 'shield') tags.add('ESCUDO');
      if (effect.statusKind === 'poison') tags.add('VENENO');
      if (effect.statusKind === 'blind') tags.add('CEGUERA');
      if (effect.statusKind === 'stun') tags.add('ATURDIMIENTO');
      if (effect.handlerId === 'execute-low-hp') tags.add('EJECUCIÓN');
      if (effect.handlerId === 'destierro-temporal') tags.add('DESTIERRO');
      if (effect.handlerId === 'transformacion-control') tags.add('TRANSFORMACIÓN');
      if (effect.handlerId === 'marca-explosiva') tags.add('BOMBA');
      if (effect.handlerId === 'aumento-evasion') tags.add('EVASIÓN ↑');
      if (effect.handlerId === 'transformar-forma') tags.add('CAMBIO DE FORMA');
      if (effect.type === 'buff' && effect.stat === 'speed') tags.add('VELOCIDAD ↑');
      if (effect.type === 'buff' && (effect.stat === 'defense' || effect.stat === 'resistance')) tags.add('DEFENSA ↑');
      if (effect.type === 'debuff' && effect.stat === 'speed') tags.add('RALENTIZA');
    }
    return [...tags].join(' · ');
  }

  private createActionButton(x: number, y: number, width: number, height: number, labelText: string, onClick: () => void, disabled = false, accent: 'green' | 'blue' | 'gold' | 'purple' | 'neutral' = 'neutral'): { button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const result = UiKit.button(this, x, y, width, height, labelText, onClick, { disabled, accent, fontSize: UI.font.small });
    this.actionObjects.push(result.button, result.label);
    return result;
  }

  private shortSkillName(name: string): string {
    const words = name.toUpperCase().split(' ');
    if (words.length === 1) return words[0].slice(0, 10);
    return `${words[0].slice(0, 6)} ${words[1].slice(0, 5)}`;
  }

  private async handleCombatAction(playerAction: CombatAction): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    if (this.time.now < this.actionArmAt) return;
    if (playerAction.type === 'skill') {
      const check = SpecialEffectEngine.canUseSkill(this.playerChampion, DataRegistry.skill(playerAction.skillId), this.ensureResourceStore());
      if (!check.allowed) {
        this.setMessage(check.message ?? 'No puedes usar esa habilidad todavía.');
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

  private async performAction(actor: BattleActor, action: CombatAction): Promise<void> {
    const attacker = actor === 'player' ? this.playerChampion : this.wildChampion;
    const defender = actor === 'player' ? this.wildChampion : this.playerChampion;
    const attackerName = DataRegistry.champion(attacker.championId).name;
    const defenderName = DataRegistry.champion(defender.championId).name;

    if (!await this.beginActorTurn(actor)) return;
    if (this.battleEnded || this.awaitingSwitch) return;

    this.refreshCombatStats();
    const attackerStats = actor === 'player' ? this.playerStats : this.wildStats;
    const defenderStats = actor === 'player' ? this.wildStats : this.playerStats;
    const attackerStatuses = this.statusesFor(attacker);
    const defenderStatuses = this.statusesFor(defender);
    const targetSprite = actor === 'player' ? this.wildSprite : this.playerSprite;
    const defenderHp = actor === 'player' ? this.wildHp : this.playerHp;
    const defenderMaxHp = this.statsForChampion(defender).hp;
    const attackerMaxHpBefore = this.statsForChampion(attacker).hp;

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
      effectiveness = TypeEffectivenessService.forSkill(skill, defender, this.currentFormId(defender));
      stabMultiplier = TypeEffectivenessService.stabMultiplier(skill, attacker, this.currentFormId(attacker));
      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {
        defenderCurrentHp: defenderHp,
        defenderMaxHp,
        affinityMultiplier: effectiveness.multiplier,
        stabMultiplier
      });
    }

    if (resolution.damage > 0) {
      const passiveBonus = SpecialEffectEngine.bonusDamageFromPassive(attacker, this.ensureFormStore());
      if (passiveBonus > 0) {
        const passive = SpecialEffectEngine.passive(attacker, this.ensureFormStore());
        const passiveEffectiveness = TypeEffectivenessService.forSkill(passive, defender, this.currentFormId(defender));
        const passiveStab = TypeEffectivenessService.stabMultiplier(passive, attacker, this.currentFormId(attacker));
        resolution.damage += Math.max(0, Math.round(passiveBonus * passiveEffectiveness.multiplier * passiveStab));
      }
    }

    const blindChance = BattleEngine.actionHasDamage(action) ? StatusEngine.blindMissChance(attackerStatuses) : 0;
    const evasionChance = BattleEngine.actionHasDamage(action) ? StatusEngine.evasionMissChance(defenderStatuses) : 0;
    const missChance = 1 - (1 - blindChance) * (1 - evasionChance);
    const missed = missChance > 0 && Math.random() < missChance;

    await this.awaitContinue(`${attackerName} usa ${resolution.label}.`);
    await this.wait(ACTION_WINDUP_MS);
    await this.animateAction(actor, skill, resolution.damage > 0);

    if (missed) {
      const application = skill
        ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, false)
        : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
      this.persistStatusStore();
      this.refreshUi();
      await this.awaitContinue(evasionChance > 0 ? `${defenderName} evita el ataque.` : `${attackerName} falla por Ceguera.`);
      await this.announceAppliedStatuses(attacker, attackerStatuses, application.selfAppliedIds);
      this.finishActorTurn(actor, application.selfAppliedIds);
      return;
    }

    const shield = StatusEngine.absorbDamage(defenderStatuses, resolution.damage);
    const actualDamage = shield.damage;
    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - actualDamage);
    else this.playerHp = Math.max(0, this.playerHp - actualDamage);
    if (actualDamage > 0) {
      StatusEngine.chargeExplosive(defenderStatuses);
      SpecialEffectEngine.onDamageTaken(defender, this.ensureResourceStore(), this.ensureFormStore());
    }

    if (resolution.heal > 0) {
      if (actor === 'player') this.playerHp = Math.min(this.statsForChampion(attacker).hp, this.playerHp + resolution.heal);
      else this.wildHp = Math.min(this.statsForChampion(attacker).hp, this.wildHp + resolution.heal);
    }

    const application = skill
      ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, true)
      : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
    if (skill) {
      StatusEngine.setAffinityMultiplier(defenderStatuses, application.enemyAppliedIds, effectiveness.multiplier);
      StatusEngine.setStabMultiplier(defenderStatuses, application.enemyAppliedIds, stabMultiplier);
    }
    const transformed = skill
      ? SpecialEffectEngine.applyTransformation(attacker, skill, this.ensureResourceStore(), this.ensureFormStore())
      : null;
    if (transformed) this.syncFormVisualAndHp(actor, attackerMaxHpBefore);
    this.persistSpecialStores();
    this.persistStatusStore();
    this.refreshUi();

    if (actualDamage > 0) this.hitFeedback(targetSprite);
    const effectivenessMessage = skill && actualDamage > 0 ? TypeEffectivenessService.battleMessage(effectiveness) : null;
    if (effectivenessMessage) await this.awaitContinue(effectivenessMessage);
    if (shield.absorbed > 0) {
      await this.awaitContinue(
        actualDamage > 0
          ? `El escudo de ${defenderName} amortigua el golpe.`
          : `${defenderName} bloquea el impacto con su escudo.`
      );
    }
    if (resolution.notes.includes('EJECUCIÓN')) {
      await this.awaitContinue('¡El rival ha cruzado el umbral de ejecución!');
    }

    await this.announceAppliedStatuses(attacker, attackerStatuses, application.selfAppliedIds);
    await this.announceAppliedStatuses(defender, defenderStatuses, application.enemyAppliedIds);
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

    this.finishActorTurn(actor, application.selfAppliedIds, Boolean(transformed));
  }

  private async beginActorTurn(actor: BattleActor): Promise<boolean> {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const statuses = this.statusesFor(champion);
    const name = DataRegistry.champion(champion.championId).name;
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
      if (this.wildHp <= 0) {
        await this.finishVictory();
        return false;
      }
      if (this.playerHp <= 0) {
        await this.handlePlayerKnockout();
        return false;
      }
    }

    const blocked = StatusEngine.blockingKind(statuses);
    if (blocked) {
      const message = blocked === 'banish'
        ? `${name} está fuera del combate este turno.`
        : blocked === 'polymorph'
          ? `${name} está transformado y no puede actuar.`
          : `${name} está aturdido y no puede actuar.`;
      await this.awaitContinue(message);
      this.finishActorTurn(actor);
      return false;
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
      if (status.kind === 'blind') message = `¡${name} queda cegado!`;
      if (status.kind === 'stun') message = `¡${name} queda aturdido!`;
      if (status.kind === 'shield') message = `${name} obtiene un escudo.`;
      if (status.kind === 'evasion') message = `${name} aumenta su evasión.`;
      if (status.kind === 'polymorph') message = `¡${name} queda transformado!`;
      if (status.kind === 'banish') message = `¡${name} es expulsado temporalmente del combate!`;
      if (status.kind === 'explosive') message = `¡${name} queda marcado con una Carga explosiva!`;
      if (message) await this.awaitContinue(message);
    }
  }

  private finishActorTurn(actor: BattleActor, protectedIds: string[] = [], skipFormAdvance = false): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    StatusEngine.advanceTurn(this.statusesFor(champion), protectedIds);
    const forms = this.ensureFormStore();
    SpecialEffectEngine.onTurnFinished(champion, this.ensureResourceStore(), forms);
    if (!skipFormAdvance && this.currentFormId(champion)) {
      const oldMaxHp = this.statsForChampion(champion).hp;
      SpecialEffectEngine.decrementFormAfterAction(champion, forms);
      const state = SpecialEffectEngine.formState(champion, forms);
      if (state && state.remainingTurns <= 0) {
        SpecialEffectEngine.expireFormAtTurnStart(champion, forms);
        this.syncFormVisualAndHp(actor, oldMaxHp);
      }
    }
    this.persistSpecialStores();
    this.persistStatusStore();
    this.refreshUi();
  }

  private chooseEnemyAction(): CombatAction {
    const formId = this.currentFormId(this.wildChampion);
    const resources = this.ensureResourceStore();
    const usable = BattleEngine.unlockedSkills(this.wildChampion, formId)
      .filter((skill) => SpecialEffectEngine.canUseSkill(this.wildChampion, skill, resources).allowed);
    if (usable.length > 0) {
      const skill = usable[Math.floor(Math.random() * usable.length)];
      return { type: 'skill', skillId: skill.id };
    }
    return BattleEngine.chooseEnemyAction(this.wildChampion, formId);
  }

  private availableReplacements(): ChampionInstance[] {
    return this.save.party.filter((champion) => champion.instanceId !== this.playerChampion.instanceId && champion.currentHp > 0);
  }

  private openManualSwitch(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
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

    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private selectReplacement(champion: ChampionInstance, manual: boolean): void {
    if (!this.awaitingSwitch || champion.currentHp <= 0) return;
    this.overlayLayer?.destroy(true);
    this.overlayLayer = undefined;
    this.wildChampion.currentHp = Math.max(1, this.wildHp);
    const participants = this.participantIds();
    if (!participants.includes(champion.instanceId)) participants.push(champion.instanceId);
    this.registry.set('battle.participants', participants);
    this.registry.set('battle.activeInstanceId', champion.instanceId);
    if (manual) this.registry.set('battle.pendingEnemyAction', true);
    SaveService.save(this.save);
    this.awaitingSwitch = false;
    this.scene.restart();
  }

  private battleItems(): ItemDefinition[] {
    return Object.entries(this.save.inventory)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId]) => DataRegistry.item(itemId))
      .filter((item) => Boolean(item.battleEffect));
  }

  private openBattleItems(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    const items = this.battleItems();
    if (items.length === 0) return;

    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.rectangle(256, 142, 390, 190, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 256, 56, 'OBJETOS DE COMBATE', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0));
    objects.push(UiKit.label(this, 256, 80, 'Usar un objeto consume el turno.', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));

    items.slice(0, 6).forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 174 + col * 170;
      const y = 118 + row * 42;
      const quantity = InventoryService.quantity(this.save, item.id);
      const linkerLevel = item.battleEffect?.type === 'echo-link' ? ` · NV ${LinkService.linkerLevel(this.save)}` : '';
      const button = this.add.rectangle(x, y, 154, 34, UI.colors.panelRaised, 1)
        .setStrokeStyle(2, item.battleEffect?.type === 'echo-link' ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      const name = UiKit.label(this, x - 67, y - 11, item.name.toUpperCase(), UI.font.tiny, UI.text.primary, true).setWordWrapWidth(120);
      const detail = UiKit.label(this, x - 67, y + 6, item.battleEffect?.consumes ? `×${quantity}` : `PERMANENTE${linkerLevel}`, UI.font.tiny, item.battleEffect?.type === 'echo-link' ? UI.text.gold : UI.text.accent, true);
      button.on(Phaser.Input.Events.POINTER_UP, () => void this.useBattleItem(item));
      objects.push(button, name, detail);
    });

    const cancel = UiKit.button(this, 256, 222, 90, 24, 'CANCELAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(cancel.button, cancel.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private async useBattleItem(item: ItemDefinition): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || !item.battleEffect) return;
    this.overlayLayer?.destroy(true);
    this.overlayLayer = undefined;

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
      this.finishActorTurn('player');
      await this.resolveEnemyResponse();
      return;
    }

    if (item.battleEffect.type === 'echo-link') {
      await this.handleLinkWithArtifact();
    }
  }

  private async handleLinkWithArtifact(): Promise<void> {
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
    await this.animateLinkAttempt();

    if (Math.random() <= chance) {
      this.wildChampion.currentHp = Math.max(1, this.wildHp);
      this.playerChampion.currentHp = Math.max(1, this.playerHp);
      const goesToParty = this.save.party.length < 5;
      if (goesToParty) this.save.party.push(this.wildChampion);
      else this.save.storage.push(this.wildChampion);
      QuestService.recordEvent(this.save, { type: 'link', targetId: this.wildChampion.championId });
      SaveService.save(this.save);
      this.cleanupBattleSession();
      this.battleEnded = true;
      this.disableActions();
      await this.awaitContinue(`¡Sincronización completa! ${DataRegistry.champion(this.wildChampion.championId).name} ${goesToParty ? 'se une al equipo.' : 'queda en reserva.'}`);
      this.scene.start('WorldScene');
      return;
    }

    this.finishActorTurn('player');
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

  private flee(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(1, this.wildHp);
    SaveService.save(this.save);
    this.cleanupBattleSession();
    this.scene.start('WorldScene');
  }

  private async finishVictory(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.playerChampion.currentHp = Math.max(1, this.playerHp);
    this.wildChampion.currentHp = 0;
    QuestService.recordEvent(this.save, { type: 'defeat', targetId: this.wildChampion.championId });
    const participants = this.participantIds();
    const gains = ProgressionService.awardPartyExperience(this.save, this.wildChampion, participants.length > 0 ? participants : [this.playerChampion.instanceId]);
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

  private refreshCombatStats(): void {
    this.playerStats = StatusEngine.effectiveStats(this.statsForChampion(this.playerChampion), this.statusesFor(this.playerChampion));
    this.wildStats = StatusEngine.effectiveStats(this.statsForChampion(this.wildChampion), this.statusesFor(this.wildChampion));
  }

  private cleanupBattleSession(): void {
    this.registry.remove('pendingEncounter');
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
    this.registry.remove('battle.pendingEnemyAction');
    this.registry.remove('battle.statuses');
    this.registry.remove('battle.resources');
    this.registry.remove('battle.forms');
    this.registry.remove('battle.openingPassives');
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
    this.createActions();
  }

  private idlePrompt(): string {
    const resource = SpecialEffectEngine.resourceLabel(this.playerChampion, this.ensureResourceStore(), this.ensureFormStore());
    const form = SpecialEffectEngine.formState(this.playerChampion, this.ensureFormStore());
    if (form) return `Elige tu siguiente acción. · ${DataRegistry.form(this.playerChampion.championId, form.formId).name} ${form.remainingTurns}t`;
    return resource ? `Elige tu siguiente acción. · ${resource}` : 'Elige tu siguiente acción.';
  }

  private disableActions(): void {
    for (const object of this.actionObjects) {
      if (!object.active) continue;
      object.disableInteractive();
      object.setAlpha(0.55);
    }
  }

  private refreshUi(): void {
    this.refreshCombatStats();
    this.playerHpUi.maxHp = this.playerStats.hp;
    this.wildHpUi.maxHp = this.wildStats.hp;
    this.playerHp = Math.min(this.playerHp, this.playerStats.hp);
    this.wildHp = Math.min(this.wildHp, this.wildStats.hp);
    this.playerHpUi.affinityText.setText(this.affinityLabelFor(this.playerChampion));
    this.wildHpUi.affinityText.setText(this.affinityLabelFor(this.wildChampion));
    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));
    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));
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
    visibleStatuses.slice(0, 6).forEach((status, index) => {
      const x = index * 20;
      const shield = status.kind === 'shield';
      const color = shield ? 0xf4f7fb : (status.beneficial ? 0x3eaf72 : 0xc85c64);
      const circle = this.add.circle(x, 0, 7, color, 0.96).setStrokeStyle(1, shield ? 0x9fb4c4 : 0x07131e, 0.9);
      const symbol = UiKit.label(this, x, -1, this.statusSymbol(status), UI.font.tiny, shield ? '#07131e' : '#ffffff', true).setOrigin(0.5);
      layer.add([circle, symbol]);
    });
  }

  private statusSymbol(status: CombatStatusInstance): string {
    if (status.kind === 'poison') return '×';
    if (status.kind === 'blind') return '○';
    if (status.kind === 'stun') return '!';
    if (status.kind === 'shield') return '◆';
    if (status.kind === 'evasion') return '◇';
    if (status.kind === 'polymorph') return '?';
    if (status.kind === 'banish') return '↗';
    if (status.kind === 'explosive') return String(status.stacks ?? 0);
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
    const base = this.baseBattleSize(champion.championId, actor);
    const formScale = CatalogoContenido.escalaCombate(champion.championId, this.currentFormId(champion));
    const statusScale = this.statusVisualScale(this.statusesFor(champion));
    const scale = formScale * statusScale;
    const width = Math.round(base.width * scale);
    const height = Math.round(base.height * scale);
    const baseY = actor === 'player' ? 180 : 121;
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
    if (championId === 'garen') return actor === 'player' ? { width: 132, height: 134 } : { width: 116, height: 120 };
    return { width: 104, height: 116 };
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
    const explosive = this.statusesFor(champion).find((status) => status.kind === 'explosive');
    if (!explosive) return;

    layer.setPosition(sprite.x + width * 0.38, groundY - height * 0.7);
    const body = this.add.circle(0, 0, 10, 0x111820, 0.98).setStrokeStyle(2, UI.colors.gold);
    const fuse = this.add.rectangle(7, -9, 8, 3, UI.colors.gold, 1).setRotation(-0.65);
    const spark = this.add.circle(11, -13, 2, 0xffd27a, 1);
    const stacks = Math.max(0, explosive.stacks ?? 0);
    const maxStacks = typeof explosive.params?.maxAcumulaciones === 'number' ? explosive.params.maxAcumulaciones : 5;
    const counter = UiKit.label(this, 0, -1, String(stacks), UI.font.tiny, '#ffffff', true).setOrigin(0.5);
    layer.add([body, fuse, spark, counter]);

    const visiblePips = Math.min(5, Math.max(1, maxStacks));
    for (let i = 0; i < visiblePips; i += 1) {
      const filled = i < stacks;
      const pip = this.add.circle(-10 + i * 5, 15, 2, filled ? UI.colors.gold : 0x2a3945, 1)
        .setStrokeStyle(1, filled ? UI.colors.gold : UI.colors.borderSoft);
      layer.add(pip);
    }
  }

  private affinityLabelFor(champion: ChampionInstance): string {
    return TypeEffectivenessService.typeNames(TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion)));
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
        this.continueLayer?.destroy(true);
        this.continueLayer = undefined;
        this.awaitingContinue = false;
        resolve();
      };

      const prompt = UiKit.button(this, 430, 205, 142, 24, 'A · CONTINUAR', done, {
        accent: 'green', fontSize: UI.font.tiny, selected: true
      });
      this.continueLayer = this.add.container(0, 0, [prompt.button, prompt.label]).setDepth(11500);
      keyboard?.once('keydown-A', done);
      keyboard?.once('keydown-ENTER', done);
      keyboard?.once('keydown-SPACE', done);
    });
  }

  private async animateAction(actor: BattleActor, skill: SkillDefinition | null, hasDamage: boolean): Promise<void> {
    const attacker = actor === 'player' ? this.playerSprite : this.wildSprite;
    const target = actor === 'player' ? this.wildSprite : this.playerSprite;
    if (!hasDamage) {
      await this.animateAura(attacker);
      return;
    }

    const magical = Boolean(skill?.effects.some((effect) => effect.type === 'damage' && effect.stat === 'power'));
    if (magical) await this.animateProjectile(attacker, target);
    else await this.animateLunge(attacker, actor);
  }

  private animateLunge(sprite: Phaser.GameObjects.Image, actor: BattleActor): Promise<void> {
    return new Promise((resolve) => {
      const originX = sprite.x;
      const offset = actor === 'player' ? 28 : -28;
      this.tweens.add({
        targets: sprite,
        x: originX + offset,
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          sprite.x = originX;
          resolve();
        }
      });
    });
  }

  private animateProjectile(attacker: Phaser.GameObjects.Image, target: Phaser.GameObjects.Image): Promise<void> {
    return new Promise((resolve) => {
      const projectile = this.add.circle(attacker.x, attacker.y - attacker.displayHeight * 0.55, 5, 0xb8ecff, 1)
        .setStrokeStyle(2, 0xffffff, 0.9)
        .setDepth(9000);
      this.tweens.add({
        targets: projectile,
        x: target.x,
        y: target.y - target.displayHeight * 0.55,
        scale: 1.35,
        duration: 250,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          projectile.destroy();
          resolve();
        }
      });
    });
  }

  private animateAura(sprite: Phaser.GameObjects.Image): Promise<void> {
    return new Promise((resolve) => {
      const aura = this.add.circle(sprite.x, sprite.y - sprite.displayHeight * 0.45, 18, 0x9ce7c7, 0.16)
        .setStrokeStyle(2, 0xe9fff5, 0.9)
        .setDepth(8500)
        .setScale(0.45);
      this.tweens.add({
        targets: aura,
        scale: 1.7,
        alpha: 0,
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => {
          aura.destroy();
          resolve();
        }
      });
    });
  }

  private animateLinkAttempt(): Promise<void> {
    return new Promise((resolve) => {
      this.wildSprite.setTint(0xc7a4ff);
      this.tweens.add({
        targets: this.wildSprite,
        alpha: 0.5,
        duration: 120,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          this.wildSprite.clearTint();
          this.wildSprite.setAlpha(1);
          resolve();
        }
      });
    });
  }

  private hitFeedback(sprite: Phaser.GameObjects.Image): void {
    sprite.setTint(0xffffff);
    this.tweens.add({
      targets: sprite,
      alpha: 0.42,
      scaleX: sprite.scaleX * 1.04,
      scaleY: sprite.scaleY * 0.96,
      duration: 70,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        sprite.clearTint();
        sprite.setAlpha(1);
      }
    });
  }

  private statusTickFeedback(sprite: Phaser.GameObjects.Image): void {
    sprite.setTint(0x8bc56d);
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
