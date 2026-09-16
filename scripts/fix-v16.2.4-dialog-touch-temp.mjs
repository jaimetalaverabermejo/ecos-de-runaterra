import fs from 'node:fs';

// Trigger validation run after the workflow file exists on the branch.
function replaceExact(path, from, to, expectedCount = 1) {
  const source = fs.readFileSync(path, 'utf8');
  const parts = source.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount) throw new Error(`${path}: expected ${expectedCount}, found ${count}: ${JSON.stringify(from)}`);
  fs.writeFileSync(path, parts.join(to));
}

// World dialogue: render as native 960x540 HUD and cancel the legacy camera zoom
// on the dialogue container. This makes its screen position independent of camera follow.
const world = 'src/scenes/WorldScene.ts';
replaceExact(world,
`    const objects: Phaser.GameObjects.GameObject[] = [];
    const x = 8;
    const y = 174;
    const width = 496;
    const height = 106;`,
`    const objects: Phaser.GameObjects.GameObject[] = [];
    const x = 20;
    const y = 350;
    const width = 920;
    const height = 170;`
);
replaceExact(world,
`    objects.push(this.add.rectangle(x + 14, y + 12, 164, 23, 0x173d5b, 1).setOrigin(0, 0).setStrokeStyle(1, UI.colors.border));
    objects.push(this.add.text(x + 24, y + 16, node.speaker.toUpperCase(), {
      fontFamily: UI.font.family,
      fontSize: UI.font.small,`,
`    objects.push(this.add.rectangle(x + 24, y + 16, 280, 34, 0x173d5b, 1).setOrigin(0, 0).setStrokeStyle(2, UI.colors.border));
    objects.push(this.add.text(x + 38, y + 22, node.speaker.toUpperCase(), {
      fontFamily: UI.font.family,
      fontSize: '18px',`
);
replaceExact(world,
`    objects.push(this.add.text(x + 18, y + 46, node.lines[this.dialogueLineIndex] ?? '', {
      fontFamily: UI.font.family,
      fontSize: UI.font.body,
      color: UI.text.primary,
      wordWrap: { width: 300 },
      lineSpacing: 5
    }));`,
`    objects.push(this.add.text(x + 30, y + 66, node.lines[this.dialogueLineIndex] ?? '', {
      fontFamily: UI.font.family,
      fontSize: '18px',
      color: UI.text.primary,
      wordWrap: { width: 610 },
      lineSpacing: 6
    }));`
);
replaceExact(world,
`        const choiceY = y + 50 + index * 28;
        const selected = index === this.dialogueChoiceIndex;
        const box = this.add.rectangle(x + 426, choiceY, 124, 24, selected ? UI.colors.goldDark : UI.colors.panelRaised, 0.98)`,
`        const choiceY = y + 62 + index * 42;
        const selected = index === this.dialogueChoiceIndex;
        const box = this.add.rectangle(x + 780, choiceY, 250, 34, selected ? UI.colors.goldDark : UI.colors.panelRaised, 0.98)`
);
replaceExact(world,
`        const text = this.add.text(x + 426, choiceY, \`${'${selected ? \'◆ \' : \'\'}'}${'${choice.label.toUpperCase()}'}\`, {
          fontFamily: UI.font.family,
          fontSize: UI.font.small,`,
`        const text = this.add.text(x + 780, choiceY, \`${'${selected ? \'◆ \' : \'\'}'}${'${choice.label.toUpperCase()}'}\`, {
          fontFamily: UI.font.family,
          fontSize: '16px',`
);
replaceExact(world,
`      const box = this.add.rectangle(x + 430, y + 84, 112, 26, UI.colors.panelRaised, 0.98)`,
`      const box = this.add.rectangle(x + 810, y + 136, 180, 36, UI.colors.panelRaised, 0.98)`
);
replaceExact(world,
`      const text = this.add.text(x + 430, y + 84, atEnd ? 'CERRAR' : 'SIGUIENTE', {
        fontFamily: UI.font.family,
        fontSize: UI.font.small,`,
`      const text = this.add.text(x + 810, y + 136, atEnd ? 'CERRAR' : 'SIGUIENTE', {
        fontFamily: UI.font.family,
        fontSize: '16px',`
);
replaceExact(world,
`    this.dialogueLayer = this.add.container(0, 0, objects).setScrollFactor(0).setDepth(10000);`,
`    this.dialogueLayer = this.add.container(0, 0, objects)
      .setScrollFactor(0)
      .setScale(1 / this.cameras.main.zoom)
      .setDepth(10000);`
);

// Combat continuation: CombatUxV1211 overrides BattleScene.awaitContinue at runtime.
// Make its input blocker truly native 960x540 and use POINTER_DOWN for reliable touch.
const combatUx = 'src/scenes/CombatUxV1211.ts';
replaceExact(combatUx,
`      const blocker = this.add.rectangle(256, 144, 512, 288, 0x000000, 0.001)
        .setInteractive();
      const hint = UiKit.label(this, 360, 211, '▼', UI.font.small, UI.text.accent, true)
        .setOrigin(1, 0);`,
`      const blocker = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.001)
        .setInteractive();
      const hint = UiKit.label(this, 920, 350, '▼', UI.font.small, UI.text.accent, true)
        .setOrigin(1, 0);`
);
replaceExact(combatUx,
`        blocker.off(Phaser.Input.Events.POINTER_UP, done);`,
`        blocker.off(Phaser.Input.Events.POINTER_DOWN, done);`
);
replaceExact(combatUx,
`      blocker.once(Phaser.Input.Events.POINTER_UP, done);`,
`      blocker.once(Phaser.Input.Events.POINTER_DOWN, done);`
);

replaceExact('src/scenes/BootScene.ts',
"this.registry.set('app.version', '16.2.3 DIALOG COMBAT FIX');",
"this.registry.set('app.version', '16.2.4 NATIVE DIALOG TOUCH FIX');"
);

console.log('Applied definitive v16.2.4 dialog/touch fixes.');
