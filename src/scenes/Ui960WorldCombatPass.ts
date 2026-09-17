import Phaser from 'phaser';
import { BattleScene } from './BattleScene';
import { WorldScene } from './WorldScene';
import { DataRegistry } from '../data/DataRegistry';
import { COMBAT_SKILL_DESCRIPTIONS } from '../data/skills/combatDescriptions';
import { InventoryService } from '../systems/inventory/InventoryService';
import { LinkService } from '../systems/link/LinkService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

function closeOverlay(scene: any): void {
  scene.overlayLayer?.destroy(true);
  scene.overlayLayer = undefined;
}

function textureForChampion(scene: Phaser.Scene, championId: string): string | null {
  const portrait = `${championId}-portrait`;
  if (scene.textures.exists(portrait)) return portrait;
  const front = `${championId}-battle-front`;
  return scene.textures.exists(front) ? front : null;
}

function addHudContainer(scene: any, objects: Phaser.GameObjects.GameObject[], depth: number): Phaser.GameObjects.Container {
  const zoom = scene.cameras.main.zoom;
  const hudX = (scene.cameras.main.width / 2) * (1 - 1 / zoom);
  const hudY = (scene.cameras.main.height / 2) * (1 - 1 / zoom);
  return scene.add.container(hudX, hudY, objects)
    .setScrollFactor(0)
    .setScale(1 / zoom)
    .setDepth(depth);
}

export function applyUi960WorldCombatPass(): void {
  applyBattleUiPass();
  applyWorldUiPass();
}

