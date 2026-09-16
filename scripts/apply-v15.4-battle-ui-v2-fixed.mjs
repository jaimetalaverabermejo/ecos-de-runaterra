import fs from 'node:fs';

function edit(path, fn) {
  const before = fs.readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`Sin cambios en ${path}`);
  fs.writeFileSync(path, after);
}
function replaceOnce(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`No se encontró ${label}`);
  return text.replace(before, after);
}
function replaceRegex(text, re, after, label) {
  if (!re.test(text)) throw new Error(`No se encontró ${label}`);
  return text.replace(re, after);
}

edit('src/scenes/BootScene.ts', (text) => {
  text = replaceOnce(text,
    "import { V15TestRosterService } from '../systems/testing/V15TestRosterService';",
    "import { V15TestRosterService } from '../systems/testing/V15TestRosterService';\nimport { BATTLE_UI_ATLAS_DATA_URI, BATTLE_UI_FRAMES } from '../ui/battle/v2/assets';",
    'import battle UI');
  text = replaceOnce(text,
    "    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png');",
    "    this.load.image('battle-ui-v2', BATTLE_UI_ATLAS_DATA_URI);\n    this.load.image('bandle-bg', './assets/world/regions/bandle-city/zones/portal-clearing/overworld.png');",
    'preload battle UI');
  text = replaceOnce(text,
    "    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);",
    "    this.textures.get('battle-ui-v2').setFilter(Phaser.Textures.FilterMode.NEAREST);\n    const battleUiTexture = this.textures.get('battle-ui-v2');\n    for (const [frameName, frame] of Object.entries(BATTLE_UI_FRAMES)) {\n      battleUiTexture.add(frameName, 0, frame.x, frame.y, frame.w, frame.h);\n    }\n\n    this.textures.get('bandle-bg').setFilter(Phaser.Textures.FilterMode.NEAREST);",
    'register atlas frames');
  text = replaceOnce(text, "this.registry.set('app.version', '15.3.1 TEST');", "this.registry.set('app.version', '15.4 TEST');", 'version');
  return text;
});

