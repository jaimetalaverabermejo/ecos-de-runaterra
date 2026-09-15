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
    const appVersion = (this.registry.get('app.version') as string | undefined) ?? 'dev';

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x4d6972).setAlpha(0.72);
    this.add.rectangle(0, 0, 512, 288, 0x03101a, 0.48).setOrigin(0, 0);
    this.add.rectangle(0, 0, 288, 288, 0x03101a, 0.24).setOrigin(0, 0);

    UiKit.label(this, 24, 28, 'ECOS DE', UI.font.heading, UI.text.accent, true);
    UiKit.label(this, 24, 48, 'RUNATERRA', '26px', UI.text.primary, true);
    UiKit.runeDivider(this, 122, 84, 196, true);
    UiKit.label(this, 24, 98, 'VERTICAL SLICE · BANDLE CITY', UI.font.small, UI.text.secondary, true);
    UiKit.label(this, 24, 118, 'Un viaje entre Ecos, Vínculos y regiones.', UI.font.small, UI.text.muted)
      .setWordWrapWidth(240, true)
      .setLineSpacing(2);
    UiKit.label(this, 24, 145, `BUILD v${appVersion}`, UI.font.tiny, UI.text.muted, true);

    this.add.ellipse(136, 274, 186, 28, 0x000000, 0.22);
    if (this.textures.exists('garen-portrait')) {
      this.add.image(142, 284, 'garen-portrait').setOrigin(0.5, 1).setDisplaySize(188, 188).setAlpha(0.95);
    }

    UiKit.framedPanel(this, 294, 18, 204, 252, true);
    this.add.rectangle(298, 22, 196, 38, UI.colors.panelRaised, 0.98).setOrigin(0, 0);
    UiKit.label(this, 396, 31, 'MENÚ PRINCIPAL', UI.font.heading, UI.text.primary, true).setOrigin(0.5, 0);
    UiKit.runeDivider(this, 396, 63, 164, false);

    const lead = save.party[0] ? DataRegistry.champion(save.party[0].championId).name : 'Sin campeón';
    UiKit.label(this, 314, 78, 'PARTIDA LOCAL', UI.font.small, UI.text.gold, true);
    UiKit.label(this, 314, 99, `Líder · ${lead}`, UI.font.body, UI.text.primary, true);
    UiKit.label(this, 314, 120, `Equipo · ${save.party.length}/5`, UI.font.small, UI.text.secondary);
    UiKit.label(this, 314, 138, `Reserva · ${save.storage.length}`, UI.font.small, UI.text.secondary);
    UiKit.label(this, 314, 156, 'Zona · Bandle City', UI.font.small, UI.text.secondary);

    UiKit.button(this, 396, 196, 164, 38, 'CONTINUAR', () => {
      this.scene.start('WorldScene');
    }, { accent: 'green', fontSize: UI.font.heading, selected: true });

    UiKit.button(this, 396, 238, 164, 28, 'PARTIDA GUARDADA', () => undefined, {
      accent: 'blue', fontSize: UI.font.small, disabled: true
    });

    UiKit.label(this, 396, 260, 'Guardado local en este navegador', UI.font.tiny, UI.text.muted)
      .setOrigin(0.5, 0);
  }
}
