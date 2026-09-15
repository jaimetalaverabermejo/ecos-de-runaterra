import fs from 'node:fs';

const path = 'src/scenes/WorldScene.ts';
let text = fs.readFileSync(path, 'utf8');

text = text.replace(
  '    this.createMenuButton();\n    this.createMenuButton();\n    this.createInteractionButton();',
  '    this.createMenuButton();'
);

text = text.replace(
  "    if (this.dialogueLayer) {\n      this.player.body.setVelocity(0, 0);",
  "    if (this.dialogueLayer) {\n      for (const npc of this.npcs) this.stopNpc(npc);\n      this.player.body.setVelocity(0, 0);"
);

if (text.includes('createInteractionButton()')) {
  throw new Error('Queda una llamada a createInteractionButton');
}

fs.writeFileSync(path, text);
console.log('v14.5 post-fix applied');
