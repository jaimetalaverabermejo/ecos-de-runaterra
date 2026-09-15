import fs from 'node:fs';

const path = 'src/systems/combat/StatusEngine.ts';
let text = fs.readFileSync(path, 'utf8');
const from = "      if (statuses[i].remainingTurns <= 0 || (statuses[i].kind === 'shield' && statuses[i].power <= 0)) {\n        statuses.splice(i, 1);\n      }";
const to = "      const expired = statuses[i].remainingTurns <= 0 && statuses[i].kind !== 'explosive';\n      if (expired || (statuses[i].kind === 'shield' && statuses[i].power <= 0)) {\n        statuses.splice(i, 1);\n      }";
if (!text.includes(to)) {
  if (!text.includes(from)) throw new Error('No se encontró limpieza de estados');
  text = text.replace(from, to);
}
fs.writeFileSync(path, text);
console.log('v15 delayed explosive status fix applied');
