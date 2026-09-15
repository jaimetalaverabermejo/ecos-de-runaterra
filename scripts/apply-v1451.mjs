import fs from 'node:fs';

function replaceIn(path, from, to) {
  const original = fs.readFileSync(path, 'utf8');
  if (!original.includes(from)) throw new Error(`No se encontró patrón en ${path}`);
  fs.writeFileSync(path, original.replace(from, to));
}

replaceIn(
  'src/scenes/WorldScene.ts',
  "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.68, right: 1.72, up: 1.82, left: 1.78 };",
  "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.88, right: 1.92, up: 2.02, left: 1.98 };"
);
replaceIn(
  'src/scenes/BootScene.ts',
  "this.registry.set('app.version', '14.5');",
  "this.registry.set('app.version', '14.5.1');"
);
replaceIn(
  'package.json',
  '"version": "0.14.5"',
  '"version": "0.14.5-1"'
);

console.log('v14.5.1 scale patch applied');
