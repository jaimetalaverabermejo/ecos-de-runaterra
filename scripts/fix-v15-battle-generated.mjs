import fs from 'node:fs';

const path = 'src/scenes/BattleScene.ts';
let text = fs.readFileSync(path, 'utf8');

const circle = "const circle = this.add.circle(x, y, 7, UI.colors.panelRaised, 0.98)";
const rect = "const circle = this.add.rectangle(x, y, 14, 14, UI.colors.panelRaised, 0.98)";
if (text.includes(circle)) text = text.replace(circle, rect);

const premature = "      this.finishActorTurn(actor, application.selfAppliedIds, Boolean(transformed));\n      return;";
const normalMiss = "      this.finishActorTurn(actor, application.selfAppliedIds);\n      return;";
if (text.includes(premature)) text = text.replace(premature, normalMiss);

const finalNormal = "    this.finishActorTurn(actor, application.selfAppliedIds);\n  }\n\n  private async beginActorTurn";
const finalTransform = "    this.finishActorTurn(actor, application.selfAppliedIds, Boolean(transformed));\n  }\n\n  private async beginActorTurn";
if (!text.includes(finalTransform)) {
  if (!text.includes(finalNormal)) throw new Error('No se encontró cierre normal de performAction');
  text = text.replace(finalNormal, finalTransform);
}

fs.writeFileSync(path, text);
console.log('v15 generated BattleScene typing fixes applied');
