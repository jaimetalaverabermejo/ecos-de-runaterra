import Phaser from 'phaser';
import { ConsoleInput, type ConsoleDirection } from './ConsoleInput';

export interface ConsoleFocusOption {
  x: number; y: number; activate: () => void; enabled?: () => boolean;
  info?: () => void;
}
type Target = ConsoleFocusOption & { bounds?: Phaser.Geom.Rectangle };

/** Shares pointer actions: every visible control is reachable with the pad. */
export class ConsoleFocusController {
  private static controllers = new WeakMap<Phaser.Scene, ConsoleFocusController>();
  private index = 0;
  private targets: Target[] = [];
  private readonly cursor: Phaser.GameObjects.Graphics;
  private readonly infoHint: Phaser.GameObjects.Text;
  private readonly memoryKey: string;
  private anchor?: { x: number; y: number };

  static hideScene(scene: Phaser.Scene): void { const controller = this.controllers.get(scene); controller?.cursor.clear(); controller?.infoHint.setVisible(false); }

  static updateScene(scene: Phaser.Scene, onBack?: () => void): void {
    let controller = this.controllers.get(scene);
    if (!controller) {
      controller = new ConsoleFocusController(scene, [], onBack);
      this.controllers.set(scene, controller);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.controllers.delete(scene));
    }
    controller.onBack = onBack;
    controller.update();
  }

  constructor(private readonly scene: Phaser.Scene, private readonly options: ConsoleFocusOption[], private onBack?: () => void) {
    ConsoleInput.clearTransient();
    this.memoryKey = `console.focus.${scene.scene.key}`;
    this.anchor = scene.registry.get(this.memoryKey);
    this.cursor = scene.add.graphics().setDepth(30000).setName('console-focus');
    this.infoHint = scene.add.text(480, 538, '△ / X (Switch) / Y (Xbox) / I · INFORMACIÓN', { fontSize: '9px', color: '#d7edf5' }).setOrigin(0.5, 1).setDepth(30000).setVisible(false);
    this.collect(); this.refresh();
    const infoKey = (): void => { this.collect(); this.targets[this.index]?.info?.(); };
    scene.input.keyboard?.on('keydown-I', infoKey);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.input.keyboard?.off('keydown-I', infoKey));
  }

  update(): void {
    this.collect();
    const direction = ConsoleInput.consumeDirection();
    if (direction) this.move(direction);
    this.refresh();
    if (ConsoleInput.consumeInfo()) { this.targets[this.index]?.info?.(); return; }
    if (ConsoleInput.consumeB()) { this.onBack?.(); return; }
    if (ConsoleInput.consumeA()) {
      const target = this.targets[this.index];
      if (target && this.isEnabled(target)) { this.remember(target); target.activate(); }
    }
  }

  setIndex(index: number): void {
    this.collect();
    this.index = Phaser.Math.Clamp(index, 0, Math.max(0, this.targets.length - 1));
    if (this.targets[this.index]) this.remember(this.targets[this.index]);
    this.refresh();
  }

  private collect(): void {
    const entries: Array<{ object: Phaser.GameObjects.GameObject; depth: number }> = [];
    const visit = (object: Phaser.GameObjects.GameObject, depth: number): void => {
      const display = object as Phaser.GameObjects.GameObject & { visible?: boolean; alpha?: number; depth?: number };
      if (!object.active || display.visible === false || display.alpha === 0) return;
      const effectiveDepth = Math.max(depth, display.depth ?? 0);
      if (object.input?.enabled && object.listenerCount(Phaser.Input.Events.POINTER_UP) > 0 && !object.getData('console.skipFocus')) entries.push({ object, depth: effectiveDepth });
      if (object instanceof Phaser.GameObjects.Container) object.list.forEach(child => visit(child, effectiveDepth));
    };
    this.scene.children.list.forEach(object => visit(object, 0));
    const modalDepth = Math.max(0, ...entries.filter(entry => entry.depth >= 10000).map(entry => entry.depth));
    this.targets = entries.filter(entry => !modalDepth || entry.depth === modalDepth).map(({ object }) => {
      const bounds = (object as Phaser.GameObjects.Image).getBounds();
      return { x: bounds.centerX, y: bounds.centerY, bounds,
        info: object.getData('console.info'),
        enabled: () => object.active && Boolean(object.input?.enabled),
        activate: () => {
          const pointer = {
            x: bounds.centerX, y: bounds.centerY, worldX: bounds.centerX, worldY: bounds.centerY,
            event: { stopPropagation() {}, preventDefault() {} }
          };
          object.emit(Phaser.Input.Events.POINTER_DOWN, pointer);
          if (object.active) object.emit(Phaser.Input.Events.POINTER_UP, pointer);
        } };
    });
    if (!this.targets.length) this.targets = this.options.filter(option => this.isEnabled(option));
    if (this.anchor && this.targets.length) {
      this.index = this.targets.reduce((best, target, index) =>
        Math.hypot(target.x - this.anchor!.x, target.y - this.anchor!.y) < Math.hypot(this.targets[best].x - this.anchor!.x, this.targets[best].y - this.anchor!.y) ? index : best, 0);
    } else this.index = Math.min(this.index, Math.max(0, this.targets.length - 1));
  }

  private move(direction: Exclude<ConsoleDirection, 'none'>): void {
    const current = this.targets[this.index];
    if (!current) return;
    const horizontal = direction === 'left' || direction === 'right';
    const sign = direction === 'left' || direction === 'up' ? -1 : 1;
    const candidates = this.targets.map((target, index) => ({ index,
      forward: (horizontal ? target.x - current.x : target.y - current.y) * sign,
      cross: Math.abs(horizontal ? target.y - current.y : target.x - current.x) })).filter(entry => entry.index !== this.index);
    const ahead = candidates.filter(entry => entry.forward > 2);
    const pool = ahead.length ? ahead : candidates;
    pool.sort((a, b) => (a.forward + a.cross * 3) - (b.forward + b.cross * 3));
    if (pool[0]) { this.index = pool[0].index; this.remember(this.targets[this.index]); }
  }

  private remember(target: Target): void {
    this.anchor = { x: target.x, y: target.y };
    this.scene.registry.set(this.memoryKey, this.anchor);
  }

  private refresh(): void {
    this.cursor.clear();
    const target = this.targets[this.index];
    this.infoHint.setVisible(Boolean(target?.info));
    if (!target) return;
    this.cursor.lineStyle(2, 0xf2d76d, 0.95);
    if (target.bounds) this.cursor.strokeRoundedRect(target.bounds.x - 3, target.bounds.y - 3, target.bounds.width + 6, target.bounds.height + 6, 5);
    else this.cursor.strokeRect(target.x - 7, target.y - 7, 14, 14);
  }

  private isEnabled(option: ConsoleFocusOption): boolean { return option.enabled?.() ?? true; }
}
