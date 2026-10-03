import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionDefinition, ChampionInstance } from '../data/types';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { normalizeShowdownConfig, showdownFormatLabel, type ShowdownConfig } from '../systems/showdown/ShowdownSession';
import { TypeBadge } from '../ui/components/TypeBadge';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

type ShowdownSide = 'player' | 'enemy';

interface StoredBuilderTeams {
  player: string[];
  enemy: string[];
  teamSize: number;
  activeSlots: number;
}

const ROSTER_PAGE_SIZE = 4;

export class BattleSandboxScene extends Phaser.Scene {
  private roster: ChampionDefinition[] = [];
  private playerTeamIds: string[] = [];
  private enemyTeamIds: string[] = [];
  private editingSide: ShowdownSide = 'player';
  private rosterPage = 0;
  private config!: ShowdownConfig;
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('BattleSandboxScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.config = normalizeShowdownConfig(this.registry.get('showdown.config') as Partial<ShowdownConfig> | undefined);
    this.registry.set('showdown.config', this.config);

    this.roster = DataRegistry.echoes()
      .filter((entry) => entry.contentStatus !== 'planeado')
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const stored = this.registry.get('showdown.builderTeams') as StoredBuilderTeams | undefined;
    if (stored && stored.teamSize === this.config.teamSize && stored.activeSlots === this.config.activeSlots) {
      this.playerTeamIds = stored.player.filter((id) => this.roster.some((entry) => entry.id === id)).slice(0, this.config.teamSize);
      this.enemyTeamIds = stored.enemy.filter((id) => this.roster.some((entry) => entry.id === id)).slice(0, this.config.teamSize);
    }

    Ui960Kit.backdrop(this, 'bandle-bg', 0x345767, 0.2, 0.84);
    Ui960Kit.header(this, 'SHOWDOWN · TEAM BUILDER', 'Construye ambos equipos sin tocar tu partida de Aventura', showdownFormatLabel(this.config));

    const back = Ui960Kit.button(this, 98, 508, 144, 36, 'REGLAS', () => this.scene.start('ShowdownSetupScene'), {
      fontSize: UI960_FONT.tiny
    });
    back.button.setDepth(100);
    back.label.setDepth(101);

    this.render();
  }

  private render(): void {
    for (const object of this.dynamicObjects) object.destroy();
    this.dynamicObjects = [];
    this.renderTeamPanel(16, 100, 'TU EQUIPO', 'player');
    this.renderRoster();
    this.renderTeamPanel(730, 100, 'RIVAL', 'enemy');
    this.renderFooter();
  }

  private renderTeamPanel(x: number, y: number, title: string, side: ShowdownSide): void {
    const selected = this.editingSide === side;
    const panel = this.add.rectangle(x, y, 214, 356, 0x081a27, 0.98)
      .setOrigin(0)
      .setStrokeStyle(3, selected ? UI.colors.gold : UI.colors.borderSoft)
      .setInteractive({ useHandCursor: true });
    panel.on(Phaser.Input.Events.POINTER_UP, () => {
      this.editingSide = side;
      this.render();
    });
    this.dynamicObjects.push(panel);

    const header = Ui960Kit.label(this, x + 107, y + 14, title, '17px', selected ? UI.text.gold : UI.text.primary, true).setOrigin(0.5, 0);
    const hint = Ui960Kit.label(this, x + 107, y + 37, selected ? 'AÑADIENDO AQUÍ' : 'TOCA PARA EDITAR', '9px', selected ? UI.text.accent : UI.text.muted, true).setOrigin(0.5, 0);
    this.dynamicObjects.push(header, hint);

    const ids = side === 'player' ? this.playerTeamIds : this.enemyTeamIds;
    for (let index = 0; index < this.config.teamSize; index += 1) {
      this.renderTeamSlot(x + 10, y + 60 + index * 51, side, index, ids[index]);
    }

    const random = Ui960Kit.button(this, x + 59, y + 333, 94, 28, 'ALEATORIO', () => {
      this.fillRandomTeam(side);
      this.persistBuilderTeams();
      this.render();
    }, { fontSize: '9px' });
    const clear = Ui960Kit.button(this, x + 158, y + 333, 86, 28, 'VACIAR', () => {
      if (side === 'player') this.playerTeamIds = [];
      else this.enemyTeamIds = [];
      this.persistBuilderTeams();
      this.render();
    }, { fontSize: '9px' });
    this.dynamicObjects.push(random.button, random.label, clear.button, clear.label);
  }

