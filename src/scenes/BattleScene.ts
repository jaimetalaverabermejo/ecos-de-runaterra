import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ActiveSkillSlot, ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
import { ProgressionService } from '../systems/progression/ProgressionService';
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
  maxWidth: number;
  maxHp: number;
}

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
  private linkButtonText!: Phaser.GameObjects.Text;
  private playerSprite!: Phaser.GameObjects.Image;
  private wildSprite!: Phaser.GameObjects.Image;
  private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];
  private switchLayer?: Phaser.GameObjects.Container;
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
    this.switchLayer = undefined;

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
    this.playerStats = BattleEngine.statsFor(this.playerChampion);
    this.wildStats = BattleEngine.statsFor(this.wildChampion);
    this.playerHp = Phaser.Math.Clamp(this.playerChampion.currentHp, 1, this.playerStats.hp);
    this.wildHp = Phaser.Math.Clamp(this.wildChampion.currentHp, 1, this.wildStats.hp);

    this.drawBattlefield();
    this.createCombatants();
    this.createPanels();
    this.createActions();
    this.refreshUi();

    const wildName = DataRegistry.champion(this.wildChampion.championId).name;
    const playerName = DataRegistry.champion(this.playerChampion.championId).name;
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
    this.wildHpUi = this.createHpPanel(12, 10, DataRegistry.champion(this.wildChampion.championId).name, this.wildChampion.mastery, this.wildStats.hp);
    this.playerHpUi = this.createHpPanel(322, 126, DataRegistry.champion(this.playerChampion.championId).name, this.playerChampion.mastery, this.playerStats.hp);

    this.messageText = UiKit.label(this, 16, 193, '', UI.font.small, UI.text.primary, true)
      .setWordWrapWidth(360, true)
      .setLineSpacing(2);
  }

  private createHpPanel(x: number, y: number, title: string, mastery: number, maxHp: number): HpUi {
    const width = 178;
    this.add.rectangle(x, y, width, 54, UI.colors.panel, 0.97).setOrigin(0, 0).setStrokeStyle(2, UI.colors.gold);
    UiKit.label(this, x + 10, y + 7, title, UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + width - 10, y + 8, `M ${mastery}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    this.add.rectangle(x + 10, y + 29, 150, 9, UI.colors.hpTrack, 1).setOrigin(0, 0.5).setStrokeStyle(1, UI.colors.borderSoft);
    const fill = this.add.rectangle(x + 11, y + 29, 148, 7, UI.colors.hp, 1).setOrigin(0, 0.5);
    const text = UiKit.label(this, x + width - 12, y + 38, '', UI.font.small, UI.text.primary, true).setOrigin(1, 0);
    return { fill, text, maxWidth: 148, maxHp };
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

    this.createActionButton(416, 224, 88, 26, 'ATAQUE', () => {
      void this.handleCombatAction({ type: 'basic' });
    }, false, 'green');

    const link = this.createActionButton(416, 253, 88, 26, 'VÍNCULO', () => {
      void this.handleLink();
    }, false, 'gold');
    this.linkButtonText = link.label;

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
    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion);
    const playerFirst = BattleEngine.playerActsFirst(this.playerChampion, this.wildChampion, playerAction, enemyAction);
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
    const attackerStats = actor === 'player' ? this.playerStats : this.wildStats;
    const defenderStats = actor === 'player' ? this.wildStats : this.playerStats;
    const targetSprite = actor === 'player' ? this.wildSprite : this.playerSprite;
    const attackerName = DataRegistry.champion(attacker.championId).name;
    let resolution;
    if (action.type === 'basic') {
      resolution = BattleEngine.resolveBasicAttack(attackerStats, defenderStats);
    } else {
      const skill = DataRegistry.skill(action.skillId);
      resolution = BattleEngine.resolveSkill(skill, BattleEngine.skillRank(attacker, skill), attackerStats, defenderStats);
    }

    this.setMessage(`${attackerName} prepara ${resolution.label}…`);
    await this.wait(ACTION_WINDUP_MS);
    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - resolution.damage);
    else this.playerHp = Math.max(0, this.playerHp - resolution.damage);

    this.setMessage(`${attackerName} usa ${resolution.label}. −${resolution.damage} VID.`);
    this.hitFeedback(targetSprite);
    this.refreshUi();
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
        const healed = Math.min(passiveHeal, this.playerStats.hp - this.playerHp);
        this.playerHp += healed;
        if (healed > 0) {
          this.setMessage(`${attackerName} activa su pasiva y recupera ${healed} VID.`);
          this.refreshUi();
          await this.wait(360);
        }
      } else {
        this.wildHp += Math.min(passiveHeal, this.wildStats.hp - this.wildHp);
        this.refreshUi();
      }
    }
  }

  private async handlePlayerKnockout(): Promise<void> {
    if (this.battleEnded || this.awaitingSwitch) return;
    this.playerHp = 0;
    this.playerChampion.currentHp = 0;
    this.refreshUi();
    this.disableActions();

    const available = this.save.party.filter((champion) => champion.instanceId !== this.playerChampion.instanceId && champion.currentHp > 0);
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
    this.showSwitchOverlay(available);
  }

  private showSwitchOverlay(available: ChampionInstance[]): void {
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.7));
    objects.push(this.add.rectangle(256, 142, 382, 176, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 256, 66, 'ELIGE TU SIGUIENTE ECO', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0));
    objects.push(UiKit.label(this, 256, 90, 'Los Ecos debilitados no pueden volver al combate.', UI.font.tiny, UI.text.secondary, true).setOrigin(0.5, 0));

    available.slice(0, 4).forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const stats = BattleEngine.statsFor(champion);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 170 + col * 172;
      const y = 128 + row * 54;
      const button = this.add.rectangle(x, y, 154, 42, UI.colors.panelRaised, 1)
        .setStrokeStyle(2, UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      const name = UiKit.label(this, x - 66, y - 13, definition.name.toUpperCase(), UI.font.small, UI.text.primary, true);
      const detail = UiKit.label(this, x - 66, y + 4, `M${champion.mastery} · ${champion.currentHp}/${stats.hp} VID`, UI.font.tiny, UI.text.accent, true);
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setStrokeStyle(2, UI.colors.gold));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setStrokeStyle(2, UI.colors.borderSoft));
      button.on(Phaser.Input.Events.POINTER_UP, () => this.selectReplacement(champion));
      objects.push(button, name, detail);
    });

    this.switchLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private selectReplacement(champion: ChampionInstance): void {
    if (!this.awaitingSwitch || champion.currentHp <= 0) return;
    this.switchLayer?.destroy(true);
    this.switchLayer = undefined;
    this.wildChampion.currentHp = Math.max(1, this.wildHp);
    const participants = this.participantIds();
    if (!participants.includes(champion.instanceId)) participants.push(champion.instanceId);
    this.registry.set('battle.participants', participants);
    this.registry.set('battle.activeInstanceId', champion.instanceId);
    SaveService.save(this.save);
    this.awaitingSwitch = false;
    this.scene.restart();
  }

  private async handleLink(): Promise<void> {
    if (this.busy || this.battleEnded || this.awaitingSwitch) return;
    this.busy = true;
    const chance = BattleEngine.linkChance(this.wildHp, this.wildStats.hp);
    this.setMessage(`Vínculo en curso… estabilidad ${Math.round(chance * 100)}%.`);
    this.wildSprite.setTint(0xc7a4ff);
    await this.wait(720);
    this.wildSprite.clearTint();

    if (Math.random() <= chance) {
      this.wildChampion.currentHp = Math.max(1, this.wildHp);
      this.playerChampion.currentHp = Math.max(1, this.playerHp);
      const goesToParty = this.save.party.length < 5;
      if (goesToParty) this.save.party.push(this.wildChampion);
      else this.save.storage.push(this.wildChampion);
      SaveService.save(this.save);
      this.cleanupBattleSession();
      this.battleEnded = true;
      this.setMessage(`¡Vínculo completado! ${DataRegistry.champion(this.wildChampion.championId).name} ${goesToParty ? 'se une al equipo.' : 'queda en reserva.'}`);
      this.disableActions();
      await this.wait(1150);
      this.scene.start('WorldScene');
      return;
    }

    this.setMessage('El Vínculo se rompe. El Eco contraataca.');
    await this.wait(650);
    await this.performAction('enemy', BattleEngine.chooseEnemyAction(this.wildChampion));
    if (!this.battleEnded && !this.awaitingSwitch) {
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

  private cleanupBattleSession(): void {
    this.registry.remove('pendingEncounter');
    this.registry.remove('battle.activeInstanceId');
    this.registry.remove('battle.participants');
  }

  private disableActions(): void {
    for (const object of this.actionObjects) {
      if (!object.active) continue;
      object.disableInteractive();
      object.setAlpha(0.55);
    }
  }

  private refreshUi(): void {
    this.updateHpUi(this.playerHpUi, this.playerHp);
    this.updateHpUi(this.wildHpUi, this.wildHp);
    if (this.linkButtonText && !this.battleEnded) {
      const chance = BattleEngine.linkChance(this.wildHp, this.wildStats.hp);
      this.linkButtonText.setText(`VÍNCULO ${Math.round(chance * 100)}%`);
    }
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(0, this.wildHp);
  }

  private updateHpUi(ui: HpUi, hp: number): void {
    const ratio = Phaser.Math.Clamp(hp / ui.maxHp, 0, 1);
    ui.fill.displayWidth = ui.maxWidth * ratio;
    ui.fill.setFillStyle(this.hpColor(ratio), 1);
    ui.text.setText(`${Math.max(0, hp)} / ${ui.maxHp}`);
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
