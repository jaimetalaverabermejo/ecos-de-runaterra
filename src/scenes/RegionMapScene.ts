import Phaser from 'phaser';
import { IONIA_LAND_ROUTES } from '../data/IoniaTravelRoutes';
import { atlasAncestors, atlasContains, atlasDefinitionId, atlasRegion, atlasView, currentAtlasZone, type AtlasPoint, type AtlasView } from '../data/MapAtlas';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { RegionMapPointDefinition } from '../data/types';
import type { SaveGame } from '../state/GameState';
import { Ui960Kit } from '../ui/components/Ui960Kit';
import { showEncounterList } from '../ui/components/EncounterList';
import { ConsoleFocusController } from '../input/ConsoleFocusController';
import { ConsoleInput } from '../input/ConsoleInput';
import { FerryService } from '../systems/world/FerryService';
import { EncounterFieldGuide } from '../systems/encounters/EncounterFieldGuide';

const VIEWPORT = { top: 64, bottom: 459 };
const CENTER = { x: 480, y: (VIEWPORT.top + VIEWPORT.bottom) / 2 };
const GOLD = 0xf4ce75;
const CYAN = 0x68f5ed;
const DEFAULT_ZOOM = 1.25;
const REGION_ZOOM = 0.78;
const POINTER_THRESHOLD = 8;

export class RegionMapScene extends Phaser.Scene {
  private save!: SaveGame;
  private view!: AtlasView;
  private definitions: RegionMapPointDefinition[] = [];
  private points: AtlasPoint[] = [];
  private currentZone?: string;
  private selected!: AtlasPoint;
  private canvas!: Phaser.GameObjects.Container;
  private selection!: Phaser.GameObjects.Arc;
  private status!: Phaser.GameObjects.Text;
  private actionLabel!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private guide!: EncounterFieldGuide;
  private gesture?: { id: number; startX: number; startY: number; x: number; y: number; moved: boolean };
  private size = { width: 960, height: 480 };

  constructor() { super('RegionMapScene'); }

  init(data: { viewId?: string } = {}): void {
    this.save = this.registry.get('save') as SaveGame;
    this.view = atlasView(data.viewId ?? this.location().viewId);
  }