  private renderTeamSlot(x: number, y: number, side: ShowdownSide, index: number, championId?: string): void {
    const filled = Boolean(championId);
    const width = 194;
    const height = 45;
    const bg = this.add.rectangle(x, y, width, height, filled ? 0x123247 : 0x0c1720, 0.98)
      .setOrigin(0)
      .setStrokeStyle(1, filled ? 0x4e9fb8 : 0x2b3e49);
    this.dynamicObjects.push(bg);

    const slotLabel = index < this.config.activeSlots ? 'ACTIVO ' + (index + 1) : 'RESERVA ' + (index - this.config.activeSlots + 1);

    if (!championId) {
      const text = Ui960Kit.label(this, x + width / 2, y + 14, slotLabel, '9px', UI.text.muted, true).setOrigin(0.5, 0);
      this.dynamicObjects.push(text);
      return;
    }

    const champion = DataRegistry.echo(championId);
    this.renderPortrait(x + 4, y + 4, 37, champion, side);
    const name = Ui960Kit.label(this, x + 48, y + 6, champion.name.toUpperCase(), champion.name.length > 13 ? '9px' : '11px', UI.text.primary, true);
    const role = Ui960Kit.label(this, x + 48, y + 25, slotLabel + ' · M' + this.config.mastery, '8px', UI.text.accent, true);
    this.dynamicObjects.push(name, role);

    const remove = this.add.rectangle(x + 181, y + 7, 18, 18, 0x321c22, 1)
      .setStrokeStyle(1, 0xa85f69)
      .setInteractive({ useHandCursor: true });
    const cross = Ui960Kit.label(this, x + 181, y + 5, '×', '13px', '#ffb5ba', true).setOrigin(0.5, 0);
    remove.on(Phaser.Input.Events.POINTER_UP, () => {
      const target = side === 'player' ? this.playerTeamIds : this.enemyTeamIds;
      target.splice(index, 1);
      this.persistBuilderTeams();
      this.render();
    });
    this.dynamicObjects.push(remove, cross);
  }

  private renderRoster(): void {
    const x = 244;
    const y = 100;
    const width = 472;
    const panel = this.add.rectangle(x, y, width, 356, 0x081a27, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.borderSoft);
    this.dynamicObjects.push(panel);

    const activeLabel = this.editingSide === 'player' ? 'TU EQUIPO' : 'RIVAL';
    const title = Ui960Kit.label(this, x + 18, y + 13, 'ROSTER · ' + this.roster.length + ' ECOS', '15px', UI.text.primary, true);
    const target = Ui960Kit.label(this, x + width - 18, y + 16, '→ ' + activeLabel, '10px', UI.text.gold, true).setOrigin(1, 0);
    this.dynamicObjects.push(title, target);

    const pageCount = Math.max(1, Math.ceil(this.roster.length / ROSTER_PAGE_SIZE));
    this.rosterPage = Phaser.Math.Clamp(this.rosterPage, 0, pageCount - 1);
    const visible = this.roster.slice(this.rosterPage * ROSTER_PAGE_SIZE, (this.rosterPage + 1) * ROSTER_PAGE_SIZE);

    visible.forEach((champion, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      this.renderRosterCard(x + 12 + col * 228, y + 48 + row * 126, champion);
    });

    const pageText = Ui960Kit.label(this, x + width / 2, y + 317, (this.rosterPage + 1) + '/' + pageCount, '10px', UI.text.secondary, true)
      .setOrigin(0.5, 0);
    this.dynamicObjects.push(pageText);

    if (this.rosterPage > 0) {
      const prev = Ui960Kit.button(this, x + 86, y + 337, 130, 28, '◀ ANTERIOR', () => {
        this.rosterPage -= 1;
        this.render();
      }, { fontSize: '9px' });
      this.dynamicObjects.push(prev.button, prev.label);
    }
    if (this.rosterPage < pageCount - 1) {
      const next = Ui960Kit.button(this, x + width - 86, y + 337, 130, 28, 'SIGUIENTE ▶', () => {
        this.rosterPage += 1;
        this.render();
      }, { fontSize: '9px' });
      this.dynamicObjects.push(next.button, next.label);
    }
  }

