import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, ItemDefinition, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
import { StatusEngine, type CombatStatusInstance } from '../systems/combat/StatusEngine';
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
  text: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  maxWidth: number;
  maxHp: number;
}

type BattleStatusStore = Record<string, CombatStatusInstance[]>;

const INITIATIVE_HOLD_MS = 600;
const ACTION_WINDUP_MS = 320;
const ACTION_RESULT_HOLD_MS = 720;
const BETWEEN_ACTIONS_MS = 420;
const ROUND_END_MS = 260;

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
  private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private overlayLayer?: Phaser.GameObjects.Container;
  private busy = false;
  private battleEnded = false;
  private awaitingSwitch = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.busy = false;
    this.battleEnded = false;
    this.awaitingSwitch = false;
    this.actionObjects = [];
    this.overlayLayer = undefined;

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
    this.refreshCombatStats();
    this.playerHp = Phaser.Math.Clamp(this.playerChampion.currentHp, 1, BattleEngine.statsFor(this.playerChampion).hp);
    this.wildHp = Phaser.Math.Clamp(this.wildChampion.currentHp, 1, BattleEngine.statsFor(this.wildChampion).hp);

    this.drawBattlefield();
    this.createCombatants();
    this.createPanels();
    this.createActions();
    this.refreshUi();

    const wildName = DataRegistry.champion(this.wildChampion.championId).name;
    const playerName = DataRegistry.champion(this.playerChampion.championId).name;
    const pendingEnemyAction = Boolean(this.registry.get('battle.pendingEnemyAction'));
    if (pendingEnemyAction) {
      this.registry.remove('battle.pendingEnemyAction');
      this.setMessage(`${playerName} entra al combate. ${wildName} aprovecha el cambio.`);
      void this.resolveEnemyResponse(500);
      return;
    }

    const faster = this.wildStats.speed > this.playerStats.speed ? wildName : playerName;
    this.setMessage(`${wildName} salvaje. ${faster} tiene ventaja de Velocidad.`);
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
    const playerTexture = this.playerBattleTexture(this.playerChampion.championId);
    const playerSize = this.playerChampion.championId === 'garen' ? { width: 132, height: 134 } : { width: 92, height: 108 };
    this.playerSprite = this.add.image(126, 180, playerTexture).setOrigin(0.5, 1).setDisplaySize(playerSize.width, playerSize.height);
    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);

    const wildTexture = this.wildBattleTexture(this.wildChampion.championId);
    const wildSize = this.wildChampion.championId === 'garen' ? { width: 116, height: 120 } : { width: 92, height: 108 };
    this.wildSprite = this.add.image(402, 121, wildTexture).setOrigin(0.5, 1).setDisplaySize(wildSize.width, wildSize.height);
  }

  private playerBattleTexture(championId: string): string {
    if (championId === 'garen') return 'garen-battle-back';
    if (championId === 'teemo') return 'teemo-battle-front';
    return 'garen-battle-back';
  }

  private wildBattleTexture(championId: string): string {
    if (championId === 'garen') return 'garen-battle-front';
    if (championId === 'teemo') return 'teemo-battle-front';
    return 'teemo-battle-front';
  }

  private createPanels(): void {
    this.wildHpUi = this.createHpPanel(12, 10, DataRegistry.champion(this.wildChampion.championId).name, this.wildChampion.mastery, BattleEngine.statsFor(this.wildChampion).hp);
    this.playerHpUi = this.createHpPanel(322, 126, DataRegistry.champion(this.playerChampion.championId).name, this.playerChampion.mastery, BattleEngine.statsFor(this.playerChampion).hp);

    this.messageText = UiKit.label(this, 16, 193, '', UI.font.small, UI.text.primary, true)
      .setWordWrapWidth(360, true)
      .setLineSpacing(2);
  }

  private createHpPanel(x: number, y: number, title: string, mastery: number, maxHp: number): HpUi {
    const width = 178;
    this.add.rectangle(x, y, width, 58, UI.colors.panel, 0.97).setOrigin(0, 0).setStrokeStyle(2, UI.colors.gold);
    UiKit.label(this, x + 10, y + 7, title, UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + width - 10, y + 8, `M ${mastery}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    this.add.rectangle(x + 10, y + 29, 150, 9, UI.colors.hpTrack, 1).setOrigin(0, 0.5).setStrokeStyle(1, UI.colors.borderSoft);
    const fill = this.add.rectangle(x + 11, y + 29, 148, 7, UI.colors.hp, 1).setOrigin(0, 0.5);
    const text = UiKit.label(this, x + width - 12, y + 37, '', UI.font.tiny, UI.text.primary, true).setOrigin(1, 0);
    const statusText = UiKit.label(this, x + 10, y + 46, '', UI.font.tiny, UI.text.accent, true);
    return { fill, text, statusText, maxWidth: 148, maxHp };
  }

  private createActions(): void {
    const definition = DataRegistry.champion(this.playerChampion.championId);
    const skillIds = definition.skillIds;
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const labels = ['Q', 'W', 'E', 'R'];
    const xs = [44, 126, 208, 290];

    for (let i = 0; i < 4; i += 1) {
      const skill = DataRegistry.skill(skillIds[i]);
      const slot = slots[i];
      const rank = this.playerChampion.skillRanks[slot];
      const unlocked = rank > 0;
      const label = `${labels[i]} · ${rank}/${ProgressionService.maxRank(slot)}\n${this.shortSkillName(skill.name)}`;
      this.createActionButton(xs[i], 253, 76, 56, label, () => {
        if (!unlocked) return;
        void this.handleCombatAction({ type: 'skill', skillId: skill.id });
      }, !unlocked, i === 0 ? 'blue' : 'neutral');
      if (!unlocked) {
        const masteryLabel = UiKit.label(this, xs[i], 273, `M${skill.unlockMastery}`, UI.font.tiny, UI.text.muted, true).setOrigin(0.5);
        this.actionObjects.push(masteryLabel);
      }
    }

    const canSwitch = this.availableReplacements().length > 0;
    const hasBattleItems = this.battleItems().length > 0;
    this.createActionButton(416, 224, 88, 26, 'CAMBIAR', () => this.openManualSwitch(), !canSwitch, 'blue');
    this.createActionButton(416, 253, 88, 26, 'OBJETOS', () => this.openBattleItems(), !hasBattleItems, 'gold');
    this.createActionButton(416, 282, 88, 22, 'HUIR', () => this.flee(), false, 'neutral');
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
    if (this.busy || this.battleEnded || this.awaitingSwitch) return;
    this.busy = true;
    this.refreshCombatStats();
    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion);
    const playerFirst = BattleEngine.playerActsFirst(
      this.playerChampion,
      this.wildChampion,
      playerAction,
      enemyAction,
      this.playerStats,
      this.wildStats
    );
    const order: Array<'player' | 'enemy'> = playerFirst ? ['player', 'enemy'] : ['enemy', 'player'];
    const firstName = playerFirst ? DataRegistry.champion(this.playerChampion.championId).name : DataRegistry.champion(this.wildChampion.championId).name;
    const firstSpeed = playerFirst ? this.playerStats.speed : this.wildStats.speed;
    const secondSpeed = playerFirst ? this.wildStats.speed : this.playerStats.speed;

    this.setMessage(`${firstName} toma la iniciativa · VEL ${firstSpeed} vs ${secondSpeed}.`);
    await this.wait(INITIATIVE_HOLD_MS);

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
    }
  }

  private async performAction(actor: 'player' | 'enemy', action: CombatAction): Promise<void> {
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
    const defenderMaxHp = BattleEngine.statsFor(defender).hp;

    let resolution;
    let skill = null as ReturnType<typeof DataRegistry.skill> | null;
    let rank = 1;
    if (action.type === 'basic') {
      resolution = BattleEngine.resolveBasicAttack(attackerStats, defenderStats);
    } else {
      skill = DataRegistry.skill(action.skillId);
      rank = BattleEngine.skillRank(attacker, skill);
      resolution = BattleEngine.resolveSkill(skill, rank, attackerStats, defenderStats, {
        defenderCurrentHp: defenderHp,
        defenderMaxHp
      });
    }

    const blindChance = BattleEngine.actionHasDamage(action) ? StatusEngine.blindMissChance(attackerStatuses) : 0;
    const missed = blindChance > 0 && Math.random() < blindChance;

    this.setMessage(`${attackerName} prepara ${resolution.label}…`);
    await this.wait(ACTION_WINDUP_MS);

    if (missed) {
      const application = skill
        ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, false)
        : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
      this.persistStatusStore();
      this.refreshUi();
      const extras = application.messages.length > 0 ? ` ${application.messages.join(' · ')}.` : '';
      this.setMessage(`${attackerName} falla por Ceguera.${extras}`);
      this.finishActorTurn(actor, application.selfAppliedIds);
      await this.wait(ACTION_RESULT_HOLD_MS);
      return;
    }

    const shield = StatusEngine.absorbDamage(defenderStatuses, resolution.damage);
    const actualDamage = shield.damage;
    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - actualDamage);
    else this.playerHp = Math.max(0, this.playerHp - actualDamage);

    if (resolution.heal > 0) {
      if (actor === 'player') this.playerHp = Math.min(BattleEngine.statsFor(attacker).hp, this.playerHp + resolution.heal);
      else this.wildHp = Math.min(BattleEngine.statsFor(attacker).hp, this.wildHp + resolution.heal);
    }

    const application = skill
      ? StatusEngine.applySkillEffects(skill, rank, attackerStatuses, defenderStatuses, true)
      : { selfAppliedIds: [], enemyAppliedIds: [], messages: [] };
    this.persistStatusStore();
    this.refreshUi();

    const damageText = resolution.damage > 0 ? ` −${actualDamage} VID.` : '';
    const shieldText = shield.absorbed > 0 ? ` Escudo de ${defenderName}: ${shield.absorbed} bloqueado.` : '';
    const healText = resolution.heal > 0 ? ` +${resolution.heal} VID.` : '';
    const stateText = application.messages.length > 0 ? ` ${application.messages.join(' · ')}.` : '';
    const noteText = resolution.notes.length > 0 ? ` ${resolution.notes.join(' · ')}.` : '';
    this.setMessage(`${attackerName} usa ${resolution.label}.${damageText}${shieldText}${healText}${stateText}${noteText}`);
    if (actualDamage > 0) this.hitFeedback(targetSprite);
    await this.wait(ACTION_RESULT_HOLD_MS);

    if (this.wildHp <= 0) {
      await this.finishVictory();
      return;
    }
    if (this.playerHp <= 0) {
      await this.handlePlayerKnockout();
      return;
    }

    const passiveHeal = BattleEngine.passiveHealing(attacker);
    if (passiveHeal > 0) {
      if (actor === 'player') {
        const healed = Math.min(passiveHeal, BattleEngine.statsFor(attacker).hp - this.playerHp);
        this.playerHp += healed;
        if (healed > 0) {
          this.setMessage(`${attackerName} activa su pasiva y recupera ${healed} VID.`);
          this.refreshUi();
          await this.wait(360);
        }
      } else {
        this.wildHp += Math.min(passiveHeal, BattleEngine.statsFor(attacker).hp - this.wildHp);
        this.refreshUi();
      }
    }

    this.finishActorTurn(actor, application.selfAppliedIds);
  }

  private async beginActorTurn(actor: 'player' | 'enemy'): Promise<boolean> {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const statuses = this.statusesFor(champion);
    const name = DataRegistry.champion(champion.championId).name;
    const poisonDamage = StatusEngine.poisonDamage(statuses);

    if (poisonDamage > 0) {
      if (actor === 'player') this.playerHp = Math.max(0, this.playerHp - poisonDamage);
      else this.wildHp = Math.max(0, this.wildHp - poisonDamage);
      this.refreshUi();
      this.setMessage(`${name} sufre ${poisonDamage} VID por Veneno.`);
      await this.wait(520);
      if (this.wildHp <= 0) {
        await this.finishVictory();
        return false;
      }
      if (this.playerHp <= 0) {
        await this.handlePlayerKnockout();
        return false;
      }
    }

    if (StatusEngine.isStunned(statuses)) {
      this.setMessage(`${name} está aturdido y pierde el turno.`);
      this.finishActorTurn(actor);
      await this.wait(650);
      return false;
    }

    return true;
  }

  private finishActorTurn(actor: 'player' | 'enemy', protectedIds: string[] = []): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    StatusEngine.advanceTurn(this.statusesFor(champion), protectedIds);
    this.persistStatusStore();
    this.refreshUi();
  }

  private availableReplacements(): ChampionInstance[] {
    return this.save.party.filter((champion) => champion.instanceId !== this.playerChampion.instanceId && champion.currentHp > 0);
  }

  private openManualSwitch(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch) return;
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
    if (available.length === 0) {
      this.setMessage(`${playerName} ha caído. No quedan Ecos capaces de combatir.`);
      await this.wait(700);
      await this.finishPartyDefeat();
      return;
    }

    this.awaitingSwitch = true;
    this.busy = true;
    this.setMessage(`${playerName} ha caído. Elige otro Eco para continuar.`);
    await this.wait(450);
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
    if (this.busy || this.battleEnded || this.awaitingSwitch) return;
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
    if (this.busy || this.battleEnded || this.awaitingSwitch || !item.battleEffect) return;
    this.overlayLayer?.destroy(true);
    this.overlayLayer = undefined;

    if (item.battleEffect.type === 'heal') {
      const missing = BattleEngine.statsFor(this.playerChampion).hp - this.playerHp;
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
      this.setMessage(`${item.name}: ${DataRegistry.champion(this.playerChampion.championId).name} recupera ${healed} VID.`);
      this.finishActorTurn('player');
      await this.resolveEnemyResponse(700);
      return;
    }

    if (item.battleEffect.type === 'echo-link') {
      await this.handleLinkWithArtifact();
    }
  }

  private async handleLinkWithArtifact(): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch || !LinkService.hasLinker(this.save)) return;
    this.busy = true;
    if (!await this.beginActorTurn('player')) return;
    const statusMultiplier = StatusEngine.linkModifier(this.statusesFor(this.wildChampion));
    const chance = LinkService.chance(
      this.save,
      this.playerChampion,
      this.wildChampion,
      this.wildHp,
      BattleEngine.statsFor(this.wildChampion).hp,
      statusMultiplier
    );
    this.setMessage(LinkService.feedback(chance));
    this.wildSprite.setTint(0xc7a4ff);
    await this.wait(780);
    this.wildSprite.clearTint();

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
      this.setMessage(`¡Sincronización completa! ${DataRegistry.champion(this.wildChampion.championId).name} ${goesToParty ? 'se une al equipo.' : 'queda en reserva.'}`);
      this.disableActions();
      await this.wait(1200);
      this.scene.start('WorldScene');
      return;
    }

    this.finishActorTurn('player');
    this.setMessage('La conexión se rompe. El Eco rechaza el Vinculador y contraataca.');
    await this.resolveEnemyResponse(650);
  }

  private async resolveEnemyResponse(delay = 0): Promise<void> {
    this.busy = true;
    if (delay > 0) await this.wait(delay);
    if (this.battleEnded || this.awaitingSwitch || this.playerHp <= 0 || this.wildHp <= 0) return;
    await this.performAction('enemy', BattleEngine.chooseEnemyAction(this.wildChampion));
    if (!this.battleEnded && !this.awaitingSwitch && this.playerHp > 0) {
      this.busy = false;
      this.refreshUi();
    }
  }

  private flee(): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch) return;
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
    this.setMessage(`${DataRegistry.champion(this.wildChampion.championId).name} ha caído. ¡Victoria!`);
    await this.wait(900);
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
    this.setMessage('Todo el equipo ha caído. La luz del último santuario responde…');
    await this.wait(1100);
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
    this.playerStats = StatusEngine.effectiveStats(BattleEngine.statsFor(this.playerChampion), this.statusesFor(this.playerChampion));
    this.wildStats = StatusEngine.effectiveStats(BattleEngine.statsFor(this.wildChampion), this.statusesFor(this.wildChampion));
  }

  private cleanupBattleSession(): void {
    this.registry.remove('pendingEncounter');
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
    this.registry.remove('battle.pendingEnemyAction');
    this.registry.remove('battle.statuses');
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
    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));
    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(0, this.wildHp);
  }

  private updateHpUi(ui: HpUi, hp: number, statuses: CombatStatusInstance[]): void {
    const ratio = Phaser.Math.Clamp(hp / ui.maxHp, 0, 1);
    ui.fill.displayWidth = ui.maxWidth * ratio;
    ui.fill.setFillStyle(this.hpColor(ratio), 1);
    ui.text.setText(`${Math.max(0, hp)} / ${ui.maxHp}`);
    ui.statusText.setText(StatusEngine.format(statuses));
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }

  private setMessage(message: string): void {
    this.messageText.setText(message);
  }

  private hitFeedback(sprite: Phaser.GameObjects.Image): void {
    sprite.setTint(0xffffff);
    this.tweens.add({ targets: sprite, alpha: 0.45, duration: 70, yoyo: true, repeat: 1, onComplete: () => { sprite.clearTint(); sprite.setAlpha(1); } });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}