  preload(): void {
    const { asset, texture } = this.view;
    if (!asset || !texture) return;
    const version = import.meta.env.VITE_BUILD_ID;
    const query = version ? `?v=${encodeURIComponent(version)}` : '';
    this.load.image(texture, `./assets/world/atlas/${asset}.webp${query}`);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.textures.exists(texture)) this.textures.remove(texture);
    });
  }

  create(data: { selectedId?: string } = {}): void {
    configureSceneLayout(this, 'native-960');
    this.guide = new EncounterFieldGuide(this.cache.json.get('encounter-terrain') ?? {});
    this.gesture = undefined;
    this.overlay = undefined;
    const location = this.location();
    this.definitions = this.view.regionId ? DataRegistry.regionMap(atlasDefinitionId(this.view.regionId)).points : [];
    this.currentZone = this.view.id === 'runeterra' ? location.region : this.view.regionId === location.region ? location.zone : undefined;
    this.points = this.view.id === 'runeterra' ? DataRegistry.worldRegions().map(region => ({
      id: region.id, name: region.id === 'ionia' ? 'Jonia' : region.name, x: region.x / 720, y: region.y / 440,
      child: ['ionia', 'noxus', 'bandle-city'].includes(region.id) ? region.id : undefined
    })) : this.view.points;
    this.selected = this.points.find(point => point.id === data.selectedId)
      ?? this.points.find(point => atlasContains(point, this.currentZone)) ?? this.points[0];

    this.cameras.main.setBackgroundColor('#102b36');
    this.canvas = this.add.container(0, 0);
    this.drawMap();
    this.drawHud();
    this.refreshSelection();
    if (this.view.id === 'runeterra') this.canvas.setPosition(CENTER.x, CENTER.y).setScale(0.82);
    else this.center(this.selected, this.initialZoom());
    this.bindInput();
  }

  private location(): { region: string; zone?: string; viewId: string } {
    const region = atlasRegion(this.save.worldProgress.currentRegionId);
    const defs = DataRegistry.regionMap(atlasDefinitionId(region)).points;
    const zone = currentAtlasZone(this.save.currentMapId, this.save.worldProgress.currentZoneId, defs);
    return { region, zone, viewId: region };
  }

  private position(point: AtlasPoint): { x: number; y: number } {
    return { x: (point.x - 0.5) * this.size.width, y: (point.y - 0.5) * this.size.height };
  }

  private nameOf(point: AtlasPoint): string {
    return point.name ?? this.definitions.find(definition => definition.id === point.id)?.name ?? point.id;
  }

  private drawMap(): void {
    if (this.view.texture && this.textures.exists(this.view.texture)) {
      const art = this.add.image(0, 0, this.view.texture);
      const source = art.texture.getSourceImage();
      this.size = { width: 960, height: 960 * source.height / source.width };
      art.setDisplaySize(this.size.width, this.size.height);
      this.canvas.add(art);
    } else {
      this.size = { width: 960, height: 480 };
      const grid = this.add.grid(0, 0, this.size.width, this.size.height, 64, 64, 0x102b36, 1, 0x497180, 0.2);
      this.canvas.add(grid);
    }

    const routes = this.add.graphics();
    this.canvas.add(routes);
    const land = this.view.parent === 'ionia' ? IONIA_LAND_ROUTES : [];
    for (const [from, to] of land) {
      const a = this.points.find(point => point.id === from);
      const b = this.points.find(point => point.id === to);
      if (a && b) {
        const p = this.position(a), q = this.position(b);
        routes.lineStyle(3, GOLD, 0.85).lineBetween(p.x, p.y, q.x, q.y);
      }
    }
    const harbors = this.view.harbors ?? [];
    harbors.forEach((source, index) => {
      const a = this.position(source);
      this.canvas.add(this.label(a.x, a.y, '⚓', '15px', '#68f5ed').setOrigin(0.5));
      for (const destination of harbors.slice(index + 1)) {
        if (!FerryService.destination(source.id, `sail:${destination.id}`, this.save.worldProgress.flags)) continue;
        const b = this.position(destination);
        for (let t = 0; t < 1; t += 0.08) {
          const end = Math.min(t + 0.04, 1);
          routes.lineStyle(2, CYAN, 0.65).lineBetween(
            Phaser.Math.Linear(a.x, b.x, t), Phaser.Math.Linear(a.y, b.y, t),
            Phaser.Math.Linear(a.x, b.x, end), Phaser.Math.Linear(a.y, b.y, end));
        }
      }
    });

    for (const point of this.points) {
      const { x, y } = this.position(point);
      const current = atlasContains(point, this.currentZone);
      const visited = this.save.worldProgress.unlockedZones.some(zone => atlasContains(point, zone));
      if (current) {
        this.canvas.add(this.add.circle(x, y, 13, CYAN, 0.24).setStrokeStyle(2, CYAN));
        this.canvas.add(this.add.circle(x, y, 5, CYAN).setStrokeStyle(2, 0x071a27));
      }
      if (!current) this.canvas.add(this.add.circle(x, y, 6, visited ? GOLD : 0x496574).setStrokeStyle(2, 0x071a27));
      const label = this.label(x, y + 11, this.nameOf(point), '11px', current ? '#68f5ed' : '#f5ead5')
        .setOrigin(0.5, 0).setBackgroundColor('#102535').setPadding(4, 2);
      this.canvas.add(label);
    }
    this.selection = this.add.circle(0, 0, 12, 0, 0).setStrokeStyle(2, GOLD);
    this.canvas.add(this.selection);
  }

  private drawHud(): void {
    this.add.rectangle(480, 32, 960, 64, 0x0b202d).setDepth(2);
    this.add.rectangle(480, 500, 960, 82, 0x0b202d).setDepth(2);
    this.label(22, 12, 'ATLAS DE RUNATERRA', '21px', '#f4ce75').setDepth(3);
    this.label(23, 42, atlasAncestors(this.view.id).map(view => view.name).join('  ›  '), '12px', '#b6ccd3').setDepth(3);
    this.button(550, 32, 124, 'RUNATERRA', () => this.open('runeterra'));
    this.button(700, 32, 158, 'MI UBICACIÓN', () => this.locate());
    this.button(834, 32, 52, '−', () => this.zoomBy(-0.25));
    this.button(902, 32, 52, '+', () => this.zoomBy(0.25));
    this.status = this.label(24, 469, '', '18px', '#f4ce75').setDepth(3);
    this.detail = this.label(24, 502, '', '12px', '#c6dbe2').setDepth(3).setWordWrapWidth(520);
    this.actionLabel = this.button(705, 498, 150, 'RASTROS', () => this.openSelected());
    this.button(880, 498, 104, 'ATRÁS', () => this.back());
  }

  private label(x: number, y: number, text: string, size: string, color: string): Phaser.GameObjects.Text {
    return Ui960Kit.label(this, x, y, text, size, color, true);
  }

  private button(x: number, y: number, width: number, title: string, activate: () => void): Phaser.GameObjects.Text {
    const control = Ui960Kit.button(this, x, y, width, 38, title, activate, { fontSize: '12px' });
    control.button.setDepth(4);
    return control.label.setDepth(5);
  }

  private bindInput(): void {
    const inMap = (y: number): boolean => y >= VIEWPORT.top && y <= VIEWPORT.bottom;
    const down = (pointer: Phaser.Input.Pointer): void => {
      if (this.overlay || this.gesture || !inMap(pointer.y)) return;
      this.gesture = { id: pointer.id, startX: pointer.x, startY: pointer.y, x: pointer.x, y: pointer.y, moved: false };
    };
    const move = (pointer: Phaser.Input.Pointer): void => {
      const drag = this.gesture;
      if (!drag || drag.id !== pointer.id || !pointer.isDown) return;
      if (!drag.moved && Math.hypot(pointer.x - drag.startX, pointer.y - drag.startY) < POINTER_THRESHOLD) return;
      drag.moved = true;
      this.canvas.setPosition(this.canvas.x + pointer.x - drag.x, this.canvas.y + pointer.y - drag.y);
      drag.x = pointer.x;
      drag.y = pointer.y;
      this.clampCanvas();
    };
    const up = (pointer: Phaser.Input.Pointer): void => {
      const drag = this.gesture;
      if (!drag || drag.id !== pointer.id) return;
      this.gesture = undefined;
      if (drag.moved || !inMap(pointer.y)) return;
      let nearest: AtlasPoint | undefined;
      let nearestDistance = 28;
      for (const point of this.points) {
        const pos = this.position(point);
        const distance = Math.hypot(pointer.x - this.canvas.x - pos.x * this.canvas.scaleX,
          pointer.y - this.canvas.y - pos.y * this.canvas.scaleY);
        if (distance < nearestDistance) {
          nearest = point;
          nearestDistance = distance;
        }
      }
      if (!nearest) return;
      if (nearest === this.selected) this.openSelected();
      else {
        this.selected = nearest;
        this.refreshSelection();
      }
    };
    const leave = (): void => { this.gesture = undefined; };
    const wheel = (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number): void => {
      if (!this.overlay && inMap(pointer.y) && dy) this.zoomBy(dy < 0 ? 0.2 : -0.2, pointer.x, pointer.y);
    };
    const keys = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') this.back();
      else if (this.overlay) return;
      else if (event.key === 'Enter' && !event.repeat) this.openSelected();
      else if (event.key.toLowerCase() === 'r' && !event.repeat) this.showSightings();
      else if (event.key === '+' || event.key === '=') this.zoomBy(0.25);
      else if (event.key === '-') this.zoomBy(-0.25);
      else if (event.key.startsWith('Arrow')) this.cycle(event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
    };
    this.input.on('pointerdown', down).on('pointermove', move).on('pointerup', up).on('pointerupoutside', leave).on('gameout', leave).on('wheel', wheel);
    this.input.keyboard?.on('keydown', keys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', down).off('pointermove', move).off('pointerup', up).off('pointerupoutside', leave).off('gameout', leave).off('wheel', wheel);
      this.input.keyboard?.off('keydown', keys);
    });
  }

  private initialZoom(): number {
    return this.view.parent === 'runeterra' ? REGION_ZOOM : DEFAULT_ZOOM;
  }

  private clampCanvas(): void {
    const scale = this.canvas.scaleX;
    const xLimit = Math.max(0, (this.size.width * scale - 960) / 2);
    const yLimit = Math.max(0, (this.size.height * scale - (VIEWPORT.bottom - VIEWPORT.top)) / 2);
    this.canvas.setPosition(
      Phaser.Math.Clamp(this.canvas.x, CENTER.x - xLimit, CENTER.x + xLimit),
      Phaser.Math.Clamp(this.canvas.y, CENTER.y - yLimit, CENTER.y + yLimit));
  }

  private center(point: AtlasPoint, zoom = this.canvas.scaleX): void {
    const pos = this.position(point);
    this.canvas.setScale(zoom).setPosition(CENTER.x - pos.x * zoom, CENTER.y - pos.y * zoom);
    this.clampCanvas();
  }

  private zoomBy(delta: number, x = CENTER.x, y = CENTER.y): void {
    const fit = Math.min(960 / this.size.width, (VIEWPORT.bottom - VIEWPORT.top) / this.size.height);
    const zoom = Phaser.Math.Clamp(this.canvas.scaleX + delta, Math.min(fit, 0.55), 2.75);
    const ratio = zoom / this.canvas.scaleX;
    this.canvas.setPosition(x - (x - this.canvas.x) * ratio, y - (y - this.canvas.y) * ratio).setScale(zoom);
    this.clampCanvas();
  }

  private refreshSelection(): void {
    const { x, y } = this.position(this.selected);
    this.selection.setPosition(x, y);
    this.status.setText(`${this.nameOf(this.selected)}${atlasContains(this.selected, this.currentZone) ? '  ·  Estás aquí' : ''}`);
    this.actionLabel.setText(this.selected.child ? 'ABRIR' : this.view.regionId ? 'RASTROS' : 'PENDIENTE');
    this.detail.setText('Arrastra para explorar · + / − zoom · Toca una zona para seleccionarla');
  }

  private showSightings(): void {
    if (this.overlay || !this.view.regionId || this.selected.child) return;
    const definition = this.definitions.find(point => point.id === this.selected.id);
    const maps = DataRegistry.maps().filter(map =>
      map.id === definition?.targetMapId || (map.regionId === this.view.regionId && map.zoneId === this.selected.id));
    this.overlay = showEncounterList(this, `Rastros de Ecos · ${this.nameOf(this.selected)}`,
      this.guide.sightings(maps, this.save), 'Sin encuentros salvajes configurados en esta zona.', () => this.closeSightings());
  }

  private closeSightings(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  private openSelected(): void {
    const { child } = this.selected;
    if (child) {
      if (this.view.id !== 'runeterra' || child === this.location().region || this.save.worldProgress.unlockedRegions.includes(child)
        || DataRegistry.worldRegion(child).enabled) this.open(child);
    } else this.showSightings();
  }

  private open(id: string, selectedId?: string): void { this.scene.restart({ viewId: id, selectedId }); }

  private locate(): void {
    const current = this.location();
    const point = this.view.regionId === current.region ? this.points.find(p => atlasContains(p, current.zone)) : undefined;
    if (!point) {
      if (this.view.id !== current.viewId) this.open(current.viewId, current.zone);
      return;
    }
    this.selected = point;
    this.refreshSelection();
    this.center(point, this.initialZoom());
  }

  private back(): void {
    if (this.overlay) this.closeSightings();
    else if (this.view.parent) this.open(this.view.parent);
    else this.scene.start('MenuScene');
  }

  private cycle(delta: number): void {
    const index = this.points.indexOf(this.selected);
    this.selected = this.points[Phaser.Math.Wrap(index + delta, 0, this.points.length)];
    this.refreshSelection();
    this.center(this.selected);
  }

  update(): void {
    if (this.overlay) {
      ConsoleFocusController.updateScene(this, () => this.closeSightings());
      return;
    }
    ConsoleFocusController.hideScene(this);
    const direction = ConsoleInput.consumeDirection();
    if (direction) this.cycle(direction === 'left' || direction === 'up' ? -1 : 1);
    if (ConsoleInput.consumeA()) this.openSelected();
    if (ConsoleInput.consumeB()) this.back();
  }
}