  private renderRosterCard(x: number, y: number, champion: ChampionDefinition): void {
    const targetIds = this.editingSide === 'player' ? this.playerTeamIds : this.enemyTeamIds;
    const selected = targetIds.includes(champion.id);
    const full = targetIds.length >= this.config.teamSize;
    const disabled = full && !selected;
    const card = this.add.rectangle(x, y, 220, 116, selected ? 0x274c58 : disabled ? 0x0c1720 : 0x113044, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, selected ? UI.colors.gold : disabled ? 0x263945 : 0x447d91);
    this.dynamicObjects.push(card);

    this.renderPortrait(x + 9, y + 12, 92, champion, this.editingSide);
    const name = Ui960Kit.label(this, x + 112, y + 16, champion.name.toUpperCase(), champion.name.length > 12 ? '10px' : '13px', disabled ? UI.text.muted : UI.text.primary, true)
      .setWordWrapWidth(96, true);
    const mastery = Ui960Kit.label(this, x + 112, y + 48, 'M' + this.config.mastery, '10px', UI.text.accent, true);
    this.dynamicObjects.push(name, mastery);
    this.renderAffinityDots(x + 113, y + 75, champion);

    if (!disabled) {
      card.setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.POINTER_OVER, () => card.setStrokeStyle(3, UI.colors.gold));
      card.on(Phaser.Input.Events.POINTER_OUT, () => card.setStrokeStyle(2, selected ? UI.colors.gold : 0x447d91));
      card.on(Phaser.Input.Events.POINTER_UP, () => {
        if (selected) {
          const index = targetIds.indexOf(champion.id);
          if (index >= 0) targetIds.splice(index, 1);
        } else if (targetIds.length < this.config.teamSize) {
          targetIds.push(champion.id);
        }
        this.persistBuilderTeams();
        this.render();
      });
    }
  }

  private renderFooter(): void {
    const ready = this.playerTeamIds.length === this.config.teamSize && this.enemyTeamIds.length === this.config.teamSize;
    const summary = `${this.config.activeSlots}v${this.config.activeSlots} · ${this.config.teamSize} por equipo · M${this.config.mastery}`;
    const note = Ui960Kit.label(this, 260, 486, summary, UI960_FONT.tiny, UI.text.secondary, true);
    this.dynamicObjects.push(note);

    const start = Ui960Kit.button(this, 760, 506, 252, 40, ready ? 'INICIAR COMBATE' : `FALTAN ${this.missingSlots()} ECOS`, () => {
      if (ready) this.startBattle();
    }, { selected: ready, disabled: !ready, fontSize: UI960_FONT.tiny });
    this.dynamicObjects.push(start.button, start.label);
  }

  private renderPortrait(x: number, y: number, size: number, champion: ChampionDefinition, side: ShowdownSide): void {
    const color = side === 'player' ? 0x153e52 : 0x4a2c31;
    const border = side === 'player' ? 0x70d8ff : 0xe59a8a;
    const box = this.add.rectangle(x, y, size, size, color, 1).setOrigin(0).setStrokeStyle(2, border);
    const portraitKey = champion.id + '-portrait';
    this.dynamicObjects.push(box);

    if (this.textures.exists(portraitKey)) {
      const portrait = this.add.image(x + size / 2, y + size / 2, portraitKey)
        .setDisplaySize(size - 4, size - 4);
      this.dynamicObjects.push(portrait);
      return;
    }

    const text = Ui960Kit.label(this, x + size / 2, y + Math.round(size * 0.35), this.initials(champion.name), size >= 80 ? '20px' : '12px', '#ffffff', true)
      .setOrigin(0.5, 0);
    this.dynamicObjects.push(text);
  }

  private renderAffinityDots(x: number, y: number, champion: ChampionDefinition): void {
    (champion.affinityIds ?? []).slice(0, 2).forEach((id, index) => {
      const badge = TypeBadge.add(this, x + index * 27, y, id, {
        width: 22,
        height: 22,
        iconSize: 13,
        showLabel: false
      });
      this.dynamicObjects.push(badge);
    });
  }

  private fillRandomTeam(side: ShowdownSide): void {
    const pool = [...this.roster];
    Phaser.Utils.Array.Shuffle(pool);
    const ids = pool.slice(0, this.config.teamSize).map((entry) => entry.id);
    if (side === 'player') this.playerTeamIds = ids;
    else this.enemyTeamIds = ids;
  }

  private missingSlots(): number {
    return Math.max(0, this.config.teamSize - this.playerTeamIds.length)
      + Math.max(0, this.config.teamSize - this.enemyTeamIds.length);
  }

  private persistBuilderTeams(): void {
    const stored: StoredBuilderTeams = {
      player: [...this.playerTeamIds],
      enemy: [...this.enemyTeamIds],
      teamSize: this.config.teamSize,
      activeSlots: this.config.activeSlots
    };
    this.registry.set('showdown.builderTeams', stored);
  }

  private startBattle(): void {
    if (this.playerTeamIds.length !== this.config.teamSize || this.enemyTeamIds.length !== this.config.teamSize) return;
    this.persistBuilderTeams();

    const playerTeam = this.playerTeamIds.map((id) => this.createShowdownChampion(id));
    const enemyTeam = this.enemyTeamIds.map((id) => this.createShowdownChampion(id));

    this.registry.set('battle.teamSession', {
      id: 'showdown-free-battle',
      format: 'team',
      kind: 'showdown',
      activeSlots: this.config.activeSlots,
      playerTeam,
      enemyTeam,
      trainerName: 'Showdown',
      rewardGold: 0,
      allowFlee: false,
      allowLink: false,
      persistPlayerState: false,
      returnScene: 'BattleSandboxScene'
    });
    this.scene.start('DoubleBattleScene');
  }

  private createShowdownChampion(championId: string): ChampionInstance {
    const mastery = Math.max(1, Math.round(this.config.mastery));
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
