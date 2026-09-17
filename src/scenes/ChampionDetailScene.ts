import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance } from '../data/types';
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
    const startX = 520;
    this.save.party.slice(0, 5).forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const selected = index === this.partyIndex;
      const x = startX + index * 82;
      const tab = Ui960Kit.button(this, x, 54, 72, 42, '', () => this.scene.start('ChampionDetailScene', { partyIndex: index }), {
        selected,
        fontSize: UI960_FONT.tiny
      });
      Ui960Kit.label(this, x, 38, definition.name.slice(0, 3).toUpperCase(), '11px', selected ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0).setDepth(tab.button.depth + 1);
      Ui960Kit.label(this, x, 55, `M${champion.mastery}`, '10px', UI.text.muted, true).setOrigin(0.5, 0).setDepth(tab.button.depth + 1);
    });
  }

  private drawChampion(): void {
    const champion = this.save.party[this.partyIndex] as ChampionInstance;
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const xpNeeded = ProgressionService.experienceToNext(champion.mastery);

    Ui960Kit.frame(this, 'ui960a-eco-profile', 28, 106, 300, 360);
    this.addChampionPortrait(champion.championId, 178, 344);
    Ui960Kit.label(this, 52, 354, definition.name.toUpperCase(), UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 304, 363, `M ${champion.mastery}`, UI960_FONT.small, UI.text.gold, true).setOrigin(1, 0);
    Ui960Kit.label(this, 52, 398, this.roleLabel(definition.tags[0]), UI960_FONT.small, UI.text.accent, true);
    Ui960Kit.label(this, 52, 424, `TIPOS · ${TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)}`, UI960_FONT.tiny, (definition.affinityIds ?? []).length ? UI.text.gold : UI.text.muted, true)
      .setWordWrapWidth(250, true);

    Ui960Kit.frame(this, 'ui960a-eco-section', 344, 106, 290, 150);
    Ui960Kit.label(this, 366, 124, 'MAESTRÍA', UI960_FONT.heading, UI.text.primary, true);
    this.infoRow(366, 162, 'VIDA', `${champion.currentHp} / ${stats.hp}`);
    Ui960Kit.progress(this, 470, 175, 142, 10, champion.currentHp / stats.hp, this.hpColor(champion.currentHp / stats.hp));
    this.infoRow(366, 194, 'RANGO', `${champion.mastery} / ${ProgressionService.maxMastery()}`);
    this.infoRow(366, 218, 'EXP', xpNeeded > 0 ? `${champion.masteryExperience} / ${xpNeeded}` : 'MAX');
    Ui960Kit.progress(this, 470, 234, 142, 8, ProgressionService.experienceRatio(champion), UI.colors.blue);

    Ui960Kit.frame(this, 'ui960a-eco-section', 646, 106, 290, 150);
    Ui960Kit.label(this, 668, 124, 'ESTADÍSTICAS', UI960_FONT.heading, UI.text.primary, true);
    this.statLine(668, 164, 'ATQ', stats.attack);
    this.statLine(798, 164, 'POD', stats.power);
    this.statLine(668, 194, 'DEF', stats.defense);
    this.statLine(798, 194, 'RES', stats.resistance);
    this.statLine(668, 224, 'VEL', stats.speed);
    this.statLine(798, 224, 'VID', stats.hp);

    Ui960Kit.label(this, 344, 272, 'BUILD', UI960_FONT.heading, UI.text.primary, true);
    const slotXs = [344, 504, 664];
    for (let i = 0; i < 3; i += 1) {
      const itemId = champion.equippedItems[i];
      const sx = slotXs[i];
      Ui960Kit.frame(this, 'ui960a-eco-slot', sx, 304, 150, 110);
      const centerX = sx + 75;
      if (itemId) {
        const item = DataRegistry.item(itemId);
        const texture = `item-${item.id}`;
        this.add.image(centerX, 342, 'ui960a-item-frame-thin-selected').setDisplaySize(58, 58);
        if (this.textures.exists(texture)) this.add.image(centerX, 342, texture).setDisplaySize(46, 46);
        Ui960Kit.label(this, centerX, 378, item.name, '11px', UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(126, true).setAlign('center');
      } else {
        this.add.image(centerX, 342, 'ui960a-item-frame-thin').setDisplaySize(58, 58);
        Ui960Kit.label(this, centerX, 379, `HUECO ${i + 1} · VACÍO`, '10px', UI.text.muted, true).setOrigin(0.5, 0);
      }
    }

    const traits = champion.runeTraits.length > 0 ? champion.runeTraits.map((trait) => trait.id).join(' · ') : 'Sin Rasgos Rúnicos';
    Ui960Kit.label(this, 344, 430, `Rasgos: ${traits}`, UI960_FONT.tiny, champion.runeTraits.length ? UI.text.purple : UI.text.muted).setWordWrapWidth(440, true);
    Ui960Kit.label(this, 790, 430, `Puntos: ${champion.unspentSkillPoints}`, UI960_FONT.tiny, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.secondary, true);

    this.tabButton(360, 'AFINIDAD', () => this.openAffinityInfo(champion), true);
    this.tabButton(534, 'HABILIDADES', () => this.scene.start('MasteryScene', { partyIndex: this.partyIndex }), champion.unspentSkillPoints > 0);
    this.tabButton(708, 'BUILD', () => this.scene.start('BuildScene', { partyIndex: this.partyIndex }), true);
    Ui960Kit.button(this, 884, 505, 140, 44, 'ATRÁS', () => this.scene.start('TeamScene'), { fontSize: UI960_FONT.small });
  }

  private tabButton(x: number, label: string, onClick: () => void, selected: boolean): void {
    Ui960Kit.textureButton(this, x, 505, 170, 52, label, onClick, {
      selected,
      normalTexture: 'ui960a-eco-tab',
      selectedTexture: 'ui960a-eco-tab-selected',
      fontSize: UI960_FONT.small
    });
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
    objects.push(this.add.image(480, 270, 'ui960a-panel-content-large').setDisplaySize(580, 420));
    objects.push(Ui960Kit.label(this, 224, 92, `AFINIDAD · ${definition.name.toUpperCase()}`, UI960_FONT.title, UI.text.primary, true));
    objects.push(Ui960Kit.label(this, 224, 166, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI960_FONT.small, types.length ? UI.text.gold : UI.text.muted, true));
    objects.push(Ui960Kit.label(this, 224, 214, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI960_FONT.small, UI.text.accent, true).setWordWrapWidth(510, true));
    objects.push(Ui960Kit.label(this, 224, 262, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(510, true));
    objects.push(Ui960Kit.label(this, 224, 310, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI960_FONT.small, UI.text.secondary, true).setWordWrapWidth(510, true));
    objects.push(Ui960Kit.label(this, 224, 356, `${TypeEffectivenessService.stabLabel()} con movimientos ofensivos de tus tipos`, UI960_FONT.tiny, UI.text.gold, true).setWordWrapWidth(510, true));
    const close = Ui960Kit.button(this, 480, 424, 150, 44, 'CERRAR', () => {
      this.overlayLayer?.destroy(true);
      this.overlayLayer = undefined;
    }, { selected: true, fontSize: UI960_FONT.small });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private addChampionPortrait(championId: string, x: number, groundY: number): void {
    const portrait = `${championId}-portrait`;
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(220, 220);
      return;
    }
    const front = `${championId}-battle-front`;
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(206, 220);
      return;
    }
    this.add.circle(x, groundY - 100, 72, UI.colors.panelRaised, 1).setStrokeStyle(3, UI.colors.goldDark);
  }

  private infoRow(x: number, y: number, label: string, value: string): void {
    Ui960Kit.label(this, x, y, label, UI960_FONT.tiny, UI.text.muted, true);
    Ui960Kit.label(this, x + 82, y, value, UI960_FONT.small, UI.text.primary, true);
  }

  private statLine(x: number, y: number, label: string, value: number): void {
    Ui960Kit.label(this, x, y, label, UI960_FONT.tiny, UI.text.accent, true);
    Ui960Kit.label(this, x + 96, y, String(value), UI960_FONT.small, UI.text.primary, true).setOrigin(1, 0);
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