function applyBattleUiPass(): void {
  const prototype = BattleScene.prototype as any;
  if (prototype.__ui960WorldCombatPassApplied) return;
  prototype.__ui960WorldCombatPassApplied = true;

  prototype.openSkillInfo = function (skill: any, rank: number): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue || this.overlayLayer) return;

    const objects: Phaser.GameObjects.GameObject[] = [];
    const blocker = this.add.rectangle(480, 270, 960, 540, 0x020912, 0.30).setInteractive();
    objects.push(blocker);
    objects.push(this.add.image(480, 270, 'ui960a-panel-content-medium').setDisplaySize(480, 250));

    const affinity = skill.affinityId ? DataRegistry.affinity(skill.affinityId).name.toUpperCase() : 'SIN TIPO';
    const rankLabel = rank > 0 ? `RANGO ${rank}` : `DESBLOQUEO M${skill.unlockMastery}`;
    objects.push(Ui960Kit.label(this, 278, 172, skill.name.toUpperCase(), UI960_FONT.heading, UI.text.primary, true));
    objects.push(Ui960Kit.label(this, 682, 178, rankLabel, UI960_FONT.tiny, rank > 0 ? UI.text.gold : UI.text.muted, true).setOrigin(1, 0));
    objects.push(Ui960Kit.separator(this, 480, 210, 400));
    objects.push(Ui960Kit.label(this, 278, 226, COMBAT_SKILL_DESCRIPTIONS[skill.id] ?? 'Habilidad de combate del Eco.', UI960_FONT.small, UI.text.secondary)
      .setWordWrapWidth(404, true)
      .setLineSpacing(3));

    const tags = this.skillEffectTags(skill);
    objects.push(Ui960Kit.label(this, 278, 310, `${affinity}${tags ? ` · ${tags}` : ''}`, UI960_FONT.tiny, UI.text.gold, true)
      .setWordWrapWidth(404, true));

    const close = Ui960Kit.button(this, 480, 362, 140, 42, 'CERRAR', () => closeOverlay(this), { selected: true, fontSize: UI960_FONT.small });
    objects.push(close.button, close.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  };

  prototype.showSwitchOverlay = function (available: any[], manual: boolean): void {
    closeOverlay(this);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const blocker = this.add.rectangle(480, 270, 960, 540, 0x020912, 0.58).setInteractive();
    objects.push(blocker);
    objects.push(this.add.image(480, 270, 'ui960a-panel-content-large').setDisplaySize(620, 390));
    objects.push(Ui960Kit.label(this, 210, 100, manual ? 'CAMBIAR ECO' : 'ELIGE TU SIGUIENTE ECO', UI960_FONT.title, UI.text.primary, true));
    objects.push(Ui960Kit.label(this, 212, 139, manual ? 'Cambiar consume el turno.' : 'Los Ecos debilitados no pueden volver al combate.', UI960_FONT.tiny, UI.text.secondary, true));
    objects.push(Ui960Kit.separator(this, 480, 166, 530));

    available.slice(0, 4).forEach((champion: any, index: number) => {
      const definition = DataRegistry.champion(champion.championId);
      const stats = this.statsForChampion(champion);
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 205 + col * 285;
      const y = 184 + row * 116;
      const frame = this.add.image(x, y, 'ui960a-panel-section-medium').setOrigin(0).setDisplaySize(260, 104);
      const hit = this.add.rectangle(x, y, 260, 104, 0x000000, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on(Phaser.Input.Events.POINTER_OVER, () => frame.setTint(0xffedb3));
      hit.on(Phaser.Input.Events.POINTER_OUT, () => frame.clearTint());
      hit.on(Phaser.Input.Events.POINTER_UP, () => this.selectReplacement(champion, manual));
      objects.push(frame, hit);

      objects.push(this.add.image(x + 48, y + 52, 'ui960a-item-frame-thin').setDisplaySize(68, 68));
      const texture = textureForChampion(this, champion.championId);
      if (texture) objects.push(this.add.image(x + 48, y + 52, texture).setDisplaySize(58, 58));
      objects.push(Ui960Kit.label(this, x + 90, y + 20, definition.name.toUpperCase(), UI960_FONT.small, UI.text.primary, true));
      objects.push(Ui960Kit.label(this, x + 90, y + 45, `M${champion.mastery}`, UI960_FONT.tiny, UI.text.gold, true));
      objects.push(Ui960Kit.label(this, x + 232, y + 45, `${champion.currentHp}/${stats.hp}`, UI960_FONT.tiny, UI.text.secondary, true).setOrigin(1, 0));
      const hp = Ui960Kit.progress(this, x + 90, y + 76, 142, 10, champion.currentHp / stats.hp, UI.colors.hp);
      objects.push(hp.track, hp.fill);
    });

    if (manual) {
      const cancel = Ui960Kit.button(this, 480, 438, 150, 42, 'CANCELAR', () => {
        closeOverlay(this);
        this.awaitingSwitch = false;
      }, { fontSize: UI960_FONT.small });
      objects.push(cancel.button, cancel.label);
    }

    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  };

  prototype.openBattleItems = function (): void {
    if (this.busy || this.battleEnded || this.awaitingSwitch || this.awaitingContinue) return;
    const items = this.battleItems();
    if (items.length === 0) return;

    closeOverlay(this);
    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 960, 540, 0x020912, 0.58).setInteractive());
    objects.push(this.add.image(480, 270, 'ui960a-panel-content-large').setDisplaySize(650, 410));
    objects.push(Ui960Kit.label(this, 190, 86, 'OBJETOS DE COMBATE', UI960_FONT.title, UI.text.primary, true));
    objects.push(Ui960Kit.label(this, 192, 126, 'Usar un objeto consume el turno.', UI960_FONT.tiny, UI.text.secondary, true));
    objects.push(Ui960Kit.separator(this, 480, 151, 560));

    items.slice(0, 6).forEach((item: any, index: number) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const centerX = 325 + col * 315;
      const centerY = 198 + row * 78;
      const quantity = InventoryService.quantity(this.save, item.id);
      const linkerLevel = item.battleEffect?.type === 'echo-link' ? ` · NV ${LinkService.linkerLevel(this.save)}` : '';
      const rowArt = this.add.image(centerX, centerY, 'ui960a-bag-item-row').setDisplaySize(270, 70).setInteractive({ useHandCursor: true });
      rowArt.on(Phaser.Input.Events.POINTER_OVER, () => rowArt.setTexture('ui960a-bag-item-row-selected'));
      rowArt.on(Phaser.Input.Events.POINTER_OUT, () => rowArt.setTexture('ui960a-bag-item-row'));
      rowArt.on(Phaser.Input.Events.POINTER_UP, () => void this.useBattleItem(item));
      objects.push(rowArt);

      objects.push(this.add.image(centerX - 99, centerY, 'ui960a-item-frame-thin').setDisplaySize(52, 52));
      const itemTexture = `item-${item.id}`;
      if (this.textures.exists(itemTexture)) objects.push(this.add.image(centerX - 99, centerY, itemTexture).setDisplaySize(42, 42));
      else objects.push(Ui960Kit.label(this, centerX - 99, centerY - 15, '◇', UI960_FONT.heading, UI.text.accent, true).setOrigin(0.5, 0));
      objects.push(Ui960Kit.label(this, centerX - 61, centerY - 20, item.name.toUpperCase(), '13px', UI.text.primary, true).setWordWrapWidth(145, true));
      const detail = item.battleEffect?.consumes ? `×${quantity}` : `PERMANENTE${linkerLevel}`;
      objects.push(Ui960Kit.label(this, centerX + 119, centerY - 7, detail, '11px', item.battleEffect?.type === 'echo-link' ? UI.text.gold : UI.text.accent, true).setOrigin(1, 0));
    });

    const cancel = Ui960Kit.button(this, 480, 452, 150, 42, 'CANCELAR', () => closeOverlay(this), { fontSize: UI960_FONT.small });
    objects.push(cancel.button, cancel.label);
    this.overlayLayer = this.add.container(0, 0, objects).setDepth(12000);
  };
}

