import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine, type CombatAction } from '../systems/BattleEngine';
import { SaveService } from '../systems/SaveService';

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

    const passive = BattleEngine.passive(this.playerChampion);
    const firstSkill = BattleEngine.unlockedSkills(this.playerChampion)[0];
    this.setMessage(
      `${DataRegistry.champion(this.wildChampion.championId).name} salvaje · ` +
      `${this.wildStats.speed > this.playerStats.speed ? 'es más rápido que Garen' : 'Garen es más rápido'}\n` +
      `${passive ? `Pasiva: ${passive.name}` : 'Sin pasiva'}${firstSkill ? ` · Habilidad: ${firstSkill.name}` : ''}`
    );
  }

  private drawBattlefield(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#101c26');
    this.add.rectangle(width / 2, 68, width, 136, 0x9bd37b, 1);
    this.add.rectangle(width / 2, 166, width, 60, 0x79aa61, 1);
    this.add.rectangle(width / 2, height - 46, width, 92, 0x172437, 1);
    this.add.ellipse(118, 185, 130, 26, 0x000000, 0.16);
    this.add.ellipse(width - 104, 128, 104, 22, 0x000000, 0.16);
  }

  private createCombatants(): void {
    const width = this.scale.width;

    this.playerSprite = this.add
      .image(118, 184, 'garen-battle-back')
      .setOrigin(0.5, 1)
      .setDisplaySize(124, 126);

    this.wildSprite = this.add
      .image(width - 104, 130, 'teemo-battle-front')
      .setOrigin(0.5, 1)
      .setDisplaySize(88, 106);
  }

  private createPanels(): void {
    const width = this.scale.width;

    this.wildHpUi = this.createHpPanel(
      16,
      16,
      `${DataRegistry.champion(this.wildChampion.championId).name} · Nv.${this.wildChampion.level}`,
      this.wildStats.hp
    );

    this.playerHpUi = this.createHpPanel(
      width - 184,
      136,
      `${DataRegistry.champion(this.playerChampion.championId).name} · Nv.${this.playerChampion.level}`,
      this.playerStats.hp
    );

    this.messageText = this.add.text(14, 198, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#ffffff',
      wordWrap: { width: 484 },
      lineSpacing: 2
    });
  }

  private createHpPanel(x: number, y: number, title: string, maxHp: number): HpUi {
    const width = 168;
    this.add.rectangle(x, y, width, 52, 0x0f1721, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0xb8d1ff);
    this.add.text(x + 8, y + 6, title, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#ffffff'
    });
    this.add.rectangle(x + 8, y + 25, 142, 8, 0x263446, 1).setOrigin(0, 0.5);
    const fill = this.add.rectangle(x + 8, y + 25, 142, 8, 0x76d66f, 1).setOrigin(0, 0.5);
    const text = this.add.text(x + 8, y + 36, '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#dbe7f5'
    });

    return { fill, text, maxWidth: 142, maxHp };
  }

  private createActions(): void {
    const y = 264;
    const firstSkill = BattleEngine.unlockedSkills(this.playerChampion)[0];

    this.createActionButton(64, y, 112, 30, 'ATACAR', () => {
      void this.handleCombatAction({ type: 'basic' });
    });

    this.createActionButton(190, y, 112, 30, firstSkill ? `Q · ${firstSkill.name}` : 'Q · BLOQ.', () => {
      if (!firstSkill) return;
      void this.handleCombatAction({ type: 'skill', skillId: firstSkill.id });
    }, !firstSkill);

    const link = this.createActionButton(316, y, 112, 30, 'VÍNCULO', () => {
      void this.handleLink();
    });
    this.linkButtonText = link.label;

    this.createActionButton(442, y, 112, 30, 'HUIR', () => {
      this.flee();
    });

    const definition = DataRegistry.champion(this.playerChampion.championId);
    const locked = definition.skillIds
      .slice(1)
      .map((id) => DataRegistry.skill(id))
      .map((skill) => `${skill.slot.toUpperCase()} M${skill.unlockMastery}`)
      .join(' · ');

    const lockedText = this.add.text(184, 224, locked, {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#91a1b8'
    });
    this.actionObjects.push(lockedText);
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    labelText: string,
    onClick: () => void,
    disabled = false
  ): { button: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text } {
    const button = this.add
      .rectangle(x, y, width, height, disabled ? 0x26303c : 0x2f466a, 1)
      .setStrokeStyle(2, disabled ? 0x566274 : 0xa8c8ff);

    const label = this.add.text(x, y, labelText, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: disabled ? '#788697' : '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFillStyle(0x3b5c8f, 1));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFillStyle(0x2f466a, 1));
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        button.setFillStyle(0x2f466a, 1);
        onClick();
      });
    }

    this.actionObjects.push(button, label);
    return { button, label };
  }

  private async handleCombatAction(playerAction: CombatAction): Promise<void> {
    if (this.busy || this.battleEnded) return;
    this.busy = true;

    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion);
    const playerFirst = BattleEngine.playerActsFirst(
      this.playerChampion,
      this.wildChampion,
      playerAction,
      enemyAction
    );

    const order: Array<'player' | 'enemy'> = playerFirst
      ? ['player', 'enemy']
      : ['enemy', 'player'];

    for (const actor of order) {
      if (this.battleEnded || this.playerHp <= 0 || this.wildHp <= 0) break;
      if (actor === 'player') {
        await this.performAction('player', playerAction);
      } else {
        await this.performAction('enemy', enemyAction);
      }
      await this.wait(380);
    }

    if (!this.battleEnded && this.playerHp > 0 && this.wildHp > 0) {
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

    if (actor === 'player') {
      this.wildHp = Math.max(0, this.wildHp - resolution.damage);
    } else {
      this.playerHp = Math.max(0, this.playerHp - resolution.damage);
    }

    this.setMessage(`${attackerName} usa ${resolution.label}. ${resolution.damage} de daño.`);
    this.hitFeedback(targetSprite);
    this.refreshUi();

    if (this.wildHp <= 0) {
      await this.finishVictory();
      return;
    }
    if (this.playerHp <= 0) {
      await this.finishDefeat();
      return;
    }

    const passiveHeal = BattleEngine.passiveHealing(attacker);
    if (passiveHeal > 0) {
      if (actor === 'player') {
        const healed = Math.min(passiveHeal, this.playerStats.hp - this.playerHp);
        this.playerHp += healed;
        if (healed > 0) {
          this.setMessage(`${attackerName} usa ${resolution.label}. ${resolution.damage} de daño. · Pasiva +${healed} VID.`);
        }
      } else {
        const healed = Math.min(passiveHeal, this.wildStats.hp - this.wildHp);
        this.wildHp += healed;
      }
      this.refreshUi();
    }
  }

  private async handleLink(): Promise<void> {
    if (this.busy || this.battleEnded) return;
    this.busy = true;

    const chance = BattleEngine.linkChance(this.wildHp, this.wildStats.hp);
    this.setMessage(`Intentando Vínculo… ${Math.round(chance * 100)}% de estabilidad.`);
    this.wildSprite.setTint(0xc7a4ff);
    await this.wait(520);
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
      this.setMessage(
        `¡Vínculo completado! ${DataRegistry.champion(this.wildChampion.championId).name} ` +
        `${goesToParty ? 'se une al equipo.' : 'queda guardado en la reserva.'}`
      );
      this.disableActions();
      await this.wait(1050);
      this.scene.start('WorldScene');
      return;
    }

    this.setMessage('El Vínculo no se estabiliza. El Eco contraataca.');
    await this.wait(350);
    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion);
    await this.performAction('enemy', enemyAction);

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
    await this.wait(950);
    this.scene.start('WorldScene');
  }

  private async finishDefeat(): Promise<void> {
    if (this.battleEnded) return;
    this.battleEnded = true;
    this.playerHp = 0;
    this.refreshUi();
    this.disableActions();
    this.setMessage('Garen ha caído. Recuperación completa provisional para continuar la vertical slice.');
    this.playerChampion.currentHp = this.playerStats.hp;
    SaveService.save(this.save);
    this.registry.remove('pendingEncounter');
    await this.wait(1150);
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
    ui.fill.setFillStyle(ratio > 0.5 ? 0x76d66f : ratio > 0.2 ? 0xf2c94c : 0xeb5757, 1);
    ui.text.setText(`VID ${Math.max(0, hp)} / ${ui.maxHp}`);
  }

  private setMessage(message: string): void {
    this.messageText.setText(message);
  }

  private hitFeedback(sprite: Phaser.GameObjects.Image): void {
    sprite.setTint(0xffffff);
    this.tweens.add({
      targets: sprite,
      alpha: 0.45,
      duration: 70,
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
