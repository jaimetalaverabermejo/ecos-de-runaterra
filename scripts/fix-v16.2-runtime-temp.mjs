import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceExact(path, from, to, expectedCount = 1) {
  const source = read(path);
  const parts = source.split(from);
  const count = parts.length - 1;
  if (count !== expectedCount) {
    throw new Error(`${path}: expected ${expectedCount} occurrence(s), found ${count} for ${JSON.stringify(from)}`);
  }
  write(path, parts.join(to));
}

function updateJson(path, mutate) {
  const data = JSON.parse(read(path));
  mutate(data);
  write(path, JSON.stringify(data, null, 2) + '\n');
}

function setEcoTypes(id, types) {
  updateJson(`src/contenido/campeones/${id}/eco.json`, (eco) => {
    eco.tipos = types;
  });
}

function setSkillTypes(id, mapping) {
  updateJson(`src/contenido/campeones/${id}/habilidades.json`, (skills) => {
    for (const [skillId, type] of Object.entries(mapping)) {
      const skill = skills.find((entry) => entry.id === skillId);
      if (!skill) throw new Error(`${id}: missing skill ${skillId}`);
      skill.tipo = type;
    }
  });
}

// 1) Player overworld: the legacy camera still zooms x1.875, so the 96 px player
// must use the same visual scale as the new champion NPCs instead of runtime-forced 1.0.
replaceExact(
  'src/scenes/PlayerWorldV13.ts',
  '.setScale(1)',
  '.setScale(0.65)',
  2
);
replaceExact(
  'src/scenes/WorldScene.ts',
  "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 0.94, right: 0.96, up: 1.01, left: 0.99 };",
  "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 0.65, right: 0.65, up: 0.65, left: 0.65 };"
);

// 2) Fixed/touch UI: these coordinates were still in the old 512x288 coordinate space.
replaceExact('src/input/InputManager.ts', '    const baseX = 58;\n    const baseY = 226;\n    const step = 34;', '    const baseX = 109;\n    const baseY = 424;\n    const step = 64;');
replaceExact('src/input/InputManager.ts', "    this.scene.add.circle(baseX, baseY, 12, 0x07131e, 0.30)\n      .setStrokeStyle(1, 0x49d8e8, 0.28)", "    this.scene.add.circle(baseX, baseY, 23, 0x07131e, 0.30)\n      .setStrokeStyle(2, 0x49d8e8, 0.28)");
replaceExact('src/input/InputManager.ts', "    this.createActionButton(466, 216, 20, 'A', 0x1d5a40, 0x72e6f0, () => {", "    this.createActionButton(874, 405, 38, 'A', 0x1d5a40, 0x72e6f0, () => {");
replaceExact('src/input/InputManager.ts', "    this.createActionButton(430, 252, 18, 'B', 0x5c4819, 0xf2d76d, () => {", "    this.createActionButton(806, 473, 34, 'B', 0x5c4819, 0xf2d76d, () => {");
replaceExact('src/input/InputManager.ts', "    const button = this.scene.add.circle(x, y, 17, 0x0d2234, 0.38)\n      .setStrokeStyle(2, 0x49d8e8, 0.48)", "    const button = this.scene.add.circle(x, y, 32, 0x0d2234, 0.38)\n      .setStrokeStyle(4, 0x49d8e8, 0.48)");
replaceExact('src/input/InputManager.ts', "      fontSize: '13px',", "      fontSize: '24px',");
replaceExact('src/input/InputManager.ts', "    const button = this.scene.add.circle(x, y, radius, fill, 0.46)\n      .setStrokeStyle(2, stroke, 0.70)", "    const button = this.scene.add.circle(x, y, radius, fill, 0.46)\n      .setStrokeStyle(4, stroke, 0.70)");
replaceExact('src/input/InputManager.ts', "      fontSize: radius >= 20 ? '14px' : '12px',", "      fontSize: radius >= 36 ? '26px' : '23px',");

const oldMenu = `    const button = this.add.circle(484, 24, 18, UI.colors.panel, 0.62)\n      .setStrokeStyle(2, UI.colors.border, 0.62)\n      .setScrollFactor(0)\n      .setDepth(4000)\n      .setInteractive({ useHandCursor: true });\n    this.add.text(484, 24, '☰', {\n      fontFamily: UI.font.family, fontSize: '16px', fontStyle: 'bold', color: UI.text.primary\n    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001).setAlpha(0.9);`;
const newMenu = `    const button = this.add.circle(908, 45, 34, UI.colors.panel, 0.62)\n      .setStrokeStyle(4, UI.colors.border, 0.62)\n      .setScrollFactor(0)\n      .setDepth(4000)\n      .setInteractive({ useHandCursor: true });\n    this.add.text(908, 45, '☰', {\n      fontFamily: UI.font.family, fontSize: '30px', fontStyle: 'bold', color: UI.text.primary\n    }).setOrigin(0.5).setScrollFactor(0).setDepth(4001).setAlpha(0.9);`;
replaceExact('src/scenes/WorldScene.ts', oldMenu, newMenu);

