import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { DataRegistry } from '../data/DataRegistry';
import type { SaveGame } from '../state/GameState';
import { ProgressionService, type MasteryGainResult } from '../systems/progression/ProgressionService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

export class ProgressionScene extends Phaser.Scene {
  constructor() {
    super('ProgressionScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    const save = this.registry.get('save') as SaveGame;
    const gains = (this.registry.get('lastMasteryGains') as MasteryGainResult[] | undefined) ?? [];

    Ui960Kit.backdrop(this, 'bandle-bg', 0x506b72, 0.28, 0.76);
    Ui960Kit.header(this, 'PROGRESO DE MAESTRÍA', 'RECOMPENSA DE COMBATE', 'ECOS DE RUNATERRA');
    Ui960Kit.panel(this, 44, 116, 872, 340, { selected: true, alpha: 0.97 });

    gains.slice(0, 5).forEach((gain, index) => {
      const champion = save.party.find((entry) => entry.instanceId === gain.instanceId);
      if (!champion) return;
      const definition = DataRegistry.champion(gain.championId);
      const y = 142 + index * 58;
      const leveled = gain.toMastery > gain.fromMastery;

      Ui960Kit.panel(this, 66, y, 828, 48, { selected: leveled, alt: true, alpha: 0.94 });
      Ui960Kit.label(this, 86, y + 10, definition.name.toUpperCase(), UI960_FONT.small, UI.text.primary, true);
      Ui960Kit.label(this, 300, y + 10, `+${gain.experienceGained} EXP`, UI960_FONT.small, UI.text.accent, true);
      Ui960Kit.label(this, 470, y + 10, leveled ? `M${gain.fromMastery} → M${gain.toMastery}` : `M${gain.toMastery}`, UI960_FONT.small, leveled ? UI.text.gold : UI.text.secondary, true);

      const required = ProgressionService.experienceToNext(champion.mastery);
      const extra = [
        gain.unlockedSlots.length > 0 ? `Desbloqueada: ${gain.unlockedSlots.map((slot) => slot.toUpperCase()).join(', ')}` : '',
        gain.skillPointsGained > 0 ? `+${gain.skillPointsGained} punto${gain.skillPointsGained > 1 ? 's' : ''} de habilidad` : ''
      ].filter(Boolean).join(' · ');
      Ui960Kit.label(this, 622, y + 11, extra || (required > 0 ? `EXP ${champion.masteryExperience}/${required}` : 'MAESTRÍA MÁXIMA'), UI960_FONT.tiny, extra ? UI.text.gold : UI.text.muted, true)
        .setWordWrapWidth(248, true);
    });

    if (gains.length === 0) {
      Ui960Kit.label(this, 480, 292, 'No se obtuvo experiencia.', UI960_FONT.body, UI.text.muted, true).setOrigin(0.5);
    }

    Ui960Kit.separator(this, 480, 480, 870);
    Ui960Kit.label(this, 44, 499, 'El líder recibe 100% · el resto del equipo 70%.', UI960_FONT.tiny, UI.text.secondary, true);
    Ui960Kit.button(this, 840, 505, 170, 42, 'CONTINUAR', () => {
      this.registry.remove('lastMasteryGains');
      this.scene.start('WorldScene');
    }, { selected: true, fontSize: UI960_FONT.small });
  }
}
