import fs from 'node:fs';

const path = 'src/scenes/WorldScene.ts';
let source = fs.readFileSync(path, 'utf8');
source = source.replace(
  '  private dialogueNode?: DialogueNode;\n',
  "  private dialogueNode?: DialogueDefinition['nodes'][number];\n"
);
fs.writeFileSync(path, source);
