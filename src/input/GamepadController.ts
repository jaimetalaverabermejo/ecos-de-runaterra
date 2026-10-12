export type PadControl = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'menu';
export type PadBinding = { type: 'button'; index: number } | { type: 'axis'; index: number; value: number; mode: 'analog' | 'hat' };
export type PadDirection = 'up' | 'down' | 'left' | 'right';
export type DirectionBindings = Record<PadDirection, PadBinding>;
export type PadProfile = Record<PadControl, PadBinding> & { secondaryDirections?: DirectionBindings };
export interface PadSample { direction: 'up' | 'down' | 'left' | 'right' | 'none'; a: boolean; b: boolean; menu: boolean; }
const STORAGE = 'ecos.controller-profiles.v1';
const controls: PadControl[] = ['up', 'down', 'left', 'right', 'a', 'b', 'menu'];
const directions: PadDirection[] = ['up', 'down', 'left', 'right'];
function validBinding(b: PadBinding | undefined): boolean {
  return Boolean(b && Number.isInteger(b.index) && b.index >= 0 && b.index < 128
    && (b.type === 'button' || (b.type === 'axis' && Number.isFinite(b.value) && Math.abs(b.value) <= 1 && ['analog', 'hat'].includes(b.mode))));
}
export class GamepadController {
  static suspended = false;
  private static profiles: Record<string, PadProfile> = {};
  private static loaded = false;
  private static previous: PadSample = { direction: 'none', a: false, b: false, menu: false };
  private static previousId = '';
  private static nextRepeat = 0;
  static connected(): Gamepad | undefined {
    try { return Array.from(navigator.getGamepads?.() ?? []).find((p): p is Gamepad => Boolean(p?.connected)); }
    catch { return undefined; }
  }
  private static key(pad: Gamepad): string { return `${pad.id}|${pad.mapping}`; }
  static profile(pad: Gamepad): PadProfile | undefined {
    if (!this.loaded) {
      this.loaded = true;
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE) ?? '{}');
        for (const [id, profile] of Object.entries(stored)) {
          if (profile && controls.every(c => validBinding((profile as PadProfile)[c]))) {
            const p = profile as PadProfile;
            if (p.secondaryDirections && !directions.every(c => validBinding(p.secondaryDirections?.[c]))) delete p.secondaryDirections;
            this.profiles[id] = p;
          }
        }
      } catch { /* Standard defaults remain available without storage. */ }
    }
    return this.profiles[this.key(pad)];
  }
  static save(pad: Gamepad, profile: PadProfile): boolean {
    this.profile(pad);
    profile = structuredClone(profile);
    for (const group of [profile, profile.secondaryDirections]) {
      if (!group) continue;
      const hatAxes = new Set(directions.map(c => group[c]).filter(b => b.type === 'axis').filter(b => {
        const others = directions.map(c => group[c]).filter((v): v is Extract<PadBinding,{type:'axis'}> => v.type === 'axis' && v.index === b.index);
        return new Set(others.map(v => v.value)).size >= 3 || others.some(v => v.mode === 'hat');
      }).map(b => b.index));
      for (const c of directions) {
        const b = group[c]; if (b.type !== 'axis') continue;
        if (hatAxes.has(b.index)) b.mode = 'hat'; else b.value = Math.sign(b.value);
      }
    }
    this.profiles[this.key(pad)] = profile;
    let persisted = false;
    try { localStorage.setItem(STORAGE, JSON.stringify(this.profiles)); persisted = true; } catch { /* Mapping still works for this session. */ }
    this.previous = this.sample(pad);
    return persisted;
  }
  static reset(pad: Gamepad): void {
    this.profile(pad); delete this.profiles[this.key(pad)];
    try { localStorage.setItem(STORAGE, JSON.stringify(this.profiles)); } catch { /* Reset still works for this session. */ }
    this.previous = this.sample(pad);
  }
  static active(pad: Gamepad, binding: PadBinding): boolean {
    if (binding.type === 'button') return Boolean(pad.buttons[binding.index]?.pressed || (pad.buttons[binding.index]?.value ?? 0) > 0.6);
    const value = pad.axes[binding.index];
    if (value === undefined || !Number.isFinite(value)) return false;
    if (Math.abs(value) > 1.01) return false;
    return binding.mode === 'hat' ? Math.abs(value - binding.value) < 0.12 : value * Math.sign(binding.value) > 0.3;
  }
  static sample(pad?: Gamepad): PadSample {
    if (!pad?.connected) return { direction: 'none', a: false, b: false, menu: false };
    const profile = this.profile(pad);
    if (!profile && pad.mapping !== 'standard') return this.sample();
    const buttons: PadProfile = {
      up: {type:'button', index:12}, down:{type:'button', index:13}, left:{type:'button', index:14}, right:{type:'button', index:15},
      a:{type:'button', index:0}, b:{type:'button', index:1}, menu:{type:'button', index:9}
    };
    const binding = profile ?? buttons;
    // Primary directions win conflicting input; either control works while the other is released.
    let direction = this.direction(pad, binding);
    if (direction === 'none' && profile?.secondaryDirections) direction = this.direction(pad, profile.secondaryDirections);
    if (!profile && pad.mapping === 'standard' && direction === 'none') {
      const x = pad.axes[0] ?? 0, y = pad.axes[1] ?? 0;
      if (Math.max(Math.abs(x), Math.abs(y)) > 0.3 && Math.max(Math.abs(x), Math.abs(y)) <= 1.01)
        direction = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left' : 'right') : (y < 0 ? 'up' : 'down');
    }
    return { direction, a:this.active(pad,binding.a), b:this.active(pad,binding.b), menu:this.active(pad,binding.menu) };
  }
  private static direction(pad: Gamepad, group: DirectionBindings): PadSample['direction'] {
    for (const c of directions) if (this.active(pad, group[c])) return c;
    const hats = directions.filter(c => group[c].type === 'axis' && (group[c] as Extract<PadBinding,{type:'axis'}>).mode === 'hat');
    const first = hats.length === 4 ? group[hats[0]] : undefined;
    if (first?.type === 'axis' && hats.every(c => group[c].type === 'axis' && group[c].index === first.index)) {
      const value = pad.axes[first.index];
      if (value !== undefined && Number.isFinite(value) && Math.abs(value) <= 1.01) {
        const values = hats.map(c => (group[c] as Extract<PadBinding,{type:'axis'}>).value);
        const period = (Math.max(...values)-Math.min(...values))*4/3;
        const distance = (c:PadDirection) => {const d=Math.abs((group[c] as Extract<PadBinding,{type:'axis'}>).value-value);return Math.min(d,Math.abs(period-d));};
        hats.sort((a,b)=>distance(a)-distance(b));return hats[0];
      }
    }
    return 'none';
  }
  static poll(pad = this.connected(), now = performance.now()): { sample: PadSample; direction?: Exclude<PadSample['direction'], 'none'>; actions: Array<'a'|'b'|'menu'> } {
    let sample = this.sample(pad);
    if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) sample = this.sample();
    const id = pad ? this.key(pad) : '';
    if (id !== this.previousId) { this.previous = this.sample(); this.previousId = id; this.nextRepeat = 0; }
    const actions = (['a','b','menu'] as const).filter(a => sample[a] && !this.previous[a]);
    let direction: Exclude<PadSample['direction'], 'none'> | undefined;
    if (sample.direction !== 'none' && (sample.direction !== this.previous.direction || now >= this.nextRepeat)) {
      direction = sample.direction;
      this.nextRepeat = now + (sample.direction === this.previous.direction ? 140 : 350);
    }
    this.previous = sample;
    return this.suspended ? {sample:this.sample(), actions:[]} : {sample,direction,actions};
  }
}
