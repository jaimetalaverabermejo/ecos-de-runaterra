/** Story gates overlay authored portals without changing Jaime's map geometry. */
export class MelDiplomacyService {
  static crossingAllowed(flags: string[]): boolean {
    return flags.includes('story:spirit-rune-carried')
      && flags.includes('story:ionia-complete')
      && flags.includes('story:mel-passage-accepted');
  }

  static beforeTransition(from: string, to: string, flags: string[]): string | undefined {
    const has = (id: string) => flags.includes(`story:${id}`);
    if (from === 'jo20_trial_shrine' && to === 'jo20_trial_shrine_interior_01'
      && ['akali', 'shen', 'zed'].every(c => has(`orders-${c}-trusted`))
      && !has('spirit-rune-carried') && !has('orders-council-ready') && !has('mel-embassy-met')) return 'mel-embassy';
    if (from === 'jo05_placidium' && to === 'jo05_placidium_house_04'
      && has('orders-siege-warning') && !has('ionia-complete') && !has('mel-navori-warned')) return has('mel-embassy-met') ? 'mel-navori-warning' : 'mel-navori-warning-late';
    if (from === 'NO05_Capital_Exterior' && to === 'NO06_Bastion_Interior'
      && !has('mel-court-access')) return 'mel-bastion-entry';
    return undefined;
  }
}
