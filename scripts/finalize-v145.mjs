import fs from 'node:fs';

const path = 'src/scenes/WorldScene.ts';
let text = fs.readFileSync(path, 'utf8');
const hint = "      objects.push(this.add.text(x + 18, y + 94, 'Cruceta: elegir · A: confirmar · B: cancelar', {\n        fontFamily: UI.font.family, fontSize: UI.font.tiny, color: UI.text.muted\n      }));\n";
text = text.replace(hint, '');

if (text.includes('createInteractionButton')) throw new Error('Sigue existiendo createInteractionButton');
if (text.includes('interactionButton')) throw new Error('Sigue existiendo interactionButton');
if (text.includes('Cruceta: elegir · A: confirmar · B: cancelar')) throw new Error('Sigue existiendo hint de diálogo');
if (text.includes('WASD/flechas · E/Espacio hablar')) throw new Error('Sigue existiendo hint de mundo');

fs.writeFileSync(path, text);
console.log('v14.5 finalized');
