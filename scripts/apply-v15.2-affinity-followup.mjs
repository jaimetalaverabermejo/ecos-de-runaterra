import fs from 'node:fs';

const path = 'src/scenes/BattleScene.ts';
let text = fs.readFileSync(path, 'utf8');
const from = "      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.syncCombatantVisual('enemy', true);\n    }\n  }";
const to = "      this.wildSprite.setTexture(this.wildBattleTexture(champion.championId, this.currentFormId(champion)));\n      this.syncCombatantVisual('enemy', true);\n      this.rebuildActions();\n    }\n  }";
if (!text.includes(to)) {
  if (!text.includes(from)) throw new Error('No se encontró syncFormVisualAndHp enemigo');
  text = text.replace(from, to);
  fs.writeFileSync(path, text);
}
console.log('v15.2 affinity follow-up applied');
