import { GamepadController, type PadSample } from './GamepadController';
export type ConsoleDirection = 'left' | 'right' | 'up' | 'down' | 'none';
export type ConsoleAction = 'a' | 'b' | 'menu' | 'info';

export class ConsoleInput {
  private static initialized = false;
  private static heldDirection: ConsoleDirection = 'none';
  private static directionQueue: Array<Exclude<ConsoleDirection, 'none'>> = [];
  private static actionQueue: ConsoleAction[] = [];
  private static padActions: ConsoleAction[] = [];
  private static heldActions = new Set<ConsoleAction>();
  private static pad: PadSample = {direction:'none',a:false,b:false,menu:false};
  private static cleanups: Array<() => void> = [];

  static get touchControl(): 'joystick' | 'dpad' {
    return document.body.dataset.touchControl === 'dpad' ? 'dpad' : 'joystick';
  }

  static toggleTouchControl(): void {
    const mode = this.touchControl === 'joystick' ? 'dpad' : 'joystick';
    document.body.dataset.touchControl = mode;
    this.heldDirection = 'none';
    this.directionQueue.length = 0;
    window.dispatchEvent(new Event('ecos-touch-control-change'));
    try { localStorage.setItem('ecos.touch.control', mode); } catch { /* Session preference still works. */ }
  }

