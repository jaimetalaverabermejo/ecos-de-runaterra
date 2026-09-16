import fs from 'node:fs';

function replaceExact(path, from, to, expectedCount = 1) {
  const source = fs.readFileSync(path, 'utf8');
  const parts = source.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount) throw new Error(`${path}: expected ${expectedCount}, found ${count}: ${JSON.stringify(from)}`);
  fs.writeFileSync(path, parts.join(to));
}

// WorldScene still uses camera zoom 1.875. Fixed UI positions therefore need
// inverse-camera coordinates; their sizes already scale correctly with camera zoom.
const input = 'src/input/InputManager.ts';
replaceExact(input, '    const baseX = 109;\n    const baseY = 424;\n    const step = 64;', '    const baseX = 282;\n    const baseY = 352;\n    const step = 34;');
replaceExact(input, "    this.scene.add.circle(baseX, baseY, 23, 0x07131e, 0.30)\n      .setStrokeStyle(2, 0x49d8e8, 0.28)", "    this.scene.add.circle(baseX, baseY, 12, 0x07131e, 0.30)\n      .setStrokeStyle(1, 0x49d8e8, 0.28)");
replaceExact(input, "    this.createActionButton(874, 405, 38, 'A', 0x1d5a40, 0x72e6f0, () => {", "    this.createActionButton(690, 342, 20, 'A', 0x1d5a40, 0x72e6f0, () => {");
replaceExact(input, "    this.createActionButton(806, 473, 34, 'B', 0x5c4819, 0xf2d76d, () => {", "    this.createActionButton(654, 378, 18, 'B', 0x5c4819, 0xf2d76d, () => {");
replaceExact(input, "    const button = this.scene.add.circle(x, y, 32, 0x0d2234, 0.38)\n      .setStrokeStyle(4, 0x49d8e8, 0.48)", "    const button = this.scene.add.circle(x, y, 17, 0x0d2234, 0.38)\n      .setStrokeStyle(2, 0x49d8e8, 0.48)");
replaceExact(input, "      fontSize: '24px',", "      fontSize: '13px',");
replaceExact(input, "    const button = this.scene.add.circle(x, y, radius, fill, 0.46)\n      .setStrokeStyle(4, stroke, 0.70)", "    const button = this.scene.add.circle(x, y, radius, fill, 0.46)\n      .setStrokeStyle(2, stroke, 0.70)");
replaceExact(input, "      fontSize: radius >= 36 ? '26px' : '23px',", "      fontSize: radius >= 20 ? '14px' : '12px',");

const world = 'src/scenes/WorldScene.ts';
replaceExact(world, '    const areaPlate = this.add.rectangle(10, 9, 214, 28, UI.colors.panel, 0.78)', '    const areaPlate = this.add.rectangle(234, 135, 214, 28, UI.colors.panel, 0.78)');
replaceExact(world, '    this.add.text(20, 15, map.name.toUpperCase(), {', '    this.add.text(244, 141, map.name.toUpperCase(), {');
replaceExact(world, "    const button = this.add.circle(908, 45, 34, UI.colors.panel, 0.62)\n      .setStrokeStyle(4, UI.colors.border, 0.62)", "    const button = this.add.circle(708, 150, 18, UI.colors.panel, 0.62)\n      .setStrokeStyle(2, UI.colors.border, 0.62)");
replaceExact(world, "    this.add.text(908, 45, '☰', {\n      fontFamily: UI.font.family, fontSize: '30px', fontStyle: 'bold', color: UI.text.primary", "    this.add.text(708, 150, '☰', {\n      fontFamily: UI.font.family, fontSize: '16px', fontStyle: 'bold', color: UI.text.primary");

replaceExact('src/scenes/BootScene.ts', "this.registry.set('app.version', '16.2.1 RUNTIME FIXES');", "this.registry.set('app.version', '16.2.2 MOBILE COORDINATES');");
console.log('Applied v16.2.2 mobile coordinate correction.');