edit('src/scenes/BattleScene.ts', (text) => {
  text = replaceOnce(text,
`interface HpUi {
  fill: Phaser.GameObjects.Rectangle;
  shieldFill: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  affinityText: Phaser.GameObjects.Text;
  statusLayer: Phaser.GameObjects.Container;`,
`interface HpUi {
  fill: Phaser.GameObjects.Rectangle;
  shieldFill: Phaser.GameObjects.Rectangle;
  expFill: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  typeLayer: Phaser.GameObjects.Container;
  statusLayer: Phaser.GameObjects.Container;`, 'HpUi header');

  text = replaceOnce(text,
`  maxWidth: number;
  maxHp: number;`,
`  maxWidth: number;
  expMaxWidth: number;
  maxHp: number;`, 'HpUi widths');

  text = replaceOnce(text,
    "private actionObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];",
    "private actionObjects: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text> = [];",
    'actionObjects');

  text = replaceRegex(text, /  private drawBattlefield\(\): void \{[\s\S]*?\n  \}\n\n  private createCombatants/, `  private drawBattlefield(): void {
    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(256, 100, 'bandle-bg').setDisplaySize(512, 200).setTint(0xa8c6b3).setAlpha(0.82);
    this.add.rectangle(0, 150, 512, 138, 0x020912, 0.22).setOrigin(0, 0);
    this.add.ellipse(118, 153, 142, 22, 0x000000, 0.2);
    this.add.ellipse(386, 109, 104, 17, 0x000000, 0.17);
  }

  private createCombatants`, 'drawBattlefield');

  text = replaceOnce(text, "this.playerSprite = this.add.image(126, 180, playerTexture).setOrigin(0.5, 1);", "this.playerSprite = this.add.image(118, 153, playerTexture).setOrigin(0.5, 1);", 'player sprite');
  text = replaceOnce(text, "this.wildSprite = this.add.image(402, 121, wildTexture).setOrigin(0.5, 1);", "this.wildSprite = this.add.image(386, 109, wildTexture).setOrigin(0.5, 1);", 'wild sprite');

  const panelBlock = `  private createPanels(): void {
    this.wildHpUi = this.createHpPanel('enemy', this.wildChampion, this.executionThresholdFor(this.playerChampion));
    this.playerHpUi = this.createHpPanel('player', this.playerChampion);

    this.add.image(6, 164, 'battle-ui-v2', '04_dialog_panel.png').setOrigin(0, 0).setDepth(700);
    this.messageText = UiKit.label(this, 38, 173, '', '8px', UI.text.primary, true)
      .setWordWrapWidth(436, true)
      .setLineSpacing(1)
      .setDepth(710);
  }

  private createHpPanel(variant: 'enemy' | 'player', champion: ChampionInstance, executeThreshold?: number): HpUi {
    const enemy = variant === 'enemy';
    const x = enemy ? 6 : 310;
    const y = enemy ? 6 : 108;
    const panelFrame = enemy ? '02_panel_enemy.png' : '03_panel_player.png';
    const hpFrame = enemy ? '23_hp_bar_frame_enemy.png' : '24_hp_bar_frame_player.png';
    const expFrame = enemy ? '25_exp_bar_frame_enemy.png' : '26_exp_bar_frame_player.png';
    const hpLocalY = enemy ? 23 : 21;
    const hpTextY = enemy ? 34 : 31;
    const expLocalY = enemy ? 42 : 39;
    const masteryX = enemy ? 177 : 158;

    this.add.image(x, y, 'battle-ui-v2', panelFrame).setOrigin(0, 0).setDepth(600);
    const typeLayer = this.add.container(x + 9, y + 9).setDepth(620);
    this.renderTypeIcons(typeLayer, champion);
    UiKit.label(this, x + 34, y + 8, DataRegistry.champion(champion.championId).name.toUpperCase(), '9px', UI.text.primary, true).setDepth(620);
    UiKit.label(this, x + masteryX, y + 9, 'M' + champion.mastery, '7px', UI.text.accent, true).setDepth(620);

    this.add.image(x + 34, y + hpLocalY, 'battle-ui-v2', hpFrame).setOrigin(0, 0).setDepth(620);
    const barX = x + 37;
    const barY = y + hpLocalY + 4.5;
    const maxWidth = 148;
    const fill = this.add.rectangle(barX, barY, maxWidth, 5, UI.colors.hp, 1).setOrigin(0, 0.5).setDepth(615);
    const shieldFill = this.add.rectangle(barX, barY, 0, 5, 0xe8f6ff, 0.98).setOrigin(0, 0.5).setVisible(false).setDepth(618);
    const text = UiKit.label(this, x + 131, y + hpTextY, '', '7px', UI.text.primary, true).setDepth(625);

    this.add.image(x + 34, y + expLocalY, 'battle-ui-v2', expFrame).setOrigin(0, 0).setDepth(620);
    const expFill = this.add.rectangle(x + 37, y + expLocalY + 3, 148, 3, 0x5fd8ff, 1).setOrigin(0, 0.5).setDepth(615);
    const statusLayer = this.add.container(x + 10, y + (enemy ? 58 : 52)).setDepth(630);

    let executeMarker: Phaser.GameObjects.Rectangle | undefined;
    if (executeThreshold !== undefined) {
      executeMarker = this.add.rectangle(barX + maxWidth * executeThreshold, barY, 2, 11, 0xffffff, 0.9).setDepth(626);
    }
    return { fill, shieldFill, expFill, text, typeLayer, statusLayer, executeMarker, executeThreshold, maxWidth, expMaxWidth: 148, maxHp: this.statsForChampion(champion).hp, barX, barY, showNumbers: true };
  }

  private renderTypeIcons(layer: Phaser.GameObjects.Container, champion: ChampionInstance): void {
    layer.removeAll(true);
    const ids = TypeEffectivenessService.defenderTypes(champion, this.currentFormId(champion));
    ids.slice(0, 2).forEach((id, index) => {
      const y = ids.length === 1 ? 8 : index * 16;
      layer.add(this.add.image(0, y, 'battle-ui-v2', this.typeFrame(id)).setOrigin(0, 0));
    });
  }

  private typeFrame(id: string): string {
    const frames: Record<string, string> = {
      marcial: '11_type_marcial.png', arcano: '12_type_arcano.png', espiritual: '13_type_espiritual.png',
      tecnologico: '14_type_tecnologico.png', primordial: '15_type_primordial.png', sombrio: '16_type_sombrio.png',
      celestial: '17_type_celestial.png', vacio: '18_type_vacio.png', runico: '19_type_runico.png'
    };
    return frames[id] ?? '19_type_runico.png';
  }

  private createActions(): void {
    const skillIds = SpecialEffectEngine.skillIds(this.playerChampion, this.ensureFormStore());
    const slots: ActiveSkillSlot[] = ['q', 'w', 'e', 'r'];
    const positions = [{ x: 8, y: 211 }, { x: 108, y: 211 }, { x: 208, y: 211 }, { x: 308, y: 211 }];

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

    this.createSideActionButton(418, 201, '20_action_switch.png', 'CAMBIAR', () => this.openManualSwitch(), this.availableReplacements().length === 0);
    this.createSideActionButton(418, 230, '21_action_items.png', 'OBJETOS', () => this.openBattleItems(), this.battleItems().length === 0);
    this.createSideActionButton(418, 259, '22_action_flee.png', 'HUIR', () => this.flee(), false);
  }

  private createSkillActionButton(x: number, y: number, skill: SkillDefinition, slot: ActiveSkillSlot, rank: number, effectivenessGlyph: string, onClick: () => void, disabled = false): void {
    const baseFrame = disabled ? '07_skill_card_disabled.png' : '05_skill_card_base.png';
    const card = this.add.image(x, y, 'battle-ui-v2', baseFrame).setOrigin(0, 0).setDepth(720);
    if (!disabled) {
      card.setInteractive({ useHandCursor: true });
      card.on(Phaser.Input.Events.POINTER_OVER, () => card.setFrame('06_skill_card_selected.png'));
      card.on(Phaser.Input.Events.POINTER_OUT, () => card.setFrame('05_skill_card_base.png'));
      card.on(Phaser.Input.Events.POINTER_DOWN, () => card.setFrame('06_skill_card_selected.png'));
      card.on(Phaser.Input.Events.POINTER_UP, () => { card.setFrame('05_skill_card_base.png'); onClick(); });
    }

    const fontSize = skill.name.length > 15 ? '6px' : '7px';
    const name = UiKit.label(this, x + 38, y + 5, skill.name.toUpperCase(), fontSize, disabled ? UI.text.muted : UI.text.primary, true)
      .setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(62, true).setDepth(730);
    if (skill.affinityId) {
      this.actionObjects.push(this.add.image(x + 38, y + 29, 'battle-ui-v2', this.typeFrame(skill.affinityId)).setOrigin(0.5).setDepth(730));
    }
    const glyph = UiKit.label(this, x + 62, y + 25, effectivenessGlyph, '7px', disabled ? UI.text.muted : UI.text.accent, true).setOrigin(0.5).setDepth(730);

    const maxRank = ProgressionService.maxRank(slot);
    const dotXs = slot === 'r' ? [25, 34, 43] : [16, 25, 34, 43, 52];
    for (let i = 0; i < maxRank; i += 1) {
      const frame = i < rank ? '29_rank_dot_filled.png' : '30_rank_dot_empty.png';
      this.actionObjects.push(this.add.image(x + dotXs[i], y + 47, 'battle-ui-v2', frame).setOrigin(0, 0).setDepth(730));
    }

    const infoButton = this.add.rectangle(x + 69, y + 7, 9, 9, 0x031523, 0.86).setStrokeStyle(1, 0x70d8ff, 0.7).setDepth(735).setInteractive({ useHandCursor: true });
    const infoLabel = UiKit.label(this, x + 69, y + 6, 'i', '6px', UI.text.accent, true).setOrigin(0.5).setDepth(736);
    infoButton.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.openSkillInfo(skill, rank);
    });
    this.actionObjects.push(card, name, glyph, infoButton, infoLabel);
  }

  private createSideActionButton(x: number, y: number, iconFrame: string, labelText: string, onClick: () => void, disabled: boolean): void {
    const baseFrame = disabled ? '10_side_button_disabled.png' : '08_side_button_base.png';
    const button = this.add.image(x, y, 'battle-ui-v2', baseFrame).setOrigin(0, 0).setDepth(720);
    if (!disabled) {
      button.setInteractive({ useHandCursor: true });
      button.on(Phaser.Input.Events.POINTER_OVER, () => button.setFrame('09_side_button_selected.png'));
      button.on(Phaser.Input.Events.POINTER_OUT, () => button.setFrame('08_side_button_base.png'));
      button.on(Phaser.Input.Events.POINTER_DOWN, () => button.setFrame('09_side_button_selected.png'));
      button.on(Phaser.Input.Events.POINTER_UP, () => { button.setFrame('08_side_button_base.png'); onClick(); });
    }
    const icon = this.add.image(x + 16, y + 13, 'battle-ui-v2', iconFrame).setOrigin(0.5).setDepth(730);
    const label = UiKit.label(this, x + 57, y + 8, labelText, '8px', disabled ? UI.text.muted : UI.text.primary, true).setOrigin(0.5, 0).setDepth(730);
    this.actionObjects.push(button, icon, label);
  }

  private openSkillInfo(skill: SkillDefinition, rank: number): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || this.overlayLayer) return;
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(256, 144, 512, 288, 0x020912, 0.76));
    objects.push(this.add.image(61, 56, 'battle-ui-v2', '42_skill_info_popup.png').setOrigin(0, 0));
    objects.push(UiKit.label(this, 79, 68, skill.name.toUpperCase(), UI.font.title, UI.text.primary, true));
    objects.push(UiKit.label(this, 367, 68, rank > 0 ? 'R' + rank : 'M' + skill.unlockMastery, UI.font.tiny, rank > 0 ? UI.text.accent : UI.text.muted, true));
    objects.push(UiKit.label(this, 79, 101, COMBAT_SKILL_DESCRIPTIONS[skill.id] ?? 'Habilidad de combate del Eco.', UI.font.small, UI.text.secondary, true).setWordWrapWidth(354, true).setLineSpacing(4));
    const tags = this.skillEffectTags(skill);
    if (tags) objects.push(UiKit.label(this, 79, 189, tags, UI.font.tiny, UI.text.gold, true).setWordWrapWidth(354, true));
    const close = UiKit.button(this, 256, 218, 96, 24, 'CERRAR', () => { this.overlayLayer?.destroy(true); this.overlayLayer = undefined; }, { accent: 'neutral', fontSize: UI.font.tiny });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  }

`;

  text = replaceRegex(text, /  private createPanels\(\): void \{[\s\S]*?\n  private skillEffectTags/, panelBlock + '  private skillEffectTags', 'panels/actions');

  text = replaceRegex(text, /  private refreshUi\(\): void \{[\s\S]*?\n  \}\n\n  private updateHpUi/, `  private refreshUi(): void {
    this.refreshCombatStats();
    this.playerHpUi.maxHp = this.playerStats.hp;
    this.wildHpUi.maxHp = this.wildStats.hp;
    this.playerHp = Math.min(this.playerHp, this.playerStats.hp);
    this.wildHp = Math.min(this.wildHp, this.wildStats.hp);
    this.renderTypeIcons(this.playerHpUi.typeLayer, this.playerChampion);
    this.renderTypeIcons(this.wildHpUi.typeLayer, this.wildChampion);
    this.playerHpUi.expFill.displayWidth = this.playerHpUi.expMaxWidth * ProgressionService.experienceRatio(this.playerChampion);
    this.wildHpUi.expFill.displayWidth = this.wildHpUi.expMaxWidth * ProgressionService.experienceRatio(this.wildChampion);
    this.updateHpUi(this.playerHpUi, this.playerHp, this.statusesFor(this.playerChampion));
    this.updateHpUi(this.wildHpUi, this.wildHp, this.statusesFor(this.wildChampion));
    this.playerChampion.currentHp = Math.max(0, this.playerHp);
    this.wildChampion.currentHp = Math.max(0, this.wildHp);
    this.refreshCombatVisuals();
  }

  private updateHpUi`, 'refreshUi');

  text = replaceRegex(text, /  private renderStatusIcons\(layer: Phaser\.GameObjects\.Container, statuses: CombatStatusInstance\[\]\): void \{[\s\S]*?\n  \}\n\n  private statusSymbol/, `  private renderStatusIcons(layer: Phaser.GameObjects.Container, statuses: CombatStatusInstance[]): void {
    layer.removeAll(true);
    const visibleStatuses = statuses.filter((status) => status.kind !== 'explosive');
    visibleStatuses.slice(0, 7).forEach((status, index) => {
      const x = index * 14;
      const frames: Partial<Record<CombatStatusInstance['kind'], string>> = {
        poison: '31_status_poison.png', blind: '32_status_blind.png', stun: '33_status_stun.png', shield: '34_status_shield.png',
        evasion: '35_status_evasion.png', polymorph: '36_status_polymorph.png', banish: '37_status_banish.png'
      };
      const frame = frames[status.kind];
      if (frame) layer.add(this.add.image(x, 0, 'battle-ui-v2', frame).setOrigin(0, 0));
      else {
        const color = status.beneficial ? 0x3eaf72 : 0xc85c64;
        const circle = this.add.circle(x + 6, 6, 6, color, 0.96).setStrokeStyle(1, 0x07131e, 0.9);
        const symbol = UiKit.label(this, x + 6, 5, this.statusSymbol(status), '7px', '#ffffff', true).setOrigin(0.5);
        layer.add([circle, symbol]);
      }
    });
  }

  private statusSymbol`, 'status icons');

  text = replaceRegex(text, /  private renderCombatantMarker\(actor: BattleActor, width: number, height: number, groundY: number\): void \{[\s\S]*?\n  \}\n\n  private affinityLabelFor/, `  private renderCombatantMarker(actor: BattleActor, width: number, height: number, groundY: number): void {
    const champion = actor === 'player' ? this.playerChampion : this.wildChampion;
    const sprite = actor === 'player' ? this.playerSprite : this.wildSprite;
    const layer = actor === 'player' ? this.playerEffectLayer : this.wildEffectLayer;
    if (!layer || !sprite) return;
    layer.removeAll(true);
    const explosive = this.statusesFor(champion).find((status) => status.kind === 'explosive');
    if (!explosive) return;
    const stacks = Math.max(0, explosive.stacks ?? 0);
    const frame = stacks <= 0 ? '38_bomb_charge_0.png' : stacks === 1 ? '39_bomb_charge_1.png' : stacks === 2 ? '40_bomb_charge_2.png' : '41_bomb_charge_3.png';
    layer.setPosition(sprite.x + width * 0.38, groundY - height * 0.7);
    layer.add(this.add.image(0, 0, 'battle-ui-v2', frame).setOrigin(0.5));
  }

  private affinityLabelFor`, 'bomb marker');

  text = replaceOnce(text, "const baseY = actor === 'player' ? 180 : 121;", "const baseY = actor === 'player' ? 153 : 109;", 'battle baseY');
  return text;
});

edit('package.json', (text) => replaceOnce(text, '"version": "0.15.3-test.1"', '"version": "0.15.4-test.0"', 'package version'));
console.log('v15.4 battle UI v2 aplicada');
