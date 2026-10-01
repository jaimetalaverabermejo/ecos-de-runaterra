import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionDefinition, ChampionInstance } from '../data/types';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { TypeBadge } from '../ui/components/TypeBadge';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

type SandboxSide = 'player' | 'enemy';

const TEAM_SIZE = 3;
const ROSTER_PAGE_SIZE = 12;
const DEFAULT_MASTERY = 8;

export class BattleSandboxScene extends Phaser.Scene {
  private roster: ChampionDefinition[] = [];
  private playerTeamIds: string[] = [];
  private enemyTeamIds: string[] = [];
  private editingSide: SandboxSide = 'player';
  private rosterPage = 0;
  private mastery = DEFAULT_MASTERY;
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('BattleSandboxScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.cameras.main.setBackgroundColor('#06131d');
    this.roster = DataRegistry.echoes()
      .filter((entry) => entry.contentStatus !== 'planeado')
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    this.add.rectangle(0, 0, 960, 540, 0x06131d, 1).setOrigin(0);
    this.add.rectangle(0, 0, 960, 64, 0x0a2131, 0.98).setOrigin(0);
    UiKit.label(this, 28, 17, 'LABORATORIO DE COMBATE', '24px', UI.text.primary, true);
    UiKit.label(this, 28, 44, '2v2 · BALANCE · PRUEBAS DE KITS', '10px', UI.text.accent, true);
    UiKit.label(this, 932, 19, 'SANDBOX V2', '11px', UI.text.gold, true).setOrigin(1, 0);
    UiKit.label(this, 932, 40, 'No modifica la partida', '9px', UI.text.secondary, true).setOrigin(1, 0);

    const exit = UiKit.button(this, 60, 510, 96, 28, 'SALIR', () => this.scene.start('WorldScene'), {
      accent: 'neutral',
      fontSize: '10px'
    });
    exit.button.setDepth(100);
    exit.label.setDepth(101);

    this.render();
  }

  private render(): void {
    for (const object of this.dynamicObjects) object.destroy();
    this.dynamicObjects = [];
    this.renderTeamPanel(18, 82, 'TU EQUIPO', 'player');
    this.renderTeamPanel(722, 82, 'RIVAL', 'enemy');
    this.renderRoster();
    this.renderFooter();
  }

