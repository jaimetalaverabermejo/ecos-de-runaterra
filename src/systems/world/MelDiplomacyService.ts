/** Story gates overlay authored portals without changing Jaime's map geometry. */
export class MelDiplomacyService {
  static crossingAllowed(flags: string[]): boolean {
    return flags.includes('story:spirit-rune-carried')
      && flags.includes('story:ionia-complete')
      && flags.includes('story:mel-passage-accepted');
  }

  static bastionEntryDialogue(flags: string[]): string {
    return flags.includes('story:noxus-relocation-found') || flags.includes('story:mel-court-access')
      ? 'mel-bastion-entry' : 'noxus-bastion-evidence';
  }

  static cityCheckpoint(from: string, to: string, flags: string[], visitedZones: string[]): string | undefined {
    if (from === to || visitedZones.includes(to)) return undefined;
    const checkpoints: Record<string, { routes: string[]; name: string; proof: string }> = {
      NO03_Basilich: { routes: ['NO01_Puerto', 'NO02_Cruce_Caravanas'], name: 'basilich', proof: 'story:mel-noxus-arrived' },
      NO04_Suministros: { routes: ['NO02_Cruce_Caravanas', 'NO05_Capital_Exterior', 'NO07_Memorial_Sion'], name: 'suministros', proof: 'story:noxus-sareth-receipt' }
    };
    const checkpoint = checkpoints[to];
    if (!checkpoint?.routes.includes(from) || flags.includes(`noxus:pase-${checkpoint.name}`)) return undefined;
    return `noxus-control-${checkpoint.name}${flags.includes(checkpoint.proof) ? '' : '-cerrado'}`;
  }

  static beforeTransition(from: string, to: string, flags: string[]): string | undefined {
    const has = (id: string) => flags.includes(`story:${id}`);
    if (from === 'jo20_trial_shrine' && to === 'jo20_trial_shrine_interior_01'
      && ['akali', 'shen', 'zed'].every(c => has(`orders-${c}-trusted`))
      && !has('spirit-rune-carried') && !has('orders-council-ready') && !has('mel-embassy-met')) return 'mel-embassy';
    if (from === 'jo05_placidium' && to === 'jo05_placidium_house_04'
      && has('orders-siege-warning') && !has('ionia-complete') && !has('mel-navori-warned')) return has('mel-embassy-met') ? 'mel-navori-warning' : 'mel-navori-warning-late';
    if (from === 'NO05_Capital_Exterior' && to === 'NO06_Bastion_Interior'
      && !has('mel-court-access')) return this.bastionEntryDialogue(flags);
    return undefined;
  }
}
