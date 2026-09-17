import fs from 'node:fs';

function replaceExact(path, from, to, expectedCount = 1) {
  const source = fs.readFileSync(path, 'utf8');
  const parts = source.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount) throw new Error(`${path}: expected ${expectedCount}, found ${count}: ${JSON.stringify(from)}`);
  fs.writeFileSync(path, parts.join(to));
}

// Final dialogue correction. WorldScene keeps the legacy camera zoom, but the
// dialogue is authored in native 960x540 coordinates. Cancelling zoom requires
// both inverse scale and a center translation because Phaser zooms around the
// viewport center rather than the top-left corner.
replaceExact(
  'src/scenes/WorldScene.ts',
`    this.dialogueLayer = this.add.container(0, 0, objects)
      .setScrollFactor(0)
      .setScale(1 / this.cameras.main.zoom)
      .setDepth(10000);`,
`    const dialogueZoom = this.cameras.main.zoom;
    const dialogueHudX = (this.cameras.main.width / 2) * (1 - 1 / dialogueZoom);
    const dialogueHudY = (this.cameras.main.height / 2) * (1 - 1 / dialogueZoom);
    this.dialogueLayer = this.add.container(dialogueHudX, dialogueHudY, objects)
      .setScrollFactor(0)
      .setScale(1 / dialogueZoom)
      .setDepth(10000);`
);

console.log('Applied final v16.2.4 dialogue camera compensation.');
