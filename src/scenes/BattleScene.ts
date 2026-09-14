import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/combat/BattleEngine';
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
  private busy = false;
  private battleEnded = false;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.save = this.registry.get('save') as SaveGame;
    const encounter = this.registry.get('pendingEncounter') as PendingEncounter | undefined;
    const playerChampion = this.save.party[0];
    const wildChampion = encounter?.wildChampion;

    if (!playerChampion || !wildChampion) {
      this.scene.start('WorldScene');
      return;
    }

    this.playerChampion = playerChampion;
    this.wildChampion = wildChampion;
    this.playerStats = BattleEngine.statsFor(playerChampion);
    this.wildStats = BattleEngine.statsFor(wildChampion);
    this.playerHp = Phaser.Math.Clamp(playerChampion.currentHp, 1, this.playerStats.hp);
    this.wildHp = Phaser.Math.Clamp(wildChampion.currentHp, 1, this.wildStats.hp);

    this.drawBattlefield();
    this.createCombatants();
    this.createPanels();
    this.createActions();
    this.refreshUi();

    const wildName = DataRegistry.champion(this.wildChampion.championId).name;
    const faster = this.wildStats.speed > this.playerStats.speed ? wildName : DataRegistry.champion(this.playerChampion.championId).name;
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
    this.playerSprite = this.add.image(126, 180, 'garen-battle-back').setOrigin(0.5, 1).setDisplaySize(132, 134);
    this.wildSprite = this.add.image(402, 121, 'teemo-battle-front').setOrigin(0.5, 1).setDisplaySize(92, 108);
  }

  private createPanels(): void {
    this.wildHpUi = this.createHpPanel(12, 10, `${DataRegistry.champion(this.wildChampion.championId).name}`, this.wildChampion.level, this.wildStats.hp);
    this.playerHpUi = this.createHpPanel(322, 126, `${DataRegistry.champion(this.playerChampion.championId).name}`, this.playerChampion.level, this.playerStats.hp);

    this.messageText = UiKit.label(this, 16, 193, '', UI.font.small, UI.text.primary, true)
      .setWordWrapWidth(360, true)
      .setLineSpacing(2);
  }

  private createHpPanel(x: number, y: number, title: string, level: number, maxHp: number): HpUi {
    const width = 178;
    this.add.rectangle(x, y, width, 54, UI.colors.panel, 0.97).setOrigin(0, 0).setStrokeStyle(2, UI.colors.gold);
    UiKit.label(this, x + 10, y + 7, title, UI.font.heading, UI.text.primary, true);
    UiKit.label(this, x + width - 10, y + 8, `Nv. ${level}`, UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    this.add.rectangle(x + 10, y + 29, 150, 9, UI.colors.hpTrack, 1).setOrigin(0, 0.5).setStrokeStyle(1, UI.colors.borderSoft);
    const fill = this.add.rectangle(x + 11, y + 29, 148, 7, UI.colors.hp, 1).setOrigin(0, 0.5);
    const text = UiKit.label(this, x + width - 12, y + 38, '', UI.font.small, UI.text.primary, true).setOrigin(1, 0);
    return { fill, text, maxWidth: 148, maxHp };
  }

  private createActions(): void {
    const definition = DataRegistry.champion(this.playerChampion.championId);
    const skillIds = definition.skillIds;
    const slots = ['Q', 'W', 'E', 'R'];
    const xs = [44, 126, 208, 290];

    for (let i = 0; i < 4; i += 1) {
      const skill = DataRegistry.skill(skillIds[i]);
      const unlocked = this.playerChampion.mastery >= skill.unlockMastery;
      const label = `${slots[i]}\n${this.shortSkillName(skill.name)}`;
      this.createActionButton(xs[i], 253, 76, 56, label, () => {
        if (!unlocked) return;
        void this.handleCombatAction({ type: 'skill', skillId: skill.id });
      }, !unlocked, i === 0 ? 'blue' : 'neutral');
      if (!unlocked) {
        UiKit.label(this, xs[i], 273, `M${skill.unlockMastery}`, UI.font.tiny, UI.text.muted, true).setOrigin(0.5);
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
    if (this.busy || this.battleEnded) return;
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
      if (this.battleEnded || this.playerHp <= 0 || this.wildHp <= 0) break;
      if (actor === 'player') await this.performAction('player', playerAction);
      else await this.performAction('enemy', enemyAction);
      if (!this.battleEnded && i < order.length - 1) await this.wait(BETWEEN_ACTIONS_MS);
    }

    if (!this.battleEnded && this.playerHp > 0 && this.wildHp > 0) {
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
    const resolution = action.type === 'basic'
      ? BattleEngine.resolveBasicAttack(attackerStats, defenderStats)
      : BattleEngine.resolveSkill(DataRegistry.skill(action.skillId), attackerStats, defenderStats);

    this.setMessage(`${attackerName} prepara ${resolution.label}…`);
    await this.wait(ACTION_WINDUP_MS);
    if (actor === 'player') this.wildHp = Math.max(0, this.wildHp - resolution.damage);
    else this.playerHp = Math.max(0, this.playerHp - resolution.damage);

    this.setMessage(`${attackerName} usa ${resolution.label}. −${resolution.damage} VID.`);
    this.hitFeedback(targetSprite);
    this.refreshUi();
    await this.wait(ACTION_RESULT_HOLD_MS);

    if (this.wildHp <= 0) { await this.finishVictory(); return; }
    if (this.playerHp <= 0) { await this.finishDefeat(); return; }

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

  private async handleLink(): Promise<void> {
    if (this.busy || this.battleEnded) return;
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
      this.registry.remove('pendingEncounter');
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
    if (!this.battleEnded) {
      this.busy = false;
      this.refreshUi();
    }
  }

  private flee(): void {
    if (this.busy || this.battleEnded) return;
    this.playerChampion.currentHp = Math.max(1, this.playerHp);
    SaveService.save(this.save);
    this.registry.remove('pendingEncounter');
    this.scene.start('WorldScene');
  }

  private async finishVictory(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.playerChampion.currentHp = Math.max(1, this.playerHp);
    this.wildChampion.currentHp = 0;
    SaveService.save(this.save);
    this.registry.remove('pendingEncounter');
    this.disableActions();
    this.setMessage(`${DataRegistry.champion(this.wildChampion.championId).name} ha caído. ¡Victoria!`);
    await this.wait(1050);
    this.scene.start('WorldScene');
  }

  private async finishDefeat(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.playerHp = 0;
    this.refreshUi();
    this.disableActions();
    this.setMessage('Garen ha caído. Recuperación completa provisional.');
    this.playerChampion.currentHp = this.playerStats.hp;
    SaveService.save(this.save);
    this.registry.remove('pendingEncounter');
    await this.wait(1250);
    this.scene.start('WorldScene');
  }

  private disableActions(): void {
    for (const object of this.actionObjects) {
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