  private renderTeamPanel(x: number, y: number, title: string, side: SandboxSide): void {
    const selected = this.editingSide === side;
    const panel = this.add.rectangle(x, y, 220, 382, 0x0a1c2a, 0.97)
      .setOrigin(0)
      .setStrokeStyle(3, selected ? UI.colors.gold : UI.colors.borderSoft)
      .setInteractive({ useHandCursor: true });
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      this.editingSide = side;
      this.render();
    });
    this.dynamicObjects.push(panel);

    const header = UiKit.label(this, x + 110, y + 14, title, '16px', selected ? UI.text.gold : UI.text.primary, true)
      .setOrigin(0.5, 0);
    const hint = UiKit.label(this, x + 110, y + 37, selected ? 'AÑADIENDO AQUÍ' : 'CLICK PARA EDITAR', '9px', selected ? UI.text.accent : UI.text.muted, true)
      .setOrigin(0.5, 0);
    this.dynamicObjects.push(header, hint);

    const ids = side === 'player' ? this.playerTeamIds : this.enemyTeamIds;
    for (let index = 0; index < TEAM_SIZE; index += 1) {
      this.renderTeamSlot(x + 12, y + 68 + index * 82, side, index, ids[index]);
    }

    const random = UiKit.button(this, x + 60, y + 340, 88, 26, 'ALEATORIO', () => {
      this.fillRandomTeam(side);
      this.render();
    }, { accent: 'neutral', fontSize: '9px' });
    const clear = UiKit.button(this, x + 160, y + 340, 82, 26, 'VACIAR', () => {
      if (side === 'player') this.playerTeamIds = [];
      else this.enemyTeamIds = [];
      this.render();
    }, { accent: 'neutral', fontSize: '9px' });
    this.dynamicObjects.push(random.button, random.label, clear.button, clear.label);
  }

  private renderTeamSlot(x: number, y: number, side: SandboxSide, index: number, championId?: string): void {
    const filled = Boolean(championId);
    const bg = this.add.rectangle(x, y, 196, 68, filled ? 0x123247 : 0x0c1720, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, filled ? 0x4e9fb8 : 0x2b3e49);
    this.dynamicObjects.push(bg);

    if (!championId) {
      const slotName = index < 2 ? 'ACTIVO ' + (index + 1) : 'RESERVA';
      const text = UiKit.label(this, x + 98, y + 24, slotName, '11px', UI.text.muted, true).setOrigin(0.5, 0);
      this.dynamicObjects.push(text);
      return;
    }

    const champion = DataRegistry.echo(championId);
    this.renderMonogram(x + 10, y + 10, 48, champion, side);
    const name = UiKit.label(this, x + 68, y + 10, champion.name.toUpperCase(), champion.name.length > 14 ? '10px' : '12px', UI.text.primary, true)
      .setWordWrapWidth(112);
    const roleText = (index < 2 ? 'ACTIVO' : 'RESERVA') + ' · M' + this.mastery;
    const role = UiKit.label(this, x + 68, y + 31, roleText, '9px', UI.text.accent, true);
    this.dynamicObjects.push(name, role);
    this.renderAffinityDots(x + 69, y + 49, champion);

    const remove = this.add.rectangle(x + 181, y + 10, 20, 20, 0x321c22, 1)
      .setStrokeStyle(1, 0xa85f69)
      .setInteractive({ useHandCursor: true });
    const cross = UiKit.label(this, x + 181, y + 8, '×', '15px', '#ffb5ba', true).setOrigin(0.5, 0);
    remove.on(Phaser.Input.Events.POINTER_UP, () => {
      const target = side === 'player' ? this.playerTeamIds : this.enemyTeamIds;
      target.splice(index, 1);
      this.render();
    });
    this.dynamicObjects.push(remove, cross);
  }

  private renderRoster(): void {
    const x = 252;
    const y = 82;
    const width = 456;
    const panel = this.add.rectangle(x, y, width, 382, 0x081a27, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.borderSoft);
    this.dynamicObjects.push(panel);

    const activeLabel = this.editingSide === 'player' ? 'TU EQUIPO' : 'RIVAL';
    const title = UiKit.label(this, x + 20, y + 14, 'ROSTER · ' + this.roster.length + ' ECOS', '15px', UI.text.primary, true);
    const target = UiKit.label(this, x + width - 20, y + 16, '→ ' + activeLabel, '10px', UI.text.gold, true).setOrigin(1, 0);
    this.dynamicObjects.push(title, target);

    const pageCount = Math.max(1, Math.ceil(this.roster.length / ROSTER_PAGE_SIZE));
    this.rosterPage = Phaser.Math.Clamp(this.rosterPage, 0, pageCount - 1);
    const visible = this.roster.slice(this.rosterPage * ROSTER_PAGE_SIZE, (this.rosterPage + 1) * ROSTER_PAGE_SIZE);

    visible.forEach((champion, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      this.renderRosterCard(x + 14 + col * 145, y + 52 + row * 70, champion);
    });

    const pageText = UiKit.label(this, x + width / 2, y + 342, (this.rosterPage + 1) + '/' + pageCount, '10px', UI.text.secondary, true)
      .setOrigin(0.5, 0);
    this.dynamicObjects.push(pageText);

    if (this.rosterPage > 0) {
      const prev = UiKit.button(this, x + 78, y + 354, 110, 24, '◀ ANTERIOR', () => {
        this.rosterPage -= 1;
        this.render();
      }, { accent: 'neutral', fontSize: '9px' });
      this.dynamicObjects.push(prev.button, prev.label);
    }
    if (this.rosterPage < pageCount - 1) {
      const next = UiKit.button(this, x + width - 78, y + 354, 110, 24, 'SIGUIENTE ▶', () => {
        this.rosterPage += 1;
        this.render();
      }, { accent: 'neutral', fontSize: '9px' });
      this.dynamicObjects.push(next.button, next.label);
    }
  }

  private renderRosterCard(x: number, y: number, champion: ChampionDefinition): void {
    const targetIds = this.editingSide === 'player' ? this.playerTeamIds : this.enemyTeamIds;
    const selected = targetIds.includes(champion.id);
    const full = targetIds.length >= TEAM_SIZE;
    const disabled = full && !selected;
    const card = this.add.rectangle(x, y, 136, 60, selected ? 0x274c58 : disabled ? 0x0c1720 : 0x113044, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, selected ? UI.colors.gold : disabled ? 0x263945 : 0x447d91);
    this.dynamicObjects.push(card);

    this.renderMonogram(x + 8, y + 10, 40, champion, this.editingSide);
    const name = UiKit.label(this, x + 55, y + 9, champion.name.toUpperCase(), champion.name.length > 12 ? '8px' : '10px', disabled ? UI.text.muted : UI.text.primary, true)
      .setWordWrapWidth(75);
    this.dynamicObjects.push(name);
    this.renderAffinityDots(x + 55, y + 39, champion);

    if (!disabled) {
      card.setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.POINTER_OVER, () => card.setStrokeStyle(2, UI.colors.gold));
      card.on(Phaser.Input.Events.POINTER_OUT, () => card.setStrokeStyle(2, selected ? UI.colors.gold : 0x447d91));
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        if (selected) {
          const index = targetIds.indexOf(champion.id);
          if (index >= 0) targetIds.splice(index, 1);
        } else if (targetIds.length < TEAM_SIZE) {
          targetIds.push(champion.id);
        }
        this.render();
      });
    }
  }

  private renderFooter(): void {
    const ready = this.playerTeamIds.length >= 2 && this.enemyTeamIds.length >= 2;
    const masteryLabel = UiKit.label(this, 430, 476, 'MAESTRÍA DE PRUEBA', '9px', UI.text.secondary, true).setOrigin(0.5, 0);
    this.dynamicObjects.push(masteryLabel);

    for (const pair of [[5, 380], [8, 430], [12, 480]] as Array<[number, number]>) {
      const value = pair[0];
      const x = pair[1];
      const selected = this.mastery === value;
      const button = this.add.rectangle(x, 508, 42, 26, selected ? 0x345f6e : 0x112b3b, 1)
        .setStrokeStyle(2, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      const label = UiKit.label(this, x, 502, 'M' + value, '10px', selected ? UI.text.gold : UI.text.primary, true).setOrigin(0.5, 0);
      button.on(Phaser.Input.Events.POINTER_UP, () => {
        this.mastery = value;
        this.render();
      });
      this.dynamicObjects.push(button, label);
    }

    const start = UiKit.button(this, 620, 506, 190, 34, ready ? 'INICIAR COMBATE' : '2 ECOS POR LADO', () => {
      if (ready) this.startBattle();
    }, { accent: ready ? 'green' : 'neutral', fontSize: '11px' });
    if (!ready) start.button.disableInteractive();
    this.dynamicObjects.push(start.button, start.label);

    const note = UiKit.label(this, 620, 475, '2 activos + 1 reserva opcional', '9px', UI.text.secondary, true).setOrigin(0.5, 0);
    this.dynamicObjects.push(note);
  }

  private renderMonogram(x: number, y: number, size: number, champion: ChampionDefinition, side: SandboxSide): void {
    const color = side === 'player' ? 0x153e52 : 0x4a2c31;
    const border = side === 'player' ? 0x70d8ff : 0xe59a8a;
    const box = this.add.rectangle(x, y, size, size, color, 1).setOrigin(0).setStrokeStyle(2, border);
    const text = UiKit.label(this, x + size / 2, y + Math.round(size * 0.22), this.initials(champion.name), size >= 48 ? '16px' : '13px', '#ffffff', true)
      .setOrigin(0.5, 0);
    this.dynamicObjects.push(box, text);
  }

  private renderAffinityDots(x: number, y: number, champion: ChampionDefinition): void {
    (champion.affinityIds ?? []).slice(0, 2).forEach((id, index) => {
      const badge = TypeBadge.add(this, x + index * 25, y, id, {
        width: 20,
        height: 20,
        iconSize: 12,
        showLabel: false
      });
      this.dynamicObjects.push(badge);
    });
  }

  private fillRandomTeam(side: SandboxSide): void {
    const pool = [...this.roster];
    Phaser.Utils.Array.Shuffle(pool);
    const ids = pool.slice(0, TEAM_SIZE).map((entry) => entry.id);
    if (side === 'player') this.playerTeamIds = ids;
    else this.enemyTeamIds = ids;
  }

  private startBattle(): void {
    if (this.playerTeamIds.length < 2 || this.enemyTeamIds.length < 2) return;
    const playerTeam = this.playerTeamIds.map((id) => this.createSandboxChampion(id));
    const enemyTeam = this.enemyTeamIds.map((id) => this.createSandboxChampion(id));

    this.registry.set('battle.doubleSession', {
      id: 'sandbox-double-battle-v2',
      format: 'double',
      kind: 'sandbox',
      playerTeam,
      enemyTeam,
      trainerName: 'Laboratorio',
      rewardGold: 0,
      allowFlee: false,
      allowLink: false,
      persistPlayerState: false,
      returnScene: 'BattleSandboxScene'
    });
    this.scene.start('DoubleBattleScene');
  }

  private createSandboxChampion(championId: string): ChampionInstance {
    const mastery = Math.max(1, Math.round(this.mastery));
    const champion: ChampionInstance = {
      instanceId: crypto.randomUUID(),
      championId,
      mastery,
      masteryExperience: 0,
      skillRanks: ProgressionService.defaultSkillRanks(mastery),
      unspentSkillPoints: ProgressionService.earnedManualSkillPoints(mastery),
      currentHp: 1,
      runeTraits: [],
      equippedItems: []
    };
    champion.currentHp = BattleEngine.statsFor(champion).hp;
    return champion;
  }

  private initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
    return name.slice(0, 3).toUpperCase();
  }
}
