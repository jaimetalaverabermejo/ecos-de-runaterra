import assert from 'node:assert/strict';
import { WildEscapeService } from '../src/systems/encounters/WildEscapeService.ts';
const definition = { wildBehavior: { fleeChance: 0.7, linkChanceMultiplier: 0.75 } };
const status = (kind, remainingTurns = 1) => ({ kind, remainingTurns });
assert(WildEscapeService.wantsToFlee(definition, [], false, 0.69));
assert(!WildEscapeService.wantsToFlee(definition, [], false, 0.7));
assert(!WildEscapeService.wantsToFlee(definition, [], true, 0));
assert(!WildEscapeService.wantsToFlee({}, [], false, 0));
for (const kind of ['root', 'stun', 'airborne', 'sleep', 'banish', 'polymorph', 'recharge', 'charm', 'taunt', 'trap']) {
  assert(!WildEscapeService.wantsToFlee(definition, [status(kind)], false, 0), kind);
  assert(WildEscapeService.wantsToFlee(definition, [status(kind, 0)], false, 0), `${kind} expired`);
}
for (const kind of ['poison', 'burn', 'blind', 'stat']) assert(WildEscapeService.wantsToFlee(definition, [status(kind)], false, 0), kind);
console.log('Wild escape chance, active restraints, expiration and trainer-battle immunity validated.');
