import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

interface ChampionDetailData {
  partyIndex?: number;
}

export class ChampionDetailScene extends Phaser.Scene {
  private save!: SaveGame;
  private partyIndex = 0;
  private overlayLayer?: Phaser.GameObjects.Container;

  constructor() {
    super('ChampionDetailScene');
  }

  init(data: ChampionDetailData): void {
    this.partyIndex = data.partyIndex ?? 0;
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    if (!this.save.party[this.partyIndex]) {
      this.scene.start('TeamScene');
      return;
    }

    Ui960Kit.backdrop(this, 'bandle-bg', 0x4b6670, 0.28, 0.72);
    this.drawHeader();
    this.drawChampion();
  }

  private drawHeader(): void {
    Ui960Kit.header(this, 'FICHA DE ECO', 'ECOS DE RUNATERRA');
    const startX = 508;
    this.save.party.slice(0, 5).forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const selected = index === this.partyIndex;
      const x = startX + index * 82;
      const tab = Ui960Kit.button(this, x, 54, 72, 48, '', () => this.scene.start('ChampionDetailScene', { partyIndex: index }), {
        selected,
        fontSize: UI960_FONT.tiny
      });
      Ui960Kit.label(this, x, 37, definition.name.slice(0, 3).toUpperCase(), UI960_FONT.tiny, selected ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0).setDepth(tab.button.depth + 1);
      Ui960Kit.label(this, x, 56, `M${champion.mastery}`, '11px', UI.text.muted, true).setOrigin(0.5, 0).setDepth(tab.button.depth + 1);
    });
  }

  private drawChampion(): void {
    const champion = this.save.party[this.partyIndex] as ChampionInstance;
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const xpNeeded = ProgressionService.experienceToNext(champion.mastery);

    Ui960Kit.panel(this, 38, 112, 300, 330, { selected: true, alt: true });
    Ui960Kit.panel(this, 58, 132, 260, 214, { alt: true });
    this.addChampionPortrait(champion.championId, 188, 336);
    Ui960Kit.label(this, 66, 360, definition.name.toUpperCase(), UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 306, 370, `M ${champion.mastery}`, UI960_FONT.small, UI.text.gold, true).setOrigin(1, 0);
    Ui960Kit.label(this, 68, 402, this.roleLabel(definition.tags[0]), UI960_FONT.small, UI.text.accent, true);
    Ui960Kit.label(this, 68, 424, `TIPOS · ${TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)}`, UI960_FONT.tiny, (definition.affinityIds ?? []).length ? UI.text.gold : UI.text.muted, true)
      .setWordWrapWidth(246, true);

    Ui960Kit.panel(this, 360, 112, 330, 150, { alpha: 0.96 });
    Ui960Kit.label(this, 382, 128, 'MAESTRÍA', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 525, 160, 278);
    this.infoRow(382, 180, 'VIDA', `${champion.currentHp} / ${stats.hp}`);
    Ui960Kit.progress(this, 500, 191, 166, 12, champion.currentHp / stats.hp, this.hpColor(champion.currentHp / stats.hp));
    this.infoRow(382, 210, 'RANGO', `${champion.mastery} / ${ProgressionService.maxMastery()}`);
    this.infoRow(382, 236, 'EXP', xpNeeded > 0 ? `${champion.masteryExperience} / ${xpNeeded}` : 'MAX');
    Ui960Kit.progress(this, 520, 247, 146, 10, ProgressionService.experienceRatio(champion), UI.colors.blue);

    Ui960Kit.panel(this, 708, 112, 214, 150, { alpha: 0.96 });
    Ui960Kit.label(this, 730, 128, 'ESTADÍSTICAS', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 815, 160, 166);
    this.statLine(730, 180, 'ATQ', stats.attack);
    this.statLine(824, 180, 'POD', stats.power);
    this.statLine(730, 208, 'DEF', stats.defense);
    this.statLine(824, 208, 'RES', stats.resistance);
    this.statLine(730, 236, 'VEL', stats.speed);
    this.statLine(824, 236, 'VID', stats.hp);

    Ui960Kit.panel(this, 360, 280, 562, 162, { alpha: 0.96 });
    Ui960Kit.label(this, 382, 296, 'BUILD', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.separator(this, 641, 328, 514);
    const slots = [454, 641, 828];
    for (let i = 0; i < 3; i += 1) {
      const itemId = champion.equippedItems[i];
      const x = slots[i];
      Ui960Kit.slot(this, x, 374, 82, Boolean(itemId));
      if (itemId) {
        const item = DataRegistry.item(itemId);
        const texture = `item-${item.id}`;
        if (this.textures.exists(texture)) this.add.image(x, 366, texture).setDisplaySize(52, 52);
        Ui960Kit.label(this, x, 407, item.name, UI960_FONT.tiny, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(130, true).setAlign('center');
      } else {
        Ui960Kit.label(this, x, 351, `HUECO ${i + 1}`, UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5, 0);
        Ui960Kit.label(this, x, 382, 'VACÍO', UI960_FONT.tiny, UI.text.muted).setOrigin(0.5, 0);
      }
    }

    const traits = champion.runeTraits.length > 0 ? champion.runeTraits.map((trait) => trait.id).join(' · ') : 'Sin Rasgos Rúnicos';
    Ui960Kit.label(this, 44, 462, `Rasgos: ${traits}`, UI960_FONT.tiny, champion.runeTraits.length ? UI.text.purple : UI.text.muted).setWordWrapWidth(420, true);
    Ui960Kit.label(this, 44, 488, `Puntos de habilidad: ${champion.unspentSkillPoints}`, UI960_FONT.tiny, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.secondary, true);

    Ui960Kit.button(this, 542, 492, 140, 42, 'AFINIDAD', () => this.openAffinityInfo(champion), { selected: true, fontSize: UI960_FONT.small });
    Ui960Kit.button(this, 686, 492, 140, 42, 'HABILIDADES', () => this.scene.start('MasteryScene', { partyIndex: this.partyIndex }), {
      selected: champion.unspentSkillPoints > 0,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 814, 492, 104, 42, 'BUILD', () => this.scene.start('BuildScene', { partyIndex: this.partyIndex }), { selected: true, fontSize: UI960_FONT.small });
    Ui960Kit.button(this, 902, 492, 76, 42, 'ATRÁS', () => this.scene.start('TeamScene'), { fontSize: UI960_FONT.tiny });
  }

  private openAffinityInfo(champion: ChampionInstance): void {
    this.overlayLayer?.destroy(true);
    const definition = DataRegistry.champion(champion.championId);
    const types = definition.affinityIds ?? [];
    const strong = TypeEffectivenessService.offensiveStrengths(types);
    const weak = TypeEffectivenessService.defensiveWeaknesses(types);
    const resist = TypeEffectivenessService.defensiveResistances(types);
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 960, 540, 0x020912, 0.84));
    objects.push(this.add.rectangle(480, 270, 700, 340, UI.colors.panel, 0.995).setStrokeStyle(4, UI.colors.gold));
    objects.push(Ui960Kit.label(this, 166, 124, `AFINIDAD · ${definition.name.toUpperCase()}`, UI960_FONT.title, UI.text.primary, true));
    objects.push(Ui960Kit.label(this, 166, 190, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI960_FONT.small, types.length ? UI.text.gold : UI.text.muted, true));
    objects.push(Ui960Kit.label(this, 166, 232, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI960_FONT.small, UI.text.accent, true).setWordWrapWidth(620, true));
    objects.push(Ui960Kit.label(this, 166, 274, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(620, true));
    objects.push(Ui960Kit.label(this, 166, 316, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(620, true));
    objects.push(Ui960Kit.label(this, 166, 354, `${TypeEffectivenessService.stabLabel()} con movimientos ofensivos de tus tipos`, UI960_FONT.tiny, UI.text.gold, true).setWordWrapWidth(620, true));
    const close = Ui960Kit.button(this, 480, 402, 150, 42, 'CERRAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { fontSize: UI960_FONT.small });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private addChampionPortrait(championId: string, x: number, groundY: number): void {
    const portrait = `${championId}-portrait`;
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(212, 212);
      return;
    }
    const front = `${championId}-battle-front`;
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(200, 214);
      return;
    }
    this.add.circle(x, groundY - 100, 72, UI.colors.panelRaised, 1).setStrokeStyle(3, UI.colors.borderSoft);
  }

  private infoRow(x: number, y: number, label: string, value: string): void {
    Ui960Kit.label(this, x, y, label, UI960_FONT.tiny, UI.text.muted, true);
    Ui960Kit.label(this, x + 90, y, value, UI960_FONT.small, UI.text.primary, true);
  }

  private statLine(x: number, y: number, label: string, value: number): void {
    Ui960Kit.label(this, x, y, label, UI960_FONT.tiny, UI.text.accent, true);
    Ui960Kit.label(this, x + 70, y, String(value), UI960_FONT.small, UI.text.primary, true).setOrigin(1, 0);
  }

  private shortBonuses(bonuses: Partial<StatBlock>): string {
    return Object.entries(bonuses).map(([key, value]) => `${DataRegistry.stat(key as keyof StatBlock).short}+${value}`).join(' ');
  }

  private roleLabel(tag?: string): string {
    const labels: Record<string, string> = {
      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador',
      tanque: 'Tanque', luchador: 'Luchador', mago: 'Mago', asesino: 'Asesino', tirador: 'Tirador', apoyo: 'Apoyo', especialista: 'Especialista'
    };
    return tag ? labels[tag] ?? tag : 'Campeón';
  }

  private hpColor(ratio: number): number {
    if (ratio > 0.5) return UI.colors.hp;
    if (ratio > 0.2) return UI.colors.hpMid;
    return UI.colors.hpLow;
  }
}
