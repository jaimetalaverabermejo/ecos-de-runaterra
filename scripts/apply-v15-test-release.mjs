import fs from 'node:fs';

function patch(path, from, to, label) {
  let text = fs.readFileSync(path, 'utf8');
  if (text.includes(to)) return;
  if (!text.includes(from)) throw new Error(`No se encontró ${label} en ${path}`);
  text = text.replace(from, to);
  fs.writeFileSync(path, text);
}

patch(
  'src/scenes/BootScene.ts',
  "import { SaveService } from '../systems/save/SaveService';",
  "import { SaveService } from '../systems/save/SaveService';\nimport { V15TestRosterService } from '../systems/testing/V15TestRosterService';",
  'import test roster'
);
patch(
  'src/scenes/BootScene.ts',
  "    DataRegistry.echo('teemo');",
  "    DataRegistry.echo('teemo');\n    DataRegistry.echo('poppy');\n    DataRegistry.echo('lulu');\n    DataRegistry.echo('tristana');\n    DataRegistry.echo('gnar');",
  'v15 echo validation'
);
patch(
  'src/scenes/BootScene.ts',
  "    this.registry.set('app.version', '14.5.1');",
  "    const v15TestRosterKey = 'ecos-de-runaterra.migration.v15-test-roster.1';\n    if (localStorage.getItem(v15TestRosterKey) !== 'done') {\n      V15TestRosterService.apply(save);\n      SaveService.save(save);\n      localStorage.setItem(v15TestRosterKey, 'done');\n    }\n\n    this.registry.set('app.version', '15.0 TEST');",
  'v15 roster migration and version'
);
patch(
  'package.json',
  '"version": "0.14.5-1"',
  '"version": "0.15.0-test.1"',
  'package test version'
);

patch(
  'src/scenes/TeamScene.ts',
  "  private addChampionVisual(championId: string, x: number, groundY: number): void {\n    if (championId === 'garen') {\n      this.add.image(x, groundY, 'garen-portrait').setOrigin(0.5, 1).setDisplaySize(48, 48);\n      return;\n    }\n    if (championId === 'teemo') {\n      this.add.image(x, groundY, 'teemo-battle-front').setOrigin(0.5, 1).setDisplaySize(42, 48);\n      return;\n    }\n    this.add.circle(x, groundY - 24, 18, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);\n  }",
  "  private addChampionVisual(championId: string, x: number, groundY: number): void {\n    const portrait = championId + '-portrait';\n    if (this.textures.exists(portrait)) {\n      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(48, 48);\n      return;\n    }\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) {\n      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(44, 48);\n      return;\n    }\n    this.add.circle(x, groundY - 24, 18, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);\n  }",
  'generic team visual'
);
patch(
  'src/scenes/TeamScene.ts',
  "      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador'",
  "      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador',\n      tanque: 'Tanque', luchador: 'Luchador', mago: 'Mago', asesino: 'Asesino', tirador: 'Tirador', apoyo: 'Apoyo', especialista: 'Especialista'",
  'team role labels'
);

patch(
  'src/scenes/ChampionDetailScene.ts',
  "  private addChampionPortrait(championId: string, x: number, groundY: number): void {\n    if (championId === 'garen') {\n      this.add.image(x, groundY, 'garen-portrait').setOrigin(0.5, 1).setDisplaySize(120, 120);\n      return;\n    }\n    if (championId === 'teemo') {\n      this.add.image(x, groundY, 'teemo-battle-front').setOrigin(0.5, 1).setDisplaySize(108, 122);\n      return;\n    }\n    this.add.circle(x, groundY - 58, 44, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);\n  }",
  "  private addChampionPortrait(championId: string, x: number, groundY: number): void {\n    const portrait = championId + '-portrait';\n    if (this.textures.exists(portrait)) {\n      this.add.image(x, groundY, portrait).setOrigin(0.5, 1).setDisplaySize(120, 120);\n      return;\n    }\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) {\n      this.add.image(x, groundY, front).setOrigin(0.5, 1).setDisplaySize(108, 122);\n      return;\n    }\n    this.add.circle(x, groundY - 58, 44, UI.colors.panelRaised, 1).setStrokeStyle(2, UI.colors.border);\n  }",
  'generic detail portrait'
);
patch(
  'src/scenes/ChampionDetailScene.ts',
  "    const labels: Record<string, string> = { vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador' };",
  "    const labels: Record<string, string> = {\n      vanguard: 'Vanguardia', fighter: 'Luchador', ranger: 'Explorador', trickster: 'Embaucador',\n      tanque: 'Tanque', luchador: 'Luchador', mago: 'Mago', asesino: 'Asesino', tirador: 'Tirador', apoyo: 'Apoyo', especialista: 'Especialista'\n    };",
  'detail role labels'
);

