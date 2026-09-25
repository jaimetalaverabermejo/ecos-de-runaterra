import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { RegionMapPointDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { UI } from '../ui/theme/UiTheme';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { ConsoleInput } from '../input/ConsoleInput';

const VIEWPORT = { x: 24, y: 104, width: 584, height: 372 };
const MAP_SCALE = 1.2;
const REGION_SIZE = { width: 720 * MAP_SCALE, height: 420 * MAP_SCALE };

export class RegionMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private mapContainer!: Phaser.GameObjects.Container;
  private panX = -108;
  private panY = -72;
  private dragging = false;
  private moved = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private selectedPointId = 'portal-clearing';
  private detailName!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private detailStatus!: Phaser.GameObjects.Text;
  private travelLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('RegionMapScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.selectedPointId = this.save.worldProgress.currentZoneId || 'portal-clearing';
    Ui960Kit.backdrop(this, 'bandle-bg', 0x42666c, 0.26, 0.74);
    Ui960Kit.header(this, 'BANDLE CITY', 'MAPA REGIONAL', 'REGIÓN HABILITADA');
    this.drawRegionalViewport();
    this.drawDetailsPanel();
    this.refreshDetails();
    this.bindPanning();
  }

  update(): void {
    const direction = ConsoleInput.consumeDirection();
    if (direction) {
      const points = DataRegistry.regionMap('bandle-city-region-map').points;
      if (points.length > 0) {
        const current = Math.max(0, points.findIndex((point) => point.id === this.selectedPointId));
        const delta = direction === 'up' || direction === 'left' ? -1 : 1;
        this.selectedPointId = points[Phaser.Math.Wrap(current + delta, 0, points.length)].id;
        this.refreshDetails();
      }
    }
    if (ConsoleInput.consumeA()) this.travelToSelected();
    if (ConsoleInput.consumeB()) this.scene.start('WorldMapScene');
  }

  private drawRegionalViewport(): void {
    this.add.rectangle(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height, 0x0c3852, 1)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.goldDark)
      .setInteractive({ useHandCursor: true });

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(VIEWPORT.x + 3, VIEWPORT.y + 3, VIEWPORT.width - 6, VIEWPORT.height - 6);
    const mask = maskShape.createGeometryMask();

    this.mapContainer = this.add.container(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY).setMask(mask);
    const background = this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(REGION_SIZE.width, REGION_SIZE.height);
    this.mapContainer.add(background);
    this.mapContainer.add(this.add.rectangle(0, 0, REGION_SIZE.width, REGION_SIZE.height, 0x06141b, 0.12).setOrigin(0));
    this.drawPointRoutes();
    this.drawPoints();

    Ui960Kit.label(this, VIEWPORT.x + 12, VIEWPORT.y + VIEWPORT.height - 30, 'Arrastra para explorar Bandle', UI960_FONT.tiny, '#d5eef2', true)
      .setBackgroundColor('rgba(2,14,24,0.72)')
      .setPadding(7, 4, 7, 4);
  }

  private drawPointRoutes(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    const graphics = this.add.graphics();
    graphics.lineStyle(4, UI.colors.cyanGlow, 0.46);
    const points = map.points;
    for (let i = 0; i < points.length - 1; i += 1) {
      graphics.lineBetween(points[i].x * MAP_SCALE, points[i].y * MAP_SCALE, points[i + 1].x * MAP_SCALE, points[i + 1].y * MAP_SCALE);
    }
    this.mapContainer.add(graphics);
  }

  private drawPoints(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    for (const point of map.points) {
      const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
      const current = point.id === this.save.worldProgress.currentZoneId;
      const node = this.add.container(point.x * MAP_SCALE, point.y * MAP_SCALE);
      const halo = this.add.circle(0, 0, current ? 25 : 21, current ? UI.colors.cyanGlow : 0x061725, current ? 0.34 : 0.72)
        .setStrokeStyle(current ? 4 : 3, unlocked ? UI.colors.gold : UI.colors.borderSoft);
      const glyph = this.add.rectangle(0, 0, 13, 13, unlocked ? UI.colors.accent : 0x3c5966, 1)
        .setAngle(45)
        .setStrokeStyle(2, unlocked ? UI.colors.border : UI.colors.borderSoft);
      const labelBg = this.add.rectangle(0, 35, Math.max(116, point.name.length * 9), 24, 0x061725, 0.94)
        .setStrokeStyle(2, unlocked ? UI.colors.borderSoft : 0x365261);
      const label = Ui960Kit.label(this, 0, 35, point.name, UI960_FONT.tiny, unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5);
      node.add([halo, glyph, labelBg, label]);
      node.setSize(Math.max(126, point.name.length * 9), 72).setInteractive({ useHandCursor: true });
      node.on(Phaser.Input.Events.POINTER_UP, () => this.handlePointTap(point));
      this.mapContainer.add(node);
    }
  }

  private drawDetailsPanel(): void {
    Ui960Kit.frame(this, 'ui960a-map-side-panel', 624, 104, 320, 420);
    Ui960Kit.label(this, 648, 126, 'PUNTO', UI960_FONT.small, UI.text.gold, true);
    this.detailName = Ui960Kit.label(this, 784, 160, '', UI960_FONT.heading, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(270, true).setAlign('center');
    Ui960Kit.separator(this, 784, 204, 280);
    this.detailDescription = Ui960Kit.label(this, 648, 224, '', UI960_FONT.tiny, UI.text.secondary)
      .setWordWrapWidth(272, true)
      .setLineSpacing(3);

    this.add.image(708, 370, 'ui960a-map-chip').setDisplaySize(120, 32);
    this.detailStatus = Ui960Kit.label(this, 708, 362, '', '10px', UI.text.gold, true).setOrigin(0.5, 0).setAlign('center');

    const travel = Ui960Kit.textureButton(this, 784, 430, 280, 56, 'IR A ZONA', () => this.travelToSelected(), {
      selected: true,
      normalTexture: 'ui960a-map-location',
      selectedTexture: 'ui960a-map-location-selected',
      fontSize: UI960_FONT.small
    });
    this.travelLabel = travel.label;
    Ui960Kit.button(this, 704, 490, 140, 44, '← RUNATERRA', () => this.scene.start('WorldMapScene'), { fontSize: UI960_FONT.tiny });
    Ui960Kit.button(this, 864, 490, 140, 44, 'MENÚ', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
  }

  private bindPanning(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!this.isInsideViewport(pointer.x, pointer.y)) return;
      this.dragging = true;
      this.moved = 0;
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging || !pointer.isDown) return;
      const dx = pointer.x - this.lastPointerX;
      const dy = pointer.y - this.lastPointerY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.panX = Phaser.Math.Clamp(this.panX + dx, VIEWPORT.width - REGION_SIZE.width, 0);
      this.panY = Phaser.Math.Clamp(this.panY + dy, VIEWPORT.height - REGION_SIZE.height, 0);
      this.mapContainer.setPosition(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY);
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => { this.dragging = false; });
  }

  private handlePointTap(point: RegionMapPointDefinition): void {
    if (this.moved > 8) return;
    this.selectedPointId = point.id;
    this.refreshDetails();
  }

  private refreshDetails(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    const point = map.points.find((entry) => entry.id === this.selectedPointId) ?? map.points[0];
    const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
    const current = point.id === this.save.worldProgress.currentZoneId;
    this.detailName.setText(point.name.toUpperCase());
    this.detailDescription.setText(point.description);
    this.detailStatus.setText(current ? 'UBICACIÓN ACTUAL' : unlocked ? 'HABILITADA' : 'BLOQUEADA');
    this.travelLabel.setText(unlocked && point.targetMapId ? 'IR A ZONA' : 'BLOQUEADA');
  }

  private travelToSelected(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    const point = map.points.find((entry) => entry.id === this.selectedPointId) ?? map.points[0];
    const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
    if (!unlocked || !point.targetMapId) {
      this.detailStatus.setText('BLOQUEADA');
      return;
    }
    this.save.worldProgress.currentRegionId = 'bandle-city';
    this.save.worldProgress.currentZoneId = point.id;
    this.save.currentMapId = point.targetMapId;
    SaveService.save(this.save);
    this.scene.stop('MenuScene');
    this.scene.stop('WorldScene');
    this.scene.start('WorldScene');
  }

  private isInsideViewport(x: number, y: number): boolean {
    return x >= VIEWPORT.x && x <= VIEWPORT.x + VIEWPORT.width && y >= VIEWPORT.y && y <= VIEWPORT.y + VIEWPORT.height;
  }
}
