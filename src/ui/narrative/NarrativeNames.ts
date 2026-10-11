/** Keep roles in prose, not in the small speaker plaque. */
export function shortSpeakerName(speaker: string): string {
  return (speaker.trim().split(/\s*[,·]|\s+[—–]\s+/)[0] || '???').toUpperCase();
}

export function fitSpeakerName(name: string, width: number, measure: (text: string) => number): string {
  if (measure(name) <= width) return name;
  let shortened = name;
  while (shortened.length > 1 && measure(`${shortened}…`) > width) shortened = shortened.slice(0, -1);
  return `${shortened.trimEnd()}…`;
}
