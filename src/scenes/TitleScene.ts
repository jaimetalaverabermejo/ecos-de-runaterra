import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { SaveGame } from '../state/GameState';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    const save = this.registry.get('save') as SaveGame;
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0f1719');
    this.add.rectangle(width / 2, height / 2, width, height, UI.colors.backdrop, 1);
    this.add.rectangle(width / 2, 56, width, 112, 0x1d342d, 1);
    this.add.rectangle(width / 2, 111, width, 3, UI.colors.border, 0.9);

    UiKit.label(this, width / 2, 34, 'ECOS DE RUNATERRA', '24px', UI.text.primary, true).setOrigin(0.5);
    UiKit.label(this, width / 2, 68, 'Vertical Slice · Bandle City', UI.font.body, UI.text.accent, true).setOrigin(0.5);

    const lead = save.party[0] ? DataRegistry.champion(save.party[0].championId).name : 'Sin campeón';
    UiKit.panel(this, 112, 128, 288, 72);
    UiKit.label(this, width / 2, 142, 'PARTIDA LOCAL', UI.font.small, UI.text.muted, true).setOrigin(0.5);
    UiKit.label(this, width / 2, 162, `Equipo ${save.party.length}/5  ·  Líder ${lead}  ·  Reserva ${save.storage.length}`, UI.font.body, UI.text.primary)
      .setOrigin(0.5);

    UiKit.button(this, width / 2, 226, 190, 40, 'CONTINUAR', () => {
      this.scene.start('WorldScene');
    }, { accent: 'green', fontSize: UI.font.heading });

    UiKit.label(this, width / 2, height - 18, 'Guardado local en este navegador', UI.font.tiny, UI.text.muted)
      .setOrigin(0.5);
  }
}
