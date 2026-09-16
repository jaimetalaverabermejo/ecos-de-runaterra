import fs from 'node:fs';

function replaceOnce(path, before, after) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`No se encontró patrón en ${path}: ${before.slice(0, 120)}`);
  fs.writeFileSync(path, text.replace(before, after));
}

const battleScene = 'src/scenes/BattleScene.ts';

replaceOnce(battleScene,
`  private createActions(): void {\n    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());\n    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];\n    const labels = ['Q', 'W', 'E', 'R'];\n    const xs = [44, 126, 208, 290];\n\n    for (let i = 0; i < 4; i += 1) {\n      const skill = DataRegistry.skill(skillIds[i]);\n      const slot = slots[i];\n      const rank = this.playerChampion.skillRanks[slot];\n      const unlocked = rank > 0;\n      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));\n      const stab = TypeEffectivenessService.stabMultiplier(skill, this.playerChampion, this.currentFormId(this.playerChampion));\n      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);\n      const stabMark = stab > 1.001 ? ' ★' : '';\n      const label = \`${'${labels[i]}'} · ${'${rank}'}/${'${ProgressionService.maxRank(slot)}'}\\n${'${this.shortSkillName(skill.name)}'}${'${stabMark}'}${'${glyph ? ` ${glyph}` : \'\'}'}\`;\n      this.createActionButton(xs[i], 253, 76, 56, label, () => {\n        if (!unlocked) return;\n        void this.handleCombatAction({ type: 'skill', skillId: skill.id });\n      }, !unlocked, i === 0 ? 'blue' : 'neutral');\n      this.createSkillInfoButton(xs[i] + 30, 232, skill, rank, labels[i]);\n      if (!unlocked) {\n        const masteryLabel = UiKit.label(this, xs[i], 273, \`M${'${skill.unlockMastery}'}\`, UI.font.tiny, UI.text.muted, true).setOrigin(0.5);\n        this.actionObjects.push(masteryLabel);\n      }\n    }\n\n    const canSwitch = this.availableReplacements().length > 0;`,
`  private createActions(): void {\n    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());\n    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];\n    const xs = [44, 126, 208, 290];\n\n    for (let i = 0; i < 4; i += 1) {\n      const skill = DataRegistry.skill(skillIds[i]);\n      const slot = slots[i];\n      const rank = this.playerChampion.skillRanks[slot];\n      const unlocked = rank > 0;\n      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));\n      const glyph = TypeEffectivenessService.actionGlyph(effectiveness);\n      this.createSkillActionButton(xs[i], 253, 76, 56, skill, slot, rank, glyph, () => {\n        if (!unlocked) return;\n        void this.handleCombatAction({ type: 'skill', skillId: skill.id });\n      }, !unlocked);\n    }\n\n    const canSwitch = this.availableReplacements().length > 0;`
);

replaceOnce(battleScene,
`  private createSkillInfoButton(x: number, y: number, skill: SkillDefinition, rank: number, slot: string): void {\n    const circle = this.add.rectangle(x, y, 14, 14, UI.colors.panelRaised, 0.98)\n      .setStrokeStyle(1, UI.colors.borderSoft)\n      .setInteractive({ useHandCursor: true });\n    const infoLabel = UiKit.label(this, x, y - 1, 'i', UI.font.tiny, UI.text.accent, true).setOrigin(0.5);\n    circle.on(Phaser.Input.Events.POINTER_UP, () => this.openSkillInfo(skill, rank, slot));\n    this.actionObjects.push(circle, infoLabel);\n  }\n\n  private openSkillInfo(skill: SkillDefinition, rank: number, slot: string): void {`,
`  private createSkillActionButton(\n    x: number,\n    y: number,\n    width: number,\n    height: number,\n    skill: SkillDefinition,\n    slot: ActiveSkillSlot,\n    rank: number,\n    effectivenessGlyph: string,\n    onClick: () => void,\n    disabled = false\n  ): void {\n    const button = this.add.rectangle(x, y, width, height, UI.colors.panelRaised, disabled ? 0.58 : 0.98)\n      .setStrokeStyle(1, disabled ? UI.colors.borderSoft : UI.colors.border, disabled ? 0.55 : 0.9);\n    if (!disabled) {\n      button.setInteractive({ useHandCursor: true });\n      button.on(Phaser.Input.Events.POINTER_UP, onClick);\n    }\n\n    const name = UiKit.label(this, x, y - 16, this.shortSkillName(skill.name), UI.font.tiny, disabled ? UI.text.muted : UI.text.primary, true)\n      .setOrigin(0.5);\n    const typeName = skill.affinityId ? DataRegistry.affinity(skill.affinityId).name.toUpperCase() : 'NEUTRAL';\n    const typeLine = UiKit.label(\n      this,\n      x,\n      y + 1,\n      \`${'${typeName}'}${'${effectivenessGlyph ? `  ${effectivenessGlyph}` : \'\'}'}\`,\n      '7px',\n      disabled ? UI.text.muted : UI.text.accent,\n      true\n    ).setOrigin(0.5);\n\n    const maxRank = ProgressionService.maxRank(slot);\n    const pips = Array.from({ length: maxRank }, (_, index) => index < rank ? '●' : '○').join(' ');\n    const rankPips = UiKit.label(this, x, y + 18, pips, '7px', disabled ? UI.text.muted : UI.text.gold, true).setOrigin(0.5);\n\n    const infoButton = this.add.rectangle(x + 30, y - 21, 12, 12, UI.colors.panel, 0.96)\n      .setStrokeStyle(1, UI.colors.borderSoft)\n      .setInteractive({ useHandCursor: true });\n    const infoLabel = UiKit.label(this, x + 30, y - 22, 'i', '7px', UI.text.accent, true).setOrigin(0.5);\n    infoButton.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {\n      pointer.event.stopPropagation();\n      this.openSkillInfo(skill, rank);\n    });\n\n    this.actionObjects.push(button, name, typeLine, rankPips, infoButton, infoLabel);\n  }\n\n  private openSkillInfo(skill: SkillDefinition, rank: number): void {`
);

replaceOnce(battleScene,
`    objects.push(UiKit.label(this, 82, 70, \`${'${slot}'} · ${'${skill.name.toUpperCase()}'}\`, UI.font.title, UI.text.primary, true));`,
`    objects.push(UiKit.label(this, 82, 70, skill.name.toUpperCase(), UI.font.title, UI.text.primary, true));`
);

replaceOnce(battleScene,
`    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());\n    if (TypeEffectivenessService.stabMultiplier(skill, this.playerChampion, this.currentFormId(this.playerChampion)) > 1.001) {\n      tags.add(TypeEffectivenessService.stabLabel());\n    }`,
`    if (skill.affinityId) tags.add(DataRegistry.affinity(skill.affinityId).name.toUpperCase());`
);

replaceOnce(battleScene,
`  private affinityLabelFor(champion: ChampionInstance): string {\n    return TypeEffectivenessService.typeNames(TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion)), true);\n  }`,
`  private affinityLabelFor(champion: ChampionInstance): string {\n    return TypeEffectivenessService.typeNames(TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion)));\n  }`
);

const boot = 'src/scenes/BootScene.ts';
replaceOnce(boot, `this.registry.set('app.version', '15.3 TEST');`, `this.registry.set('app.version', '15.3.1 TEST');`);

const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '0.15.3-test.1';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

if (fs.existsSync('tmp.txt')) fs.rmSync('tmp.txt');

console.log('v15.3.1: UI de habilidades refinada, tipos completos y pips de rango aplicados.');
