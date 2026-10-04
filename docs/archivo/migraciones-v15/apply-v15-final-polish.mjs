import fs from 'node:fs';

const path = 'src/scenes/BattleScene.ts';
let text = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`No se encontró ${label}`);
  text = text.replace(from, to);
}

replaceOnce(
  "const healed = Math.min(passiveHeal, BattleEngine.statsFor(attacker).hp - this.playerHp);",
  "const healed = Math.min(passiveHeal, this.statsForChampion(attacker).hp - this.playerHp);",
  'curación pasiva consciente de forma'
);

replaceOnce(
  "      BattleEngine.statsFor(this.wildChampion).hp,\n      statusMultiplier",
  "      this.statsForChampion(this.wildChampion).hp,\n      statusMultiplier",
  'vinculación consciente de forma'
);

replaceOnce(
  "      this.setMessage('Elige tu siguiente acción.');\n    }\n  }\n\n  private flee(): void {",
  "      this.setMessage(this.idlePrompt());\n    }\n  }\n\n  private flee(): void {",
  'prompt tras respuesta enemiga'
);

replaceOnce(
  "    const hasExecution = BattleEngine.unlockedSkills(champion)\n      .some((skill) => skill.effects.some((effect) => effect.handlerId === 'execute-low-hp'));",
  "    const hasExecution = BattleEngine.unlockedSkills(champion, this.currentFormId(champion))\n      .some((skill) => skill.effects.some((effect) => effect.handlerId === 'execute-low-hp'));",
  'umbral de ejecución consciente de forma'
);

fs.writeFileSync(path, text);
console.log('v15 final polish applied');
