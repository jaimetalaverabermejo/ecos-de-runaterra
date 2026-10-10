import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const profiles = json('src/ui/combat/skill-animation-profiles.json');
const allowed = new Set([...Array.from({length:14},(_,i)=>`P${i+1}`), ...Array.from({length:5},(_,i)=>`S${i+1}`)]);
const ids = new Set();
const champions = [];
let active = 0, passive = 0;
for (const championId of readdirSync('src/contenido/campeones')) {
  const path = `src/contenido/campeones/${championId}/habilidades.json`;
  if (!existsSync(path)) continue;
  champions.push(championId);
  for (const skill of json(path)) {
    assert(!ids.has(skill.id), `Duplicate skill ${skill.id}`);
    ids.add(skill.id);
    const profile = profiles[skill.id];
    assert(profile, `Missing explicit animation profile: ${skill.id}`);
    assert.equal(profile.championId, championId, `${skill.id}: incorrect owner`);
    assert.equal(profile.slot, skill.ranura, `${skill.id}: incorrect slot`);
    assert(allowed.has(profile.family), `${skill.id}: unknown animation family ${profile.family}`);
    assert(typeof profile.weapon === 'string' && profile.weapon.length > 0, `${skill.id}: missing weapon style`);
    if (skill.ranura === 'pasiva') passive++; else active++;
  }
}
for (const id of Object.keys(profiles)) assert(ids.has(id), `Orphan animation profile: ${id}`);
const source = readFileSync('src/ui/combat/CombatAnimationProfiles.ts', 'utf8');
const start = source.indexOf('export const BASIC_ANIMATION_PROFILES');
const basicBlock = source.slice(start, source.indexOf('\n};', start));
const basics = new Set([...basicBlock.matchAll(/(?:'([^']+)'|([a-z][a-z0-9-]*)):\s*\['(?:P|S)\d+'/g)].map(match=>match[1]??match[2]));
for (const champion of champions) assert(basics.has(champion), `Missing basic attack profile: ${champion}`);
console.log(`Validated ${active} active profiles, ${passive} passive definitions and ${champions.length} champion basic attacks.`);
