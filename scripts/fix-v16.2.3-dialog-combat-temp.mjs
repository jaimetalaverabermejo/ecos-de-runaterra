import fs from 'node:fs';

function replaceExact(path, from, to, expectedCount = 1) {
  const source = fs.readFileSync(path, 'utf8');
  const parts = source.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount) {
    throw new Error(`${path}: expected ${expectedCount} occurrence(s), found ${count}: ${JSON.stringify(from)}`);
  }
  fs.writeFileSync(path, parts.join(to));
}

// 1) World dialogue: keep it in the legacy camera space but recalculate the
// geometry so the x1.875 camera zoom maps it to the full 960x540 bottom area.
const world = 'src/scenes/WorldScene.ts';
replaceExact(world, '    const x = 104;\n    const y = 166;\n    const width = 402;\n    const height = 114;', '    const x = 8;\n    const y = 174;\n    const width = 496;\n    const height = 106;');
replaceExact(world, '      wordWrap: { width: 220 },', '      wordWrap: { width: 300 },');
replaceExact(world, '        const choiceY = y + 54 + index * 34;', '        const choiceY = y + 50 + index * 28;');
replaceExact(world, '        const box = this.add.rectangle(x + 302, choiceY, 96, 28, selected ? UI.colors.goldDark : UI.colors.panelRaised, 0.98)', '        const box = this.add.rectangle(x + 426, choiceY, 124, 24, selected ? UI.colors.goldDark : UI.colors.panelRaised, 0.98)');
replaceExact(world, '        const text = this.add.text(x + 302, choiceY, `${selected ? \'◆ \' : \'\'}${choice.label.toUpperCase()}`, {', '        const text = this.add.text(x + 426, choiceY, `${selected ? \'◆ \' : \'\'}${choice.label.toUpperCase()}`, {');
replaceExact(world, '      const box = this.add.rectangle(x + 316, y + 88, 112, 28, UI.colors.panelRaised, 0.98)', '      const box = this.add.rectangle(x + 430, y + 84, 112, 26, UI.colors.panelRaised, 0.98)');
replaceExact(world, "      const text = this.add.text(x + 316, y + 88, atEnd ? 'CERRAR' : 'SIGUIENTE', {", "      const text = this.add.text(x + 430, y + 84, atEnd ? 'CERRAR' : 'SIGUIENTE', {");

// 2) Battle sprites: preserve per-Eco/form differences but reduce the whole
// 320x320 battle asset family to a better visual footprint in the 960 scene.
const battle = 'src/scenes/BattleScene.ts';
replaceExact(battle, 'const EXECUTION_THRESHOLD = 0.35;', 'const EXECUTION_THRESHOLD = 0.35;\nconst BATTLE_VISUAL_SCALE = 0.75;');
replaceExact(battle, '    const scale = formScale * statusScale;', '    const scale = formScale * statusScale * BATTLE_VISUAL_SCALE;');

// 3) Touch anywhere = A/continue during battle messages.
replaceExact(
  battle,
  "        keyboard?.off('keydown-SPACE', done);\n        this.continueLayer?.destroy(true);",
  "        keyboard?.off('keydown-SPACE', done);\n        this.input.off(Phaser.Input.Events.POINTER_UP, done);\n        this.continueLayer?.destroy(true);"
);
replaceExact(
  battle,
  "      keyboard?.once('keydown-SPACE', done);\n    });",
  "      keyboard?.once('keydown-SPACE', done);\n      this.input.once(Phaser.Input.Events.POINTER_UP, done);\n    });"
);

replaceExact(
  'src/scenes/BootScene.ts',
  "this.registry.set('app.version', '16.2.2 MOBILE COORDINATES');",
  "this.registry.set('app.version', '16.2.3 DIALOG COMBAT FIX');"
);

console.log('Applied v16.2.3 dialogue/combat fixes.');
