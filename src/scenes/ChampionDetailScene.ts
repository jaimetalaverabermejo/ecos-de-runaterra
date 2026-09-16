import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { ChampionInstance, StatBlock } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { BattleEngine } from '../systems/combat/BattleEngine';
import { TypeEffectivenessService } from '../systems/combat/TypeEffectivenessService';
import { ProgressionService } from '../systems/progression/ProgressionService';
import { UiKit } from '../ui/components/UiKit';
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
    configureSceneLayout(this);
    this.save = this.registry.get('save') as SaveGame;
    if (!this.save.party[this.partyIndex]) {
      this.scene.start('TeamScene');
      return;
    }

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x4b6670).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101a, 0.62).setOrigin(0, 0);

    UiKit.framedPanel(this, 8, 8, 496, 272);
    this.drawHeader();
    this.drawChampion();
  }

  private drawHeader(): void {
    this.add.rectangle(12, 12, 488, 38, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 24, 18, 'CAMPEÓN', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 24, 38, 'ECOS DE RUNATERRA', UI.font.tiny, UI.text.accent, true);

    const startX = 220;
    this.save.party.forEach((champion, index) => {
      const definition = DataRegistry.champion(champion.championId);
      const selected = index === this.partyIndex;
      const x = startX + index * 52;
      const tab = this.add.rectangle(x, 30, 44, 32, selected ? 0x155268 : UI.colors.panelAlt, 1)
        .setStrokeStyle(selected ? 2 : 1, selected ? UI.colors.gold : UI.colors.borderSoft)
        .setInteractive({ useHandCursor: true });
      UiKit.label(this, x, 20, definition.name.slice(0, 3).toUpperCase(), UI.font.tiny, selected ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0);
      UiKit.label(this, x, 33, `M${champion.mastery}`, UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
      tab.on(Phaser.Input.Events.POINTER_UP, () => this.scene.start('ChampionDetailScene', { partyIndex: index }));
    });
  }

  private drawChampion(): void {
    const champion = this.save.party[this.partyIndex] as ChampionInstance;
    const definition = DataRegistry.champion(champion.championId);
    const stats = BattleEngine.statsFor(champion);
    const xpNeeded = ProgressionService.experienceToNext(champion.mastery);

    UiKit.framedPanel(this, 18, 58, 168, 176, true);
    this.add.rectangle(22, 62, 160, 122, 0x173549, 1).setStrokeStyle(1, UI.colors.borderSoft);
    this.addChampionPortrait(champion.championId, 102, 182);
    UiKit.label(this, 28, 190, definition.name.toUpperCase(), UI.font.title, UI.text.primary, true);
    UiKit.badge(this, 150, 200, `M ${champion.mastery}`, 0x11314a);
    UiKit.label(this, 28, 211, this.roleLabel(definition.tags[0]), UI.font.small, UI.text.accent, true);
    UiKit.label(this, 28, 224, `TIPOS · ${TypeEffectivenessService.typeNames(definition.affinityIds ?? [], true)}`, '7px', (definition.affinityIds ?? []).length ? UI.text.gold : UI.text.muted, true);

    UiKit.panel(this, 196, 58, 184, 92, 'MAESTRÍA');
    this.infoRow(208, 88, 'VIDA', `${champion.currentHp} / ${stats.hp}`);
    UiKit.progressBar(this, 272, 94, 94, 7, champion.currentHp / stats.hp, this.hpColor(champion.currentHp / stats.hp));
    this.infoRow(208, 108, 'RANGO', `${champion.mastery} / ${ProgressionService.maxMastery()}`);
    this.infoRow(208, 128, 'EXP', xpNeeded > 0 ? `${champion.masteryExperience} / ${xpNeeded}` : 'MAX');
    UiKit.progressBar(this, 290, 143, 76, 6, ProgressionService.experienceRatio(champion), UI.colors.blue);

    UiKit.panel(this, 388, 58, 106, 92, 'ESTADÍSTICAS');
    this.statLine(398, 87, 'ATQ', stats.attack);
    this.statLine(445, 87, 'POD', stats.power);
    this.statLine(398, 106, 'DEF', stats.defense);
    this.statLine(445, 106, 'RES', stats.resistance);
    this.statLine(398, 125, 'VEL', stats.speed);
    this.statLine(445, 125, 'VID', stats.hp);

    UiKit.panel(this, 196, 158, 298, 76, 'BUILD');
    const slots = [238, 330, 422];
    for (let i = 0; i < 3; i += 1) {
      const itemId = champion.equippedItems[i];
      const x = slots[i];
      this.add.rectangle(x, 193, 72, 48, 0x112c42, 1)
        .setStrokeStyle(2, itemId ? UI.colors.gold : UI.colors.borderSoft);
      if (itemId) {
        const item = DataRegistry.item(itemId);
        UiKit.label(this, x, 177, item.name, UI.font.tiny, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(68);
        UiKit.label(this, x, 209, this.shortBonuses(item.statBonuses), UI.font.tiny, UI.text.accent, true).setOrigin(0.5, 0);
      } else {
        UiKit.label(this, x, 185, `HUECO ${i + 1}`, UI.font.tiny, UI.text.muted, true).setOrigin(0.5, 0);
        UiKit.label(this, x, 202, 'VACÍO', UI.font.tiny, UI.text.muted).setOrigin(0.5, 0);
      }
    }

    const traits = champion.runeTraits.length > 0
      ? champion.runeTraits.map((trait) => trait.id).join(' · ')
      : 'Sin Rasgos Rúnicos';
    UiKit.label(this, 20, 242, `Rasgos: ${traits}`, UI.font.tiny, champion.runeTraits.length ? UI.text.purple : UI.text.muted);
    UiKit.label(this, 20, 256, `Puntos de habilidad: ${champion.unspentSkillPoints}`, UI.font.tiny, champion.unspentSkillPoints > 0 ? UI.text.gold : UI.text.secondary, true);

    UiKit.button(this, 226, 256, 82, 24, 'AFINIDAD', () => this.openAffinityInfo(champion), { accent: 'purple', fontSize: UI.font.tiny });
    UiKit.button(this, 326, 256, 94, 24, 'HABILIDADES', () => {
      this.scene.start('MasteryScene', { partyIndex: this.partyIndex });
    }, { accent: champion.unspentSkillPoints > 0 ? 'gold' : 'blue', fontSize: UI.font.tiny });
    UiKit.button(this, 413, 256, 68, 24, 'BUILD', () => {
      this.scene.start('BuildScene', { partyIndex: this.partyIndex });
    }, { accent: 'gold', fontSize: UI.font.small });
    UiKit.button(this, 478, 256, 52, 24, 'ATRÁS', () => this.scene.start('TeamScene'), {
      accent: 'blue', fontSize: UI.font.tiny
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
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.78));
    objects.push(this.add.rectangle(256, 142, 404, 190, UI.colors.panel, 0.99).setStrokeStyle(3, UI.colors.gold));
    objects.push(UiKit.label(this, 72, 62, `AFINIDAD · ${definition.name.toUpperCase()}`, UI.font.title, UI.text.primary, true));
    objects.push(UiKit.label(this, 72, 91, `TIPOS     ${TypeEffectivenessService.typeNames(types)}`, UI.font.small, types.length ? UI.text.gold : UI.text.muted, true));
    objects.push(UiKit.label(this, 72, 116, `FUERTE    ${strong.length ? TypeEffectivenessService.typeNames(strong) : '—'}`, UI.font.small, UI.text.accent, true).setWordWrapWidth(360, true));
    objects.push(UiKit.label(this, 72, 143, `DÉBIL     ${weak.length ? TypeEffectivenessService.typeNames(weak) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));
    objects.push(UiKit.label(this, 72, 170, `RESISTE   ${resist.length ? TypeEffectivenessService.typeNames(resist) : '—'}`, UI.font.small, UI.text.secondary, true).setWordWrapWidth(360, true));
    objects.push(UiKit.label(this, 72, 194, `${TypeEffectivenessService.stabLabel()} con movimientos ofensivos de tus tipos`, UI.font.tiny, UI.text.gold, true).setWordWrapWidth(360, true));
    const close = UiKit.button(this, 256, 220, 92, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'blue', fontSize: UI.font.tiny });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

  private addChampionPortrait(championId: string, x: number, groundY: number): void {
    const portrait = championId + '-portrait';
    if (this.textures.exists(portrait)) {
      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(120, 120);
      return;
    }
    const front = championId + '-battle-front';
    if (this.textures.exists(front)) {
      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(108, 122);
      return;
    }
    this.add.circle(x, groundY - 58, 44, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);
  }

  private infoRow(x: number, y: number, label: string, value: string): void {
    UiKit.label(this, x, y, label, UI.font.small, UI.text.muted, true);
    UiKit.label(this, x + 72, y, value, UI.font.small, UI.text.primary, true);
  }

  private statLine(x: number, y: number, label: string, value: number): void {
    UiKit.label(this, x, y, label, UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, x + 32, y, String(value), UI.font.small, UI.text.primary, true).setOrigin(1, 0);
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
