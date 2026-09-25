import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { DefeatRecoveryResult } from '../systems/sanctuary/SanctuaryService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleInput } from '../input/ConsoleInput';

export class DefeatScene extends Phaser.Scene {
  constructor() {
    super('DefeatScene');
  }

  update(): void {
    if (ConsoleInput.consumeA() || ConsoleInput.consumeB()) {
      this.registry.remove('lastDefeat');
      this.scene.start('WorldScene');
    }
    ConsoleInput.consumeDirection();
  }


  create(): void {
    configureSceneLayout(this, 'native-960');
    const result = this.registry.get('lastDefeat') as DefeatRecoveryResult | undefined;

    Ui960Kit.backdrop(this, 'bandle-bg', 0x2f3148, 0.22, 0.82);
    Ui960Kit.panel(this, 160, 80, 640, 380, { selected: true, alpha: 0.98 });
    this.add.circle(480, 158, 52, 0x7253b5, 0.12).setStrokeStyle(2, 0xc7b6ff, 0.7);
    this.add.star(480, 158, 8, 13, 34, 0xe9dcff, 1).setStrokeStyle(3, 0x9b7ee8);

    Ui960Kit.label(this, 480, 220, 'EL EQUIPO HA CAÍDO', UI960_FONT.title, UI.text.primary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 480, 274, 'La luz estelar del santuario alcanza a tus Ecos.', UI960_FONT.body, UI.text.secondary, true).setOrigin(0.5, 0);

    const goldLost = result?.goldLost ?? 0;
    const sanctuaryName = result?.checkpoint.name ?? 'Santuario de Soraka';
    Ui960Kit.label(this, 480, 322, `Has perdido ${goldLost} de oro.`, UI960_FONT.heading, goldLost > 0 ? UI.text.gold : UI.text.secondary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 480, 360, `Regresas a ${sanctuaryName}.`, UI960_FONT.small, UI.text.accent, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, 480, 392, 'Todos tus Ecos han recuperado su Vida.', UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5, 0);

    Ui960Kit.button(this, 480, 430, 250, 46, 'VOLVER AL SANTUARIO', () => {
      this.registry.remove('lastDefeat');
      this.scene.start('WorldScene');
    }, { selected: true, fontSize: UI960_FONT.small });
  }
}
