export type ConsoleDirection = 'left' | 'right' | 'up' | 'down' | 'none';
export type ConsoleAction = 'a' | 'b' | 'menu';

export class ConsoleInput {
  private static initialized = false;
  private static heldDirection: ConsoleDirection = 'none';
  private static directionQueue: Array<Exclude<ConsoleDirection, 'none'>> = [];
  private static actionQueue: ConsoleAction[] = [];
  private static cleanups: Array<() => void> = [];

  static initialize(): void {
    if (this.initialized || typeof document === 'undefined') return;
    this.initialized = true;

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
        button.classList.add('is-pressed');
      };
      const release = (event: Event): void => {
        event.preventDefault();
        button.classList.remove('is-pressed');
      };

      listen(button, 'pointerdown', press);
      listen(button, 'pointerup', release);
      listen(button, 'pointercancel', release);
      listen(button, 'pointerleave', release);
    }

    listen(window, 'pointerup', releaseDirection);
    listen(window, 'blur', releaseDirection);
  }

  static get direction(): ConsoleDirection {
    return this.heldDirection;
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

  static clearTransient(): void {
    this.directionQueue.length = 0;
    this.actionQueue.length = 0;
  }

  private static consumeAction(action: ConsoleAction): boolean {
    const index = this.actionQueue.indexOf(action);
    if (index < 0) return false;
    this.actionQueue.splice(index, 1);
    return true;
  }
}
