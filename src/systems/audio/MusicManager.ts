import { MUSIC, type MusicId } from './MusicCatalog';

/** One streamed music player across scenes; combat SFX stay in Phaser. */
class MusicPlayer {
  private audio?: HTMLAudioElement;
  private id?: MusicId;
  private fade?: number;
  private muted = false;
  private readonly volume = 0.32;
  private cinematicLevel = 1;

  initialize(): void {
    try { this.muted = localStorage.getItem('ecos.music.muted') === 'true'; } catch { /* Storage may be unavailable. */ }
    const unlock = (): void => { this.tryPlay(); };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.audio?.pause();
      else this.tryPlay();
    });
  }

  play(id: MusicId): void {
    if (id === this.id) { this.tryPlay(); return; }
    this.id = id;
    if (this.fade !== undefined) window.clearInterval(this.fade);
    const previous = this.audio;
    const next = new Audio(MUSIC[id]);
    next.loop = true;
    next.preload = 'auto';
    next.volume = 0;
    next.muted = this.muted;
    next.addEventListener('error', () => console.warn(`No se pudo cargar la música: ${id}`), { once: true });
    this.audio = next;
    // Dispose immediately so fast scene changes cannot leave orphaned players.
    previous?.pause();
    if (previous) { previous.removeAttribute('src'); previous.load(); }
    const started = performance.now();
    this.fade = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / 650);
      next.volume = this.volume * this.cinematicLevel * progress;
      if (progress >= 1) { window.clearInterval(this.fade); this.fade = undefined; }
    }, 40);
    this.tryPlay();
  }

  setCinematicLevel(level: number): void {
    this.cinematicLevel = Math.max(0, Math.min(1, level));
    if (this.audio) this.audio.volume = this.volume * this.cinematicLevel;
  }

  isMuted(): boolean { return this.muted; }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.audio) this.audio.muted = this.muted;
    try { localStorage.setItem('ecos.music.muted', String(this.muted)); } catch { /* Optional preference persistence. */ }
    this.tryPlay();
  }

  private tryPlay(): void {
    if (!this.audio || !this.audio.paused || this.muted || document.hidden) return;
    // Autoplay refusal is expected until the first user gesture.
    void this.audio.play().catch(() => undefined);
  }
}

export const MusicManager = new MusicPlayer();