  static initialize(): void {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;
    try { document.body.dataset.touchControl = localStorage.getItem('ecos.touch.control') === 'dpad' ? 'dpad' : 'joystick'; }
    catch { document.body.dataset.touchControl = 'joystick'; }

    const directionButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-ecos-direction]')
    );
    const actionButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[data-ecos-action]')
    );

    const listen = (
      element: HTMLElement | Window,
      event: string,
      handler: EventListenerOrEventListenerObject
    ): void => {
      element.addEventListener(event, handler, { passive: false });
      this.cleanups.push(() => element.removeEventListener(event, handler));
    };

    const releaseDirection = (): void => {
      this.heldDirection = 'none';
      directionButtons.forEach((button) => button.classList.remove('is-pressed'));
    };

    for (const button of directionButtons) {
      const direction = button.dataset.ecosDirection as Exclude<ConsoleDirection, 'none'> | undefined;
      if (!direction) continue;

      const press = (event: Event): void => {
        event.preventDefault();
        this.heldDirection = direction;
        this.directionQueue.push(direction);
        if (this.directionQueue.length > 4) this.directionQueue.shift();
        button.classList.add('is-pressed');
      };
      const release = (event: Event): void => {
        event.preventDefault();
        if (this.heldDirection === direction) this.heldDirection = 'none';
        button.classList.remove('is-pressed');
      };

      listen(button, 'pointerdown', press);
      listen(button, 'pointerup', release);
      listen(button, 'pointercancel', release);
      listen(button, 'pointerleave', release);
    }

    for (const button of actionButtons) {
      const action = button.dataset.ecosAction as ConsoleAction | undefined;
      if (!action) continue;

      const press = (event: Event): void => {
        event.preventDefault();
        this.actionQueue.push(action);
        if (this.actionQueue.length > 6) this.actionQueue.shift();
        this.heldActions.add(action);
        button.classList.add('is-pressed');
      };
      const release = (event: Event): void => {
        event.preventDefault();
        this.heldActions.delete(action);
        button.classList.remove('is-pressed');
      };

      listen(button, 'pointerdown', press);
      listen(button, 'pointerup', release);
      listen(button, 'pointercancel', release);
      listen(button, 'pointerleave', release);
    }

    const joystick = document.querySelector<HTMLElement>('.console-joystick');
    if (joystick) {
      let pointerId: number | undefined;
      const reset = (): void => {
        const previous = pointerId;
        pointerId = undefined;
        if (previous !== undefined && joystick.hasPointerCapture(previous)) joystick.releasePointerCapture(previous);
        joystick.style.setProperty('--stick-x', '0px');
        joystick.style.setProperty('--stick-y', '0px');
        this.directionQueue.length = 0;
        releaseDirection();
      };
      const move = (event: PointerEvent): void => {
        const bounds = joystick.getBoundingClientRect();
        const dx = event.clientX - bounds.left - bounds.width / 2;
        const dy = event.clientY - bounds.top - bounds.height / 2;
        const distance = Math.hypot(dx, dy);
        const radius = bounds.width * 0.28;
        const scale = distance > radius ? radius / distance : 1;
        joystick.style.setProperty('--stick-x', `${dx * scale * joystick.offsetWidth / bounds.width}px`);
        joystick.style.setProperty('--stick-y', `${dy * scale * joystick.offsetHeight / bounds.height}px`);
        const direction: ConsoleDirection = distance < bounds.width * 0.10 ? 'none'
          : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (direction !== this.heldDirection) {
          this.directionQueue.length = 0;
          if (direction !== 'none') this.directionQueue.push(direction);
          this.heldDirection = direction;
        }
      };
      listen(joystick, 'pointerdown', (raw) => {
        const event = raw as PointerEvent;
        if (this.touchControl !== 'joystick' || pointerId !== undefined) return;
        event.preventDefault();
        pointerId = event.pointerId;
        joystick.setPointerCapture(pointerId);
        move(event);
      });
      listen(joystick, 'pointermove', (raw) => {
        const event = raw as PointerEvent;
        if (event.pointerId !== pointerId) return;
        event.preventDefault();
        move(event);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(joystick, name, (raw) => { if ((raw as PointerEvent).pointerId === pointerId) reset(); });
      }
      listen(window, 'blur', reset);
      listen(window, 'resize', reset);
      listen(window, 'ecos-touch-control-change', reset);
      const onVisibility = (): void => { if (document.hidden) reset(); };
      document.addEventListener('visibilitychange', onVisibility);
      this.cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
    }

    // Releasing an action finger must not stop a joystick held by another finger.
    listen(window, 'pointerup', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.console-joystick, [data-ecos-action]')) releaseDirection();
    });
    listen(window, 'blur', releaseDirection);
  }

  static get direction(): ConsoleDirection {
    return this.heldDirection !== 'none' ? this.heldDirection : this.pad.direction;
  }

  static pollGamepad(): void {
    const events = GamepadController.poll();
    this.pad = events.sample;
    if (events.direction) this.directionQueue.push(events.direction);
    // Unhandled pad buttons expire with the frame instead of leaking into the next scene.
    this.padActions = events.actions;
    if (this.directionQueue.length > 4) this.directionQueue.splice(0,this.directionQueue.length-4);
    if (this.actionQueue.length > 6) this.actionQueue.splice(0,this.actionQueue.length-6);
  }

  static consumeDirection(): Exclude<ConsoleDirection, 'none'> | undefined {
    return this.directionQueue.shift();
  }

  static consumeA(): boolean {
    return this.consumeAction('a');
  }

  static consumeB(): boolean {
    return this.consumeAction('b');
  }

  static consumeMenu(): boolean {
    return this.consumeAction('menu');
  }

  static consumeInfo(): boolean { return this.consumeAction('info'); }

  static isHeld(action: ConsoleAction): boolean {
    return this.heldActions.has(action) || Boolean(this.pad[action]);
  }

  static clearTransient(): void {
    this.directionQueue.length = 0;
    this.actionQueue.length = 0;
    this.padActions.length = 0;
    this.heldActions.clear();
  }

  private static consumeAction(action: ConsoleAction): boolean {
    const index = this.actionQueue.indexOf(action);
    if (index >= 0) { this.actionQueue.splice(index, 1); return true; }
    const padIndex = this.padActions.indexOf(action);
    if (padIndex < 0) return false;
    this.padActions.splice(padIndex, 1);
    return true;
  }
}
