import type { CombatAction } from './BattleEngine';

/** Only the optional We'hle lesson uses this rhythm. Wild/Showdown AI is unchanged. */
export class LeeSinTrial {
  static intent(turnsCompleted: number, skillIds: readonly string[], usableIds: readonly string[]): { action: CombatAction; cue: string } {
    const phase = turnsCompleted % 4;
    const slot = [0, 1, 2, -1][phase];
    const skillId = slot >= 0 ? skillIds[slot] : undefined;
    if (!skillId || !usableIds.includes(skillId)) {
      return { action: { type: 'wait' }, cue: 'LEE SIN · PAUSA\nRecompone su ritmo.\nAtaca o recupérate.' };
    }
    const cues = [
      'LEE SIN · IMPULSO\nPrepara un golpe.\nProtege a tu Eco.',
      'LEE SIN · GUARDIA\nPrepara su defensa.\nRefuerza tu posición.',
      'LEE SIN · BARRIDO\nPrepara Tempestad.\nCuida tus puntos de vida.'
    ];
    return { action: { type: 'skill', skillId }, cue: cues[phase] };
  }
}
