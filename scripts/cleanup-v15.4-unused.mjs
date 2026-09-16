import fs from 'node:fs';
const path = 'src/scenes/BattleScene.ts';
let text = fs.readFileSync(path, 'utf8');
function cut(re, label) {
  if (!re.test(text)) throw new Error(`No se encontró ${label}`);
  text = text.replace(re, '');
}
cut(/  private createActionButton\([\s\S]*?\n  \}\n\n(?=  private shortSkillName)/, 'createActionButton');
cut(/  private shortSkillName\([\s\S]*?\n  \}\n\n(?=  private async handleCombatAction)/, 'shortSkillName');
cut(/  private affinityLabelFor\([\s\S]*?\n  \}\n\n(?=  private executionThresholdFor)/, 'affinityLabelFor');
fs.writeFileSync(path, text);
console.log('v15.4: helpers obsoletos eliminados');
