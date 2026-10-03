import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { RegionMapPointDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { UI } from '../ui/theme/UiTheme';
import { Ui960Kit } from '../ui/components/Ui960Kit';
import { ConsoleInput } from '../input/ConsoleInput';

/** Bandle is a separate realm: its menu map never opens the Runeterra atlas. */
export class RegionMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private selectedPointId = 'portal-clearing';
  private detailName!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private detailStatus!: Phaser.GameObjects.Text;
  private travelLabel!: Phaser.GameObjects.Text;
  private selection!: Phaser.GameObjects.Arc;
  private currentMarker!: Phaser.GameObjects.Text;

  constructor() { super('RegionMapScene'); }

  private points(): RegionMapPointDefinition[] {
    return DataRegistry.regionMap('bandle-city-region-map').points;
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    const zone = this.save.worldProgress.currentZoneId;
    const aliases: Record<string, string> = { 'gnar-cave': 'gnar-valley', 'bandle-route': 'portal-clearing' };
    this.selectedPointId = this.points().find(point => point.id === (aliases[zone] ?? zone))?.id ?? 'portal-clearing';
    // Preserve the supplied image's aspect ratio and retain all six zones.
    const background = this.add.image(480, 270, 'bandle-menu-map');
    const source = background.texture.getSourceImage();
    background.setScale(Math.min(960 / source.width, 540 / source.height));
    Ui960Kit.label(this, 244, 58, 'BANDLE CITY', '20px', '#ffe4a0', true).setOrigin(0.5);
    this.drawPoints();
    this.selection = this.add.circle(0, 0, 11, UI.colors.gold, 0).setStrokeStyle(2, UI.colors.gold);
    this.currentMarker = Ui960Kit.label(this, 0, 0, '▼', '13px', '#ffffff', true).setOrigin(0.5);
    const current = this.points().find(point => point.id === this.selectedPointId);
    if (current) this.currentMarker.setPosition(current.x, current.y + 39);
    this.drawDetailsPanel();
    this.refreshDetails();
    const back = () => this.scene.start('MenuScene');
    this.input.keyboard?.on('keydown-ESC', back);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown-ESC', back));
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (direction) {
      const points = this.points();
      const index = Math.max(0, points.findIndex(point => point.id === this.selectedPointId));
      const delta = direction === 'up' || direction === 'left' ? -1 : 1;
      this.selectedPointId = points[Phaser.Math.Wrap(index + delta, 0, points.length)].id;
      this.refreshDetails();
    }
    if (ConsoleInput.consumeA()) this.travelToSelected();
    if (ConsoleInput.consumeB()) this.scene.start('MenuScene');
  }

  private drawPoints(): void {
    for (const point of this.points()) {
      const label = Ui960Kit.label(this, point.x, point.y, (point.mapLabel ?? point.name).toUpperCase(), '8px', '#382518', true)
        .setOrigin(0.5);
      label.setScale(Math.min(1, 67 / label.width, 12 / label.height));
      const hitArea = this.add.rectangle(point.x, point.y + 10, 84, 44, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hitArea.on(Phaser.Input.Events.POINTER_UP, () => {
        this.selectedPointId = point.id;
        this.refreshDetails();
      });
    }
  }

  private drawDetailsPanel(): void {
    Ui960Kit.panel(this, 12, 470, 936, 62, { alpha: 0.96 });
    this.detailName = Ui960Kit.label(this, 28, 477, '', '13px', UI.text.gold, true);
    this.detailStatus = Ui960Kit.label(this, 574, 478, '', '9px', UI.text.accent, true).setOrigin(1, 0);
    this.detailDescription = Ui960Kit.label(this, 28, 500, '', '10px', UI.text.secondary).setWordWrapWidth(550, true);
    const travel = Ui960Kit.button(this, 682, 501, 164, 38, 'IR A ZONA', () => this.travelToSelected(), { fontSize: '11px' });
    this.travelLabel = travel.label;
    Ui960Kit.button(this, 856, 501, 140, 38, 'MENÚ', () => this.scene.start('MenuScene'), { fontSize: '11px' });
  }

  private selectedPoint(): RegionMapPointDefinition {
    return this.points().find(point => point.id === this.selectedPointId) ?? this.points()[0];
  }

  private refreshDetails(): void {
    const point = this.selectedPoint();
    const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
    const current = this.save.worldProgress.currentZoneId === point.id
      || (point.id === 'gnar-valley' && this.save.worldProgress.currentZoneId === 'gnar-cave');
    this.selection.setPosition(point.x, point.y + 19);
    this.detailName.setText(point.name.toUpperCase());
    this.detailDescription.setText(point.description);
    this.detailStatus.setText(current ? 'ESTÁS AQUÍ' : unlocked ? 'HABILITADA' : 'POR EXPLORAR');
    this.travelLabel.setText(unlocked && point.targetMapId ? 'IR A ZONA' : 'POR EXPLORAR');
  }

  private travelToSelected(): void {
    const point = this.selectedPoint();
    const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
    if (!unlocked || !point.targetMapId) return;
    this.save.worldProgress.currentRegionId = 'bandle-city';
    this.save.worldProgress.currentZoneId = point.id;
    this.save.currentMapId = point.targetMapId;
    SaveService.save(this.save);
    this.scene.stop('MenuScene');
    this.scene.stop('WorldScene');
    this.scene.start('WorldScene');
  }
}
