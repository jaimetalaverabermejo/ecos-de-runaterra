import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { RegionMapPointDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { SaveService } from '../systems/save/SaveService';
import { UI } from '../ui/theme/UiTheme';
import { UiKit } from '../ui/components/UiKit';

const VIEWPORT = { x: 12, y: 52, width: 352, height: 202 };
const REGION_SIZE = { width: 720, height: 420 };

export class RegionMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private mapContainer!: Phaser.GameObjects.Container;
  private panX = -90;
  private panY = -110;
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
    this.save = this.registry.get('save') as SaveGame;
    this.selectedPointId = this.save.worldProgress.currentZoneId || 'portal-clearing';
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x42666c).setAlpha(0.30);
    this.add.rectangle(0, 0, 512, 288, 0x020c16, 0.70).setOrigin(0, 0);
    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawRegionalViewport();
    this.drawDetailsPanel();
    this.drawFooter();
    this.refreshDetails();
    this.bindPanning();
  }

  private drawHeader(): void {
    this.add.rectangle(10, 10, 492, 34, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 22, 13, 'BANDLE CITY', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 22, 31, 'MAPA REGIONAL', UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 490, 17, 'REGIÓN HABILITADA', UI.font.small, UI.text.gold, true).setOrigin(1, 0);
    UiKit.runeDivider(this, 255, 39, 160, true);
  }

  private drawRegionalViewport(): void {
    this.add.rectangle(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height, 0x0c3852, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI.colors.goldDark)
      .setInteractive({ useHandCursor: true });

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(VIEWPORT.x + 2, VIEWPORT.y + 2, VIEWPORT.width - 4, VIEWPORT.height - 4);
    const mask = maskShape.createGeometryMask();

    this.mapContainer = this.add.container(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY).setMask(mask);
    const background = this.add.image(0, 0, 'bandle-bg').setOrigin(0, 0).setDisplaySize(REGION_SIZE.width, REGION_SIZE.height);
    this.mapContainer.add(background);
    this.mapContainer.add(this.add.rectangle(0, 0, REGION_SIZE.width, REGION_SIZE.height, 0x06141b, 0.12).setOrigin(0, 0));
    this.drawPointRoutes();
    this.drawPoints();

    UiKit.label(this, VIEWPORT.x + 8, VIEWPORT.y + VIEWPORT.height - 16, 'Arrastra para explorar Bandle', UI.font.tiny, '#d5eef2', true)
      .setBackgroundColor('rgba(2,14,24,0.68)')
      .setPadding(4, 2, 4, 2);
  }

  private drawPointRoutes(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    const graphics = this.add.graphics();
    graphics.lineStyle(3, UI.colors.cyanGlow, 0.42);
    const points = map.points;
    for (let i = 0; i < points.length - 1; i += 1) {
      graphics.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }
    this.mapContainer.add(graphics);
  }

  private drawPoints(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    for (const point of map.points) {
      const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
      const current = point.id === this.save.worldProgress.currentZoneId;
      const node = this.add.container(point.x, point.y);
      const halo = this.add.circle(0, 0, current ? 20 : 16, current ? UI.colors.cyanGlow : 0x061725, current ? 0.34 : 0.72)
        .setStrokeStyle(current ? 3 : 2, unlocked ? UI.colors.gold : UI.colors.borderSoft);
      const glyph = this.add.diamond(0, 0, 12, 12, unlocked ? UI.colors.accent : 0x3c5966, 1)
        .setStrokeStyle(2, unlocked ? UI.colors.border : UI.colors.borderSoft);
      const labelBg = this.add.rectangle(0, 25, Math.max(92, point.name.length * 7), 18, 0x061725, 0.94)
        .setStrokeStyle(1, unlocked ? UI.colors.borderSoft : 0x365261);
      const label = UiKit.label(this, 0, 25, point.name, UI.font.tiny, unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5);
      node.add([halo, glyph, labelBg, label]);
      node.setSize(Math.max(104, point.name.length * 7), 56).setInteractive({ useHandCursor: true });
      node.on(Phaser.Input.Events.POINTER_UP, () => this.handlePointTap(point));
      this.mapContainer.add(node);
    }
  }

  private drawDetailsPanel(): void {
    UiKit.framedPanel(this, 370, 52, 132, 202);
    UiKit.label(this, 382, 59, 'PUNTO', UI.font.small, UI.text.accent, true);
    this.detailName = UiKit.label(this, 436, 78, '', UI.font.heading, UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.runeDivider(this, 436, 101, 100);
    this.detailDescription = UiKit.label(this, 382, 111, '', UI.font.tiny, UI.text.secondary)
      .setWordWrapWidth(108, true)
      .setLineSpacing(2);
    this.detailStatus = UiKit.label(this, 382, 181, '', UI.font.tiny, UI.text.gold, true).setWordWrapWidth(108, true);
    const travel = UiKit.button(this, 436, 224, 100, 26, 'IR A ZONA', () => this.travelToSelected(), {
      accent: 'gold',
      fontSize: UI.font.small
    });
    this.travelLabel = travel.label;
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 261, 456);
    UiKit.button(this, 84, 269, 110, 22, '← RUNATERRA', () => this.scene.start('WorldMapScene'), {
      accent: 'blue',
      fontSize: UI.font.tiny
    });
    UiKit.label(this, 154, 264, 'Selecciona puntos para consultar zonas y portales.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 472, 269, 58, 22, 'MENÚ', () => this.scene.start('MenuScene'), {
      accent: 'blue',
      fontSize: UI.font.tiny
    });
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
    this.detailStatus.setText(current ? 'UBICACIÓN ACTUAL\nZona visitable' : unlocked ? 'ZONA HABILITADA' : 'ZONA BLOQUEADA');
    this.travelLabel.setText(unlocked && point.targetMapId ? 'IR A ZONA' : 'BLOQUEADA');
  }

  private travelToSelected(): void {
    const map = DataRegistry.regionMap('bandle-city-region-map');
    const point = map.points.find((entry) => entry.id === this.selectedPointId) ?? map.points[0];
    const unlocked = this.save.worldProgress.unlockedZones.includes(point.id) || point.enabled;
    if (!unlocked || !point.targetMapId) {
      this.detailStatus.setText('Esta zona todavía no tiene mapa jugable.');
      return;
    }

    this.save.worldProgress.currentRegionId = 'bandle-city';
    this.save.worldProgress.currentZoneId = point.id;
    this.save.currentMapId = point.targetMapId;
    SaveService.save(this.save);
    this.scene.start('WorldScene');
  }

  private isInsideViewport(x: number, y: number): boolean {
    return x >= VIEWPORT.x && x <= VIEWPORT.x + VIEWPORT.width && y >= VIEWPORT.y && y <= VIEWPORT.y + VIEWPORT.height;
  }
}
