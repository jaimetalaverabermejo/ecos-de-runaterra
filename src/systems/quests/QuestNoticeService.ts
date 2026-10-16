export interface QuestNoticeState {
  signature: string;
  pending: boolean;
  until: number;
}

/** Survives map changes; only progress, a new objective or menu return renews it. */
export class QuestNoticeService {
  static readonly durationMs = 6500;

  static update(state: QuestNoticeState, signature: string, now: number, blocked: boolean): boolean {
    if (state.signature !== signature) {
      state.signature = signature;
      state.pending = true;
    }
    if (state.pending && !blocked) {
      state.until = now + this.durationMs;
      state.pending = false;
    }
    return !blocked && now < state.until;
  }
}
