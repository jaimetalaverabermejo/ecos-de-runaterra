import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { WorldRegionDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { UI } from '../ui/theme/UiTheme';
import { UiKit } from '../ui/components/UiKit';

const VIEWPORT = { x: 12, y: 52, width: 352, height: 202 };
const WORLD_SIZE = { width: 720, height: 420 };

export class WorldMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private mapContainer!: Phaser.GameObjects.Container;
  private panX = -340;
  private panY = -80;
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
    this.save = this.registry.get('save') as SaveGame;
    this.selectedRegionId = this.save.worldProgress.currentRegionId || 'bandle-city';
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x35545d).setAlpha(0.28);
    this.add.rectangle(0, 0, 512, 288, 0x020c16, 0.72).setOrigin(0, 0);
    UiKit.framedPanel(this, 6, 6, 500, 276);
    this.drawHeader();
    this.drawMapViewport();
    this.drawDetailsPanel();
    this.drawFooter();
    this.refreshDetails();
    this.bindPanning();
  }

  private drawHeader(): void {
    this.add.rectangle(10, 10, 492, 34, UI.colors.panelRaised, 1).setOrigin(0, 0);
    UiKit.label(this, 22, 13, 'MAPA', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 22, 31, 'RUNATERRA', UI.font.tiny, UI.text.accent, true);
    UiKit.label(this, 490, 17, 'ECOS DE RUNATERRA', UI.font.small, UI.text.secondary, true).setOrigin(1, 0);
    UiKit.runeDivider(this, 255, 39, 160);
  }

  private drawMapViewport(): void {
    const viewportBg = this.add.rectangle(VIEWPORT.x, VIEWPORT.y, VIEWPORT.width, VIEWPORT.height, 0x0c3852, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI.colors.goldDark);
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(VIEWPORT.x + 2, VIEWPORT.y + 2, VIEWPORT.width - 4, VIEWPORT.height - 4);
    const mask = maskShape.createGeometryMask();
    this.mapContainer = this.add.container(VIEWPORT.x + this.panX, VIEWPORT.y + this.panY).setMask(mask);
    this.mapContainer.add(this.add.rectangle(0, 0, WORLD_SIZE.width, WORLD_SIZE.height, 0x0a4d69, 1).setOrigin(0, 0));
    this.drawLandmasses();
    this.drawRoutes();
    this.drawRegionNodes();
    viewportBg.setInteractive({ useHandCursor: true });
    UiKit.label(this, VIEWPORT.x + 8, VIEWPORT.y + VIEWPORT.height - 16, 'Arrastra para explorar Runaterra', UI.font.tiny, '#b7dfea', true)
      .setBackgroundColor('rgba(2,14,24,0.68)')
      .setPadding(4, 2, 4, 2);
  }

  private drawLandmasses(): void {
    const shapes: Phaser.GameObjects.GameObject[] = [
      this.add.ellipse(175, 120, 250, 145, 0x507c53, 1),
      this.add.ellipse(325, 150, 210, 140, 0x668d55, 1),
      this.add.ellipse(535, 140, 205, 125, 0x507c53, 1),
      this.add.ellipse(275, 315, 280, 150, 0xa8874f, 1),
      this.add.ellipse(515, 315, 250, 130, 0x668d55, 1),
      this.add.ellipse(170, 55, 190, 88, 0xa7c5c9, 1),
      this.add.ellipse(650, 350, 130, 100, 0x24464b, 1),
      this.add.ellipse(620, 225, 92, 70, 0x6fa65b, 1)
    ];
    shapes.forEach((shape) => this.mapContainer.add(shape));
    const coast = this.add.graphics();
    coast.lineStyle(2, 0xc6d9b2, 0.45);
    coast.strokeEllipse(175, 120, 250, 145);
    coast.strokeEllipse(325, 150, 210, 140);
    coast.strokeEllipse(535, 140, 205, 125);
    coast.strokeEllipse(275, 315, 280, 150);
    coast.strokeEllipse(515, 315, 250, 130);
    this.mapContainer.add(coast);
  }

  private drawRoutes(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(2, UI.colors.cyanGlow, 0.28);
    const regions = DataRegistry.worldRegions();
    const bandle = regions.find((region) => region.id === 'bandle-city');
    if (bandle) {
      for (const region of regions.filter((entry) => entry.id !== 'bandle-city')) {
        graphics.lineBetween(bandle.x, bandle.y, region.x, region.y);
      }
    }
    this.mapContainer.add(graphics);
  }

  private drawRegionNodes(): void {
    for (const region of DataRegistry.worldRegions()) {
      const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
      const current = region.id === this.save.worldProgress.currentRegionId;
      const node = this.add.container(region.x, region.y);
      const halo = this.add.circle(0, 0, current ? 18 : 15, current ? UI.colors.cyanGlow : 0x07131e, current ? 0.28 : 0.55)
        .setStrokeStyle(current ? 3 : 2, unlocked ? UI.colors.gold : UI.colors.borderSoft);
      const core = this.add.rectangle(0, 0, unlocked ? 9 : 7, unlocked ? 9 : 7, unlocked ? UI.colors.accent : 0x45606d, 1)
        .setAngle(45)
        .setStrokeStyle(2, unlocked ? UI.colors.border : UI.colors.borderSoft);
      const labelBg = this.add.rectangle(0, 24, Math.max(68, region.name.length * 7), 18, 0x061725, 0.92)
        .setStrokeStyle(1, unlocked ? UI.colors.borderSoft : 0x365261);
      const label = UiKit.label(this, 0, 24, region.name, UI.font.tiny, unlocked ? UI.text.primary : UI.text.muted, true).setOrigin(0.5);
      node.add([halo, core, labelBg, label]);
      node.setSize(Math.max(80, region.name.length * 7), 52).setInteractive({ useHandCursor: true });
      node.on(Phaser.Input.Events.POINTER_UP, () => this.handleRegionTap(region, unlocked));
      this.mapContainer.add(node);
    }
  }

  private drawDetailsPanel(): void {
    UiKit.framedPanel(this, 370, 52, 132, 202);
    UiKit.label(this, 382, 59, 'REGIÓN', UI.font.small, UI.text.accent, true);
    this.detailName = UiKit.label(this, 436, 78, '', UI.font.heading, UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.runeDivider(this, 436, 101, 100);
    this.detailDescription = UiKit.label(this, 382, 111, '', UI.font.tiny, UI.text.secondary)
      .setWordWrapWidth(108, true)
      .setLineSpacing(2);
    this.detailStatus = UiKit.label(this, 382, 178, '', UI.font.tiny, UI.text.gold, true)
      .setWordWrapWidth(108, true);
    UiKit.button(this, 436, 224, 100, 26, 'ABRIR REGIÓN', () => this.openSelectedRegion(), {
      accent: 'gold',
      fontSize: UI.font.small
    });
  }

  private drawFooter(): void {
    UiKit.runeDivider(this, 256, 261, 456);
    UiKit.label(this, 18, 267, 'Bandle está habilitada. El resto se desbloqueará con la historia.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 472, 269, 58, 22, 'ATRÁS', () => this.scene.start('MenuScene'), { accent: 'blue', fontSize: UI.font.tiny });
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

  private handleRegionTap(region: WorldRegionDefinition, unlocked: boolean): void {
    if (this.moved > 8) return;
    this.selectedRegionId = region.id;
    this.refreshDetails();
    if (unlocked && region.id === 'bandle-city') this.scene.start('RegionMapScene', { regionId: region.id });
  }

  private openSelectedRegion(): void {
    const region = DataRegistry.worldRegion(this.selectedRegionId);
    const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
    if (unlocked && region.id === 'bandle-city') this.scene.start('RegionMapScene', { regionId: region.id });
    else this.detailStatus.setText('Región todavía bloqueada.');
  }

  private refreshDetails(): void {
    const region = DataRegistry.worldRegion(this.selectedRegionId);
    const unlocked = this.save.worldProgress.unlockedRegions.includes(region.id) || region.enabled;
    const current = region.id === this.save.worldProgress.currentRegionId;
    this.detailName.setText(region.name.toUpperCase());
    this.detailDescription.setText(region.description);
    this.detailStatus.setText(current ? 'UBICACIÓN ACTUAL\nRegión habilitada' : unlocked ? 'REGIÓN HABILITADA' : 'REGIÓN BLOQUEADA');
  }

  private isInsideViewport(x: number, y: number): boolean {
    return x >= VIEWPORT.x && x <= VIEWPORT.x + VIEWPORT.width && y >= VIEWPORT.y && y <= VIEWPORT.y + VIEWPORT.height;
  }
}
