import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleFocusController, type ConsoleFocusOption } from '../input/ConsoleFocusController';
import { SaveService } from '../systems/save/SaveService';
import { ADVENTURE_CHECKPOINTS, createAdventureCheckpoint, type AdventureCheckpointId } from '../systems/testing/AdventureCheckpoints';

export class AdventureCheckpointScene extends Phaser.Scene {
  private focus?: ConsoleFocusController;
  private page = 0;
  constructor() { super('AdventureCheckpointScene'); }
  create(): void {
    configureSceneLayout(this, 'native-960');
    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    Ui960Kit.panel(this, 50, 30, 860, 480, { alpha: 0.98 });
    Ui960Kit.label(this, 80, 50, 'PRUEBA DE AVENTURA', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 80, 96, 'Elige un momento. Reinicia solo el perfil de prueba; tu aventura se conserva.', '13px', UI.text.secondary);
    const options: ConsoleFocusOption[] = [];
    ADVENTURE_CHECKPOINTS.slice(this.page * 6, this.page * 6 + 6).forEach((point, index) => {
      const x = 80 + (index % 2) * 410, y = 132 + Math.floor(index / 2) * 80;
      const activate = (): void => this.startCheckpoint(point.id);
      const card = this.add.rectangle(x, y, 390, 68, 0x0b2230).setOrigin(0).setStrokeStyle(2, UI.colors.borderSoft).setInteractive({ useHandCursor: true });
      Ui960Kit.label(this, x + 16, y + 12, point.title, '17px', UI.text.gold, true);
      Ui960Kit.label(this, x + 16, y + 42, point.detail, '11px', UI.text.secondary);
      card.on('pointerup', activate);
      options.push({ x: x - 8, y: y + 34, activate });
    });
    const pages = Math.ceil(ADVENTURE_CHECKPOINTS.length / 6);
    const turnPage = (delta: number): void => { this.page = (this.page + delta + pages) % pages; this.scene.restart(); };
    Ui960Kit.label(this, 80, 405, `Página ${this.page + 1} / ${pages}`, '13px', UI.text.secondary);
    for (const [x, label, delta] of [[430, 'ANTERIOR', -1], [620, 'SIGUIENTE', 1]] as const) {
      const activate = (): void => turnPage(delta);
      Ui960Kit.button(this, x, 414, 170, 32, label, activate, { fontSize: '12px' });
      options.push({ x: x - 94, y: 414, activate });
    }
    const back = (): void => { this.scene.start('ProfileSelectScene'); };
    Ui960Kit.button(this, 778, 468, 180, 36, 'VOLVER', back, { fontSize: '13px' });
    options.push({ x: 674, y: 468, activate: back });
    this.focus = new ConsoleFocusController(this, options, back);
    this.input.keyboard?.once('keydown-ESC', back);
  }
  update(): void { this.focus?.update(); }
  private startCheckpoint(id: AdventureCheckpointId): void {
    let profile = SaveService.profiles().find(p => p.kind === 'qa-adventure');
    if (!profile) {
      if (SaveService.profiles().length >= 4) { window.alert('Libera un perfil para crear la partida de prueba. Tu aventura no se sustituirá.'); return; }
      profile = SaveService.createProfile('Prueba de aventura', 'qa-adventure');
    }
    const save = createAdventureCheckpoint(id, profile.name);
    SaveService.setActiveProfile(profile.id);
    SaveService.saveManual(save, profile.id);
    this.registry.set('save', save);
    this.scene.start('WorldScene');
  }
}
