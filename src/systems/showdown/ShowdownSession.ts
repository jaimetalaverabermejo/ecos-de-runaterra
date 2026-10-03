export type ShowdownActiveSlots = 1 | 2;

export interface ShowdownConfig {
  activeSlots: ShowdownActiveSlots;
  teamSize: number;
  mastery: number;
}

export const DEFAULT_SHOWDOWN_CONFIG: ShowdownConfig = {
  activeSlots: 1,
  teamSize: 3,
  mastery: 8
};

export function normalizeShowdownConfig(value?: Partial<ShowdownConfig>): ShowdownConfig {
  const activeSlots: ShowdownActiveSlots = value?.activeSlots === 2 ? 2 : 1;
  const requestedTeamSize = Number.isFinite(value?.teamSize) ? Math.round(value?.teamSize as number) : DEFAULT_SHOWDOWN_CONFIG.teamSize;
  const teamSize = Math.max(activeSlots, Math.min(5, requestedTeamSize));
  const requestedMastery = Number.isFinite(value?.mastery) ? Math.round(value?.mastery as number) : DEFAULT_SHOWDOWN_CONFIG.mastery;
  const mastery = Math.max(1, Math.min(18, requestedMastery));
  return { activeSlots, teamSize, mastery };
}

export function showdownFormatLabel(config: ShowdownConfig): string {
  return `${config.activeSlots}v${config.activeSlots} · EQUIPOS DE ${config.teamSize} · M${config.mastery}`;
}