function applyWorldUiPass(): void {
  const prototype = WorldScene.prototype as any;
  if (prototype.__ui960WorldCombatPassApplied) return;
  prototype.__ui960WorldCombatPassApplied = true;

  const originalCreate = prototype.create;
  prototype.create = function (): void {
    originalCreate.call(this);

    const map = DataRegistry.map(this.save.currentMapId);
    const targetName = map.name.toUpperCase();
    const stale: Phaser.GameObjects.GameObject[] = [];
    for (const child of [...this.children.list]) {
      if (child instanceof Phaser.GameObjects.Text && child.text === targetName) stale.push(child);
      if (child instanceof Phaser.GameObjects.Rectangle && Math.abs(child.x - 234) < 1 && Math.abs(child.y - 135) < 1 && child.width === 214 && child.height === 28) stale.push(child);
    }
    stale.forEach((child) => child.destroy());

    const bannerObjects: Phaser.GameObjects.GameObject[] = [];
    bannerObjects.push(this.add.image(42, 44, 'ui960a-panel-section-medium').setOrigin(0).setDisplaySize(410, 64));
    bannerObjects.push(Ui960Kit.label(this, 66, 62, targetName, UI960_FONT.body, UI.text.primary, true));
    const banner = addHudContainer(this, bannerObjects, 9000).setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 180,
      onComplete: () => {
        this.time.delayedCall(2200, () => {
          if (!banner.active) return;
          this.tweens.add({ targets: banner, alpha: 0, duration: 420, onComplete: () => banner.destroy(true) });
        });
      }
    });
  };

  prototype.renderDialogue = function (): void {
    this.dialogueLayer?.destroy(true);
    const node = this.dialogueNode;
    if (!node) return;

    const objects: Phaser.GameObjects.GameObject[] = [];
    objects.push(this.add.rectangle(480, 270, 960, 540, 0x020912, 0.10));
    objects.push(this.add.image(480, 446, 'ui960a-panel-content-large').setDisplaySize(920, 164));
    objects.push(this.add.image(180, 377, 'ui960a-button-action-selected').setDisplaySize(260, 46));
    objects.push(Ui960Kit.label(this, 180, 377, node.speaker.toUpperCase(), UI960_FONT.small, UI.text.gold, true).setOrigin(0.5));
    objects.push(Ui960Kit.label(this, 74, 414, node.lines[this.dialogueLineIndex] ?? '', UI960_FONT.body, UI.text.primary)
      .setWordWrapWidth(610, true)
      .setLineSpacing(4));

    const atEnd = this.dialogueLineIndex >= node.lines.length - 1;
    if (atEnd && node.choices?.length) {
      node.choices.forEach((choice: any, index: number) => {
        const selected = index === this.dialogueChoiceIndex;
        const y = 414 + index * 48;
        const button = Ui960Kit.textureButton(this, 808, y, 230, 42, choice.label.toUpperCase(), () => {
          this.dialogueChoiceIndex = index;
          this.chooseDialogue(choice.nextNodeId);
        }, {
          selected,
          normalTexture: 'ui960a-button-menu',
          selectedTexture: 'ui960a-button-menu-selected',
          fontSize: UI960_FONT.tiny
        });
        objects.push(button.button, button.label);
      });
    } else {
      const action = Ui960Kit.button(this, 816, 488, 180, 42, atEnd ? 'CERRAR' : 'SIGUIENTE', () => this.advanceDialogue(), {
        selected: atEnd,
        fontSize: UI960_FONT.small
      });
      objects.push(action.button, action.label);
    }

    this.dialogueLayer = addHudContainer(this, objects, 10000);
  };
}
