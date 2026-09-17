import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { WorldRegionDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { UI } from '../ui/theme/UiTheme';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';

const VIEWPORT = { x: 24, y: 104, width: 584, height: 372 };
const MAP_SCALE = 1.2;
const WORLD_SIZE = { width: 720 * MAP_SCALE, height: 420 * MAP_SCALE };

export class WorldMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private mapContainer!: Phaser.GameObjects.Container;
  private panX = -108;
  private panY = -72;
  private dragging = false;
  private moved = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private selectedRegionId = 'bandle-city';
  private detailName!: Phaser.GameObjects.Text;
  private detailDescription!: Phaser.GameObjects.Text;
  private detailStatus!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldMapScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.save = this.registry.get('save') as SaveGame;
    this.selectedRegionId = this.save.worldProgress.currentRegionId || 'bandle-city';
    Ui960Kit.backdrop(this, 'bandle-bg', 0x35545d, 0.24, 0.76);
    Ui960Kit.header(this, 'MAPA', 'RUNATERRA', 'ECOS DE RUNATERRA');
    this.drawMapViewport();
    this.drawDetailsPanel();
    this.refreshDetails();
    this.bindPanning();
  }

  private drawMapViewport(): void {
    const viewportBg = this.add.rectangle(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height, 0x0c3852, 1)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.goldDark)
      .setInteractive({ useHandCursor: true });
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(VIEWPORT.x + 3, VIEWPORT.y + 3, VIEWPORT.width - 6, VIEWPORT.height - 6);
    const mask = maskShape.createGeometryMask();
    this.mapContainer = this.add.container(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY).setMask(mask);
    this.mapContainer.add(this.add.rectangle(0, 0, WORLD_SIZE.width, WORLD_SIZE.height, 0x0a4d69, 1).setOrigin(0));
    this.drawLandmasses();
    this.drawRoutes();
    this.drawRegionNodes();
    void viewportBg;
    Ui960Kit.label(this, VIEWPORT.x + 12, VIEWPORT.y + VIEWPORT.height - 30, 'Arrastra para explorar Runaterra', UI960_FONT.tiny, '#b7dfea', true)
      .setBackgroundColor('rgba(2,14,24,0.72)')
      .setPadding(7, 4, 7, 4);
  }

  private drawLandmasses(): void {
    const s = MAP_SCALE;
    const shapes: Phaser.GameObjects.GameObject[] = [
      this.add.ellipse(175 * s, 120 * s, 250 * s, 145 * s, 0x507c53, 1),
      this.add.ellipse(325 * s, 150 * s, 210 * s, 140 * s, 0x668d55, 1),
      this.add.ellipse(535 * s, 140 * s, 205 * s, 125 * s, 0x507c53, 1),
      this.add.ellipse(275 * s, 315 * s, 280 * s, 150 * s, 0xa8874f, 1),
      this.add.ellipse(515 * s, 315 * s, 250 * s, 130 * s, 0x668d55, 1),
      this.add.ellipse(170 * s, 55 * s, 190 * s, 88 * s, 0xa7c5c9, 1),
      this.add.ellipse(650 * s, 350 * s, 130 * s, 100 * s, 0x24464b, 1),
      this.add.ellipse(620 * s, 225 * s, 92 * s, 70 * s, 0x6fa65b, 1)
    ];
    shapes.forEach((shape) => this.mapContainer.add(shape));
  }

  private drawRoutes(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(3, UI.colors.cyanGlow, 0.32);
    const regions = DataRegistry.worldRegions();
    const bandle = regions.find((region) => region.id === 'bandle-city');
    if (bandle) {
      for (const region of regions.filter((entry) => entry.id !== 'bandle-city')) {
        graphics.lineBetween(bandle.x * MAP_SCALE, bandle.y * MAP_SCALE, region.x * MAP_SCALE, region.y * MAP_SCALE);
      }
    }
    this.mapContainer.add(graphics);
  }

  private drawRegionNodes(): void {
    for (const region of DataRegistry.worldRegions()) {
      const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
      const current = region.id === this.save.worldProgress.currentRegionId;
      const node = this.add.container(region.x * MAP_SCALE, region.y * MAP_SCALE);
      const halo = this.add.circle(0, 0, current ? 24 : 20, current ? UI.colors.cyanGlow : 0x07131e, current ? 0.28 : 0.58)
        .setStrokeStyle(current ? 4 : 3, unlocked ? UI.colors.gold : UI.colors.borderSoft);
      const core = this.add.rectangle(0, 0, unlocked ? 13 : 10, unlocked ? 13 : 10, unlocked ? UI.colors.accent : 0x45606d, 1)
        .setAngle(45)
        .setStrokeStyle(2, unlocked ? UI.colors.border : UI.colors.borderSoft);
      const labelBg = this.add.rectangle(0, 34, Math.max(104, region.name.length * 9), 24, 0x061725, 0.94)
        .setStrokeStyle(2, unlocked ? UI.colors.borderSoft : 0x365261);
      const label = Ui960Kit.label(this, 0, 34, region.name, UI960_FONT.tiny, unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5);
      node.add([halo, core, labelBg, label]);
      node.setSize(Math.max(116, region.name.length * 9), 70).setInteractive({ useHandCursor: true });
      node.on(Phaser.Input.Events.POINTER_UP, () => this.handleRegionTap(region));
      this.mapContainer.add(node);
    }
  }

  private drawDetailsPanel(): void {
    Ui960Kit.frame(this, 'ui960a-map-side-panel', 624, 104, 320, 420);
    Ui960Kit.label(this, 648, 126, 'REGIÓN', UI960_FONT.small, UI.text.gold, true);
    this.detailName = Ui960Kit.label(this, 784, 160, '', UI960_FONT.heading, UI.text.primary, true).setOrigin(0.5, 0).setWordWrapWidth(270, true).setAlign('center');
    Ui960Kit.separator(this, 784, 204, 280);
    this.detailDescription = Ui960Kit.label(this, 648, 224, '', UI960_FONT.tiny, UI.text.secondary)
      .setWordWrapWidth(272, true)
      .setLineSpacing(3);

    this.add.image(708, 370, 'ui960a-map-chip').setDisplaySize(120, 32);
    this.detailStatus = Ui960Kit.label(this, 708, 362, '', '10px', UI.text.gold, true).setOrigin(0.5, 0).setAlign('center');

    Ui960Kit.textureButton(this, 784, 430, 280, 56, 'ABRIR REGIÓN', () => this.openSelectedRegion(), {
      selected: true,
      normalTexture: 'ui960a-map-location',
      selectedTexture: 'ui960a-map-location-selected',
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 784, 490, 140, 44, 'ATRÁS', () => this.scene.start('MenuScene'), { fontSize: UI960_FONT.small });
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
      this.panX = Phaser.Math.Clamp(this.panX + dx, VIEWPORT.width - WORLD_SIZE.width, 0);
      this.panY = Phaser.Math.Clamp(this.panY + dy, VIEWPORT.height - WORLD_SIZE.height, 0);
      this.mapContainer.setPosition(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY);
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => { this.dragging = false; });
  }

  private handleRegionTap(region: WorldRegionDefinition): void {
    if (this.moved > 8) return;
    this.selectedRegionId = region.id;
    this.refreshDetails();
  }

  private openSelectedRegion(): void {
    const region = DataRegistry.worldRegion(this.selectedRegionId);
    const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
    if (unlocked && region.id === 'bandle-city') this.scene.start('RegionMapScene', { regionId: region.id });
    else this.detailStatus.setText('BLOQUEADA');
  }

  private refreshDetails(): void {
    const region = DataRegistry.worldRegion(this.selectedRegionId);
    const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
    const current = region.id === this.save.worldProgress.currentRegionId;
    this.detailName.setText(region.name.toUpperCase());
    this.detailDescription.setText(region.description);
    this.detailStatus.setText(current ? 'UBICACIÓN ACTUAL' : unlocked ? 'HABILITADA' : 'BLOQUEADA');
  }

  private isInsideViewport(x: number, y: number): boolean {
    return x >= VIEWPORT.x && x <= VIEWPORT.x + VIEWPORT.width && y >= VIEWPORT.y && y <= VIEWPORT.y + VIEWPORT.height;
  }
}
