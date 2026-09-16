import fs from 'node:fs';

function edit(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`Sin cambios en ${path}`);
  fs.writeFileSync(path, after);
}
function replaceOnce(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`No se encontró ${label}`);
  return text.replace(before, after);
}
function replaceMethod(text, signature, nextSignature, replacement) {
  const start = text.indexOf(signature);
  if (start < 0) throw new Error(`No se encontró ${signature}`);
  const end = text.indexOf(nextSignature, start);
  if (end < 0) throw new Error(`No se encontró límite ${nextSignature}`);
  return text.slice(0, start) + replacement.trimEnd() + '\n\n' + text.slice(end);
}

edit('package.json', (text) => {
  const pkg = JSON.parse(text);
  pkg.version = '0.16.1-test.0';
  return JSON.stringify(pkg, null, 2) + '\n';
});

edit('src/scenes/BootScene.ts', (text) => {
  text = replaceOnce(text,
    "    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);",
    "    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);\n    this.load.atlas('battle-ui-960', './assets/ui/ui_960_v1/ui960-atlas.png', './assets/ui/ui_960_v1/ui960-atlas.json');",
    'carga atlas ui960');
  text = replaceOnce(text,
    "    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);",
    "    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);\n    this.textures.get('battle-ui-960').setFilter(Phaser.Textures.FilterMode.NEAREST);",
    'filtro ui960');
  text = text.replace(/this\.registry\.set\('app\.version', '[^']+'\);/, "this.registry.set('app.version', '16.1 UI960 TEST');");
  return text;
});

edit('src/scenes/BattleScene.ts', (text) => {
  text = replaceOnce(text, "    configureSceneLayout(this);", "    configureSceneLayout(this, 'native-960');", 'BattleScene nativa');

  text = replaceMethod(text, '  private drawBattlefield(): void {', '  private createCombatants(): void {', `  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(480, 188, 'bandle-bg').setDisplaySize(960, 376).setTint(0xa8c6b3).setAlpha(0.88);
    this.add.rectangle(0, 376, 960, 164, 0x020912, 0.94).setOrigin(0, 0).setDepth(500);
    this.add.line(0, 376, 12, 0, 948, 0, 0x33535f, 0.9).setOrigin(0, 0).setDepth(505);
    this.add.ellipse(260, 303, 220, 34, 0x000000, 0.20).setDepth(100);
    this.add.ellipse(735, 202, 184, 28, 0x000000, 0.17).setDepth(100);
  }`);

  text = replaceMethod(text, '  private createCombatants(): void {', '  private playerBattleTexture(', `  private createCombatants(): void {
    const playerTexture = this.playerBattleTexture(this.playerChampion.championId, this.currentFormId(this.playerChampion));
    this.playerSprite = this.add.image(260, 303, playerTexture).setOrigin(0.5, 1).setDepth(200);
    if (this.playerChampion.championId === 'teemo') this.playerSprite.setFlipX(true);

    const wildTexture = this.wildBattleTexture(this.wildChampion.championId, this.currentFormId(this.wildChampion));
    this.wildSprite = this.add.image(735, 202, wildTexture).setOrigin(0.5, 1).setDepth(200);
    this.playerEffectLayer = this.add.container(0, 0).setDepth(400);
    this.wildEffectLayer = this.add.container(0, 0).setDepth(400);
    this.syncCombatantVisual('player', false);
    this.syncCombatantVisual('enemy', false);
  }`);

  text = replaceMethod(text, '  private createPanels(): void {', '  private createHpPanel(', `  private createPanels(): void {
    this.wildHpUi = this.createHpPanel('enemy', this.wildChampion, this.executionThresholdFor(this.playerChampion));
    this.playerHpUi = this.createHpPanel('player', this.playerChampion);

    this.add.image(11, 310, 'battle-ui-960', '04_dialog_panel.png').setOrigin(0, 0).setDepth(700);
    this.messageText = UiKit.label(this, 42, 329, '', '16px', UI.text.primary, true)
      .setWordWrapWidth(850, true)
      .setLineSpacing(2)
      .setDepth(710);
  }`);

  text = replaceMethod(text, "  private createHpPanel(variant: 'enemy' | 'player', champion: ChampionInstance, executeThreshold?: number): HpUi {", '  private renderTypeIcons(', `  private createHpPanel(variant: 'enemy' | 'player', champion: ChampionInstance, executeThreshold?: number): HpUi {
    const enemy = variant === 'enemy';
    const x = enemy ? 16 : 578;
    const y = enemy ? 16 : 204;
    const panelFrame = enemy ? '02_panel_enemy.png' : '03_panel_player.png';
    const hpFrame = enemy ? '23_hp_bar_frame_enemy.png' : '24_hp_bar_frame_player.png';
    const masteryX = enemy ? 337 : 286;

    this.add.image(x, y, 'battle-ui-960', panelFrame).setOrigin(0, 0).setDepth(600);
    const typeLayer = this.add.container(x + 17, y + 17).setDepth(620);
    this.renderTypeIcons(typeLayer, champion);
    UiKit.label(this, x + 56, y + 15, DataRegistry.champion(champion.championId).name.toUpperCase(), '20px', UI.text.primary, true).setDepth(620);
    UiKit.label(this, x + masteryX, y + 19, 'M' + champion.mastery, '13px', UI.text.accent, true).setDepth(620);

    this.add.image(x + 56, y + 44, 'battle-ui-960', hpFrame).setOrigin(0, 0).setDepth(620);
    const barX = x + 60;
    const barY = y + 52;
    const maxWidth = 280;
    const fill = this.add.rectangle(barX, barY, maxWidth, 6, UI.colors.hp, 1).setOrigin(0, 0.5).setDepth(615);
    const shieldFill = this.add.rectangle(barX, barY, 0, 6, 0xe8f6ff, 0.98).setOrigin(0, 0.5).setVisible(false).setDepth(618);
    const text = UiKit.label(this, x + (enemy ? 336 : 300), y + 64, '', '12px', UI.text.primary, true).setOrigin(0.5, 0).setDepth(625);

    let expFill = this.add.rectangle(0, 0, 0, 0, 0x5fd8ff, 0).setVisible(false);
    if (!enemy) {
      this.add.image(x + 56, y + 77, 'battle-ui-960', '26_exp_bar_frame_player.png').setOrigin(0, 0).setDepth(620);
      expFill = this.add.rectangle(x + 60, y + 83, 280, 6, 0x5fd8ff, 1).setOrigin(0, 0.5).setDepth(615);
    }
    const statusLayer = this.add.container(x + 56, y + (enemy ? 82 : 96)).setDepth(630);

    let executeMarker: Phaser.GameObjects.Rectangle | undefined;
    if (executeThreshold !== undefined) {
      executeMarker = this.add.rectangle(barX + maxWidth * executeThreshold, barY, 2, 16, 0xffffff, 0.9).setDepth(626);
    }
    return { fill, shieldFill, expFill, text, typeLayer, statusLayer, executeMarker, executeThreshold, maxWidth, expMaxWidth: enemy ? 0 : 280, maxHp: this.statsForChampion(champion).hp, barX, barY, showNumbers: true };
  }`);

  text = replaceMethod(text, '  private renderTypeIcons(layer: Phaser.GameObjects.Container, champion: ChampionInstance): void {', '  private typeFrame(', `  private renderTypeIcons(layer: Phaser.GameObjects.Container, champion: ChampionInstance): void {
    layer.removeAll(true);
    const ids = TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion));
    ids.slice(0, 2).forEach((id, index) => {
      const y = ids.length === 1 ? 15 : index * 31;
      layer.add(this.add.image(0, y, 'battle-ui-960', this.typeFrame(id)).setOrigin(0, 0));
    });
  }`);

  text = replaceMethod(text, '  private createActions(): void {', '  private createSkillActionButton(', `  private createActions(): void {
    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const positions = [{ x: 32, y: 420 }, { x: 192, y: 420 }, { x: 352, y: 420 }, { x: 512, y: 420 }];

    for (let i = 0; i < 4; i += 1) {
      const skill = DataRegistry.skill(skillIds[i]);
      const slot = slots[i];
      const rank = this.playerChampion.skillRanks[slot];
      const unlocked = rank > 0;
      const effectiveness = TypeEffectivenessService.forSkill(skill, this.wildChampion, this.currentFormId(this.wildChampion));
      this.createSkillActionButton(positions[i].x, positions[i].y, skill, slot, rank, TypeEffectivenessService.actionGlyph(effectiveness), () => {
        if (!unlocked) return;
        void this.handleCombatAction({ type: 'skill', skillId: skill.id });
      }, !unlocked);
    }

    this.createSideActionButton(780, 378, '20_action_switch.png', 'CAMBIAR', () => this.openManualSwitch(), this.availableReplacements().length === 0);
    this.createSideActionButton(780, 432, '21_action_items.png', 'OBJETOS', () => this.openBattleItems(), this.battleItems().length === 0);
    this.createSideActionButton(780, 486, '22_action_flee.png', 'HUIR', () => this.flee(), false);
  }`);

  text = replaceMethod(text, '  private createSkillActionButton(', '  private createSideActionButton(', `  private createSkillActionButton(x: number, y: number, skill: SkillDefinition, slot: ActiveSkillSlot, rank: number, effectivenessGlyph: string, onClick: () => void, disabled = false): void {
    const baseFrame = disabled ? '07_skill_card_disabled.png' : '05_skill_card_base.png';
    const card = this.add.image(x, y, 'battle-ui-960', baseFrame).setOrigin(0, 0).setDepth(720);
    if (!disabled) {
      card.setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.POINTER_OVER, () => card.setFrame('06_skill_card_selected.png'));
      card.on(Phaser.Input.Events.POINTER_OUT, () => card.setFrame('05_skill_card_base.png'));
      card.on(Phaser.Input.Events.POINTER_DOWN, () => card.setFrame('06_skill_card_selected.png'));
      card.on(Phaser.Input.Events.POINTER_UP, () => { card.setFrame('05_skill_card_base.png'); onClick(); });
    }

    const fontSize = skill.name.length > 18 ? '11px' : skill.name.length > 13 ? '12px' : '14px';
    const name = UiKit.label(this, x + 72, y + 12, skill.name.toUpperCase(), fontSize, disabled ? UI.text.muted : UI.text.primary, true)
      .setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(118, true).setDepth(730);
    if (skill.affinityId) {
      this.actionObjects.push(this.add.image(x + 60, y + 39, 'battle-ui-960', this.typeFrame(skill.affinityId)).setOrigin(0, 0).setDepth(730));
    }
    const glyph = UiKit.label(this, x + 110, y + 42, effectivenessGlyph, '16px', disabled ? UI.text.muted : UI.text.accent, true).setOrigin(0.5).setDepth(730);

    const maxRank = ProgressionService.maxRank(slot);
    const dotXs = slot === 'r' ? [52, 68, 84] : [36, 52, 68, 84, 100];
    for (let i = 0; i < maxRank; i += 1) {
      const frame = i < rank ? '29_rank_dot_filled.png' : '30_rank_dot_empty.png';
      this.actionObjects.push(this.add.image(x + dotXs[i], y + 94, 'battle-ui-960', frame).setOrigin(0, 0).setDepth(730));
    }

    const infoButton = this.add.rectangle(x + 132, y + 12, 16, 16, 0x031523, 0.86).setStrokeStyle(1, 0x70d8ff, 0.7).setDepth(735).setInteractive({ useHandCursor: true });
    const infoLabel = UiKit.label(this, x + 132, y + 10, 'i', '11px', UI.text.accent, true).setOrigin(0.5).setDepth(736);
    infoButton.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.openSkillInfo(skill, rank);
    });
    this.actionObjects.push(card, name, glyph, infoButton, infoLabel);
  }`);

  text = replaceMethod(text, '  private createSideActionButton(', '  private openSkillInfo(', `  private createSideActionButton(x: number, y: number, iconFrame: string, labelText: string, onClick: () => void, disabled: boolean): void {
    const baseFrame = disabled ? '10_side_button_disabled.png' : '08_side_button_base.png';
    const button = this.add.image(x, y, 'battle-ui-960', baseFrame).setOrigin(0, 0).setDepth(720);
    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setFrame('09_side_button_selected.png'));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFrame('08_side_button_base.png'));
      button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFrame('09_side_button_selected.png'));
      button.on(Phaser.Input.Events.POINTER_UP, () => { button.setFrame('08_side_button_base.png'); onClick(); });
    }
    const icon = this.add.image(x + 12, y + 12, 'battle-ui-960', iconFrame).setOrigin(0, 0).setDepth(730);
    const label = UiKit.label(this, x + 104, y + 14, labelText, '15px', disabled ? UI.text.muted : UI.text.primary, true).setOrigin(0.5, 0).setDepth(730);
    this.actionObjects.push(button, icon, label);
  }`);

  text = text.replaceAll("layer.add(this.add.image(x, 0, 'battle-ui-v2', frame).setOrigin(0, 0));", "layer.add(this.add.image(x, 0, 'battle-ui-960', frame).setOrigin(0, 0));");
  text = text.replace("      const x = index * 14;", "      const x = index * 20;");
  text = text.replace("    const baseY = actor === 'player' ? 153 : 109;", "    const baseY = actor === 'player' ? 303 : 202;");
  text = replaceMethod(text, "  private baseBattleSize(championId: string, actor: BattleActor): { width: number; height: number } {", '  private statusVisualScale(', `  private baseBattleSize(championId: string, actor: BattleActor): { width: number; height: number } {
    if (championId === 'garen') return actor === 'player' ? { width: 248, height: 251 } : { width: 218, height: 225 };
    return { width: 195, height: 218 };
  }`);
  text = text.replace("    layer.add(this.add.image(0, 0, 'battle-ui-v2', frame).setOrigin(0.5));", "    layer.add(this.add.image(0, 0, 'battle-ui-960', frame).setOrigin(0.5));");

  text = text.replace(
`      const prompt = UiKit.button(this, 452, 181, 92, 18, 'A · CONTINUAR', done, {
        accent: 'green', fontSize: UI.font.tiny, selected: true
      });
      this.continueLayer = this.add.container(0, 0, [prompt.button, prompt.label]).setDepth(11500);`,
`      const prompt = UiKit.button(this, 866, 338, 172, 30, 'A · CONTINUAR', done, {
        accent: 'green', fontSize: '12px', selected: true
      });
      this.continueLayer = this.add.container(0, 0, [prompt.button, prompt.label]).setDepth(11500);`);

  text = text.replaceAll("this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);", "this.overlayLayer = this.add.container(0, 0, objects).setScale(1.875).setDepth(12000);");
  return text;
});

console.log('v16.1 UI960 patch aplicada');