patch(
  'src/systems/combat/BattleEngine.ts',
  "  static chooseEnemyAction(champion: ChampionInstance, formId?: string): CombatAction {\n    const skills = this.unlockedSkills(champion, formId);\n    if (skills.length > 0 && Math.random() < 0.76) {\n      const skill = skills[Math.floor(Math.random() * skills.length)];\n      return { type: 'skill', skillId: skill.id };\n    }\n    return { type: 'basic' };\n  }",
  "  static chooseEnemyAction(champion: ChampionInstance, formId?: string): CombatAction {\n    const skills = this.unlockedSkills(champion, formId);\n    if (skills.length > 0) {\n      const skill = skills[Math.floor(Math.random() * skills.length)];\n      return { type: 'skill', skillId: skill.id };\n    }\n    const fallbackSkillId = formId\n      ? (DataRegistry.form(champion.championId, formId).skillIds ?? DataRegistry.champion(champion.championId).skillIds)[0]\n      : DataRegistry.champion(champion.championId).skillIds[0];\n    return { type: 'skill', skillId: fallbackSkillId };\n  }",
  'remove AI basic attacks'
);

let battle = fs.readFileSync('src/scenes/BattleScene.ts', 'utf8');
function battlePatch(from, to, label) {
  if (battle.includes(to)) return;
  if (!battle.includes(from)) throw new Error(`No se encontró ${label} en BattleScene`);
  battle = battle.replace(from, to);
}
battlePatch(
  "    const enemyAction = BattleEngine.chooseEnemyAction(this.wildChampion, this.currentFormId(this.wildChampion));",
  "    const enemyAction = this.chooseEnemyAction();",
  'filtered enemy action'
);
battlePatch(
  "    await this.performAction('enemy', BattleEngine.chooseEnemyAction(this.wildChampion));",
  "    await this.performAction('enemy', this.chooseEnemyAction());",
  'filtered enemy response'
);
battlePatch(
  "      this.setMessage('Elige tu siguiente acción.');",
  "      this.setMessage(this.idlePrompt());",
  'enemy response prompt'
);
battlePatch(
  "        const healed = Math.min(passiveHeal, BattleEngine.statsFor(attacker).hp - this.playerHp);",
  "        const healed = Math.min(passiveHeal, this.statsForChampion(attacker).hp - this.playerHp);",
  'form passive player heal'
);
battlePatch(
  "        this.wildHp += Math.min(passiveHeal, BattleEngine.statsFor(attacker).hp - this.wildHp);",
  "        this.wildHp += Math.min(passiveHeal, this.statsForChampion(attacker).hp - this.wildHp);",
  'form passive wild heal'
);
battlePatch(
  "      const missing = BattleEngine.statsFor(this.playerChampion).hp - this.playerHp;",
  "      const missing = this.statsForChampion(this.playerChampion).hp - this.playerHp;",
  'form item heal max'
);
battlePatch(
  "      BattleEngine.statsFor(this.wildChampion).hp,",
  "      this.statsForChampion(this.wildChampion).hp,",
  'form link max'
);
battlePatch(
  "  private availableReplacements(): ChampionInstance[] {",
  "  private chooseEnemyAction(): CombatAction {\n    const formId = this.currentFormId(this.wildChampion);\n    const resources = this.ensureResourceStore();\n    const usable = BattleEngine.unlockedSkills(this.wildChampion, formId)\n      .filter((skill) => SpecialEffectEngine.canUseSkill(this.wildChampion, skill, resources).allowed);\n    if (usable.length > 0) {\n      const skill = usable[Math.floor(Math.random() * usable.length)];\n      return { type: 'skill', skillId: skill.id };\n    }\n    return BattleEngine.chooseEnemyAction(this.wildChampion, formId);\n  }\n\n  private availableReplacements(): ChampionInstance[] {",
  'enemy action helper'
);
fs.writeFileSync('src/scenes/BattleScene.ts', battle);
console.log('v15 test release patch applied');