// 3) HP/EXP fills were behind opaque atlas bar frames after the 960 UI migration.
replaceExact(
  'src/scenes/BattleScene.ts',
  'const fill = this.add.rectangle(barX, barY, maxWidth, 6, UI.colors.hp, 1).setOrigin(0, 0.5).setDepth(615);',
  'const fill = this.add.rectangle(barX, barY, maxWidth, 6, UI.colors.hp, 1).setOrigin(0, 0.5).setDepth(621);'
);
replaceExact(
  'src/scenes/BattleScene.ts',
  'const shieldFill = this.add.rectangle(barX, barY, 0, 6, 0xe8f6ff, 0.98).setOrigin(0, 0.5).setVisible(false).setDepth(618);',
  'const shieldFill = this.add.rectangle(barX, barY, 0, 6, 0xe8f6ff, 0.98).setOrigin(0, 0.5).setVisible(false).setDepth(622);'
);
replaceExact(
  'src/scenes/BattleScene.ts',
  'expFill = this.add.rectangle(x + 60, y + 83, 280, 6, 0x5fd8ff, 1).setOrigin(0, 0.5).setDepth(615);',
  'expFill = this.add.rectangle(x + 60, y + 83, 280, 6, 0x5fd8ff, 1).setOrigin(0, 0.5).setDepth(621);'
);

// 4) Restore the agreed v0.4 affinities for the currently playable/test roster.
setEcoTypes('garen', ['marcial']);
setSkillTypes('garen', {
  'garen-perseverance': 'marcial',
  'garen-decisive-strike': 'marcial',
  'garen-courage': 'marcial',
  'garen-judgment': 'marcial',
  'garen-demacian-justice': 'marcial'
});

setEcoTypes('teemo', ['primordial', 'marcial']);
setSkillTypes('teemo', {
  'teemo-guerrilla-warfare': 'primordial',
  'teemo-blinding-dart': 'marcial',
  'teemo-move-quick': 'tecnologico',
  'teemo-toxic-shot': 'primordial',
  'teemo-noxious-trap': 'tecnologico'
});

setEcoTypes('poppy', ['marcial', 'runico']);
setSkillTypes('poppy', {
  'poppy-iron-ambassador': 'marcial',
  'poppy-hammer-shock': 'marcial',
  'poppy-steadfast-presence': 'runico',
  'poppy-heroic-charge': 'marcial',
  'poppy-keepers-verdict': 'marcial'
});

setEcoTypes('tristana', ['marcial']);
setSkillTypes('tristana', {
  'tristana-draw-a-bead': 'marcial',
  'tristana-nitro-charge': 'marcial',
  'tristana-rocket-jump': 'marcial',
  'tristana-explosive-charge': 'tecnologico',
  'tristana-buster-shot': 'marcial'
});

setEcoTypes('lulu', ['espiritual']);
setSkillTypes('lulu', {
  'lulu-pix-faerie-companion': 'espiritual',
  'lulu-glitterlance': 'espiritual',
  'lulu-whimsy': 'arcano',
  'lulu-help-pix': 'espiritual',
  'lulu-wild-growth': 'espiritual'
});

setEcoTypes('gnar', ['primordial', 'marcial']);
setSkillTypes('gnar', {
  'gnar-rage-gene': 'primordial',
  'gnar-boomerang-throw': 'marcial',
  'gnar-hyper': 'primordial',
  'gnar-hop': 'marcial',
  'gnar-transform': 'primordial',
  'mega-gnar-rage': 'primordial',
  'mega-gnar-boulder-toss': 'marcial',
  'mega-gnar-wallop': 'marcial',
  'mega-gnar-crunch': 'primordial',
  'mega-gnar-ultimate': 'marcial'
});
updateJson('src/contenido/campeones/gnar/formas/mega-gnar/forma.json', (form) => {
  form.tipos = ['primordial', 'marcial'];
});

replaceExact(
  'src/scenes/BootScene.ts',
  "this.registry.set('app.version', '16.2 ASSET MIGRATION');",
  "this.registry.set('app.version', '16.2.1 RUNTIME FIXES');"
);

console.log('Applied v16.2.1 runtime fixes.');
