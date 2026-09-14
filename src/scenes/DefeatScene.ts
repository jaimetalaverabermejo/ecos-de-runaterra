import Phaser from 'phaser';
import type { DefeatRecoveryResult } from '../systems/sanctuary/SanctuaryService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class DefeatScene extends Phaser.Scene {
  constructor() {
    super('DefeatScene');
  }

  create(): void {
    const result = this.registry.get('lastDefeat') as DefeatRecoveryResult | undefined;

    this.cameras.main.setBackgroundColor('#050b14');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x2f3148).setAlpha(0.25);
    this.add.rectangle(0, 0, 512, 288, 0x020710, 0.78).setOrigin(0);

    UiKit.framedPanel(this, 54, 34, 404, 220, true);
    this.add.star(256, 74, 8, 7, 18, 0xe9dcff, 1).setStrokeStyle(2, 0x9b7ee8);
    this.add.circle(256, 74, 28, 0x7253b5, 0.12).setStrokeStyle(1, 0xc7b6ff, 0.65);

    UiKit.label(this, 256, 104, 'EL EQUIPO HA CAÍDO', UI.font.title, UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.label(this, 256, 132, 'La luz estelar del santuario alcanza a tus Ecos.', UI.font.body, UI.text.secondary, true).setOrigin(0.5, 0);

    const goldLost = result?.goldLost ?? 0;
    const sanctuaryName = result?.checkpoint.name ?? 'Santuario de Soraka';
    UiKit.label(this, 256, 161, `Has perdido ${goldLost} de oro.`, UI.font.heading, goldLost > 0 ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0);
    UiKit.label(this, 256, 184, `Regresas a ${sanctuaryName}.`, UI.font.small, UI.text.accent, true).setOrigin(0.5, 0);
    UiKit.label(this, 256, 204, 'Todos tus Ecos han recuperado su Vida.', UI.font.tiny, UI.text.muted, true).setOrigin(0.5, 0);

    UiKit.button(this, 256, 232, 152, 28, 'VOLVER AL SANTUARIO', () => {
      this.registry.remove('lastDefeat');
      this.scene.start('WorldScene');
    }, { accent: 'gold', fontSize: UI.font.small });
  }
}
