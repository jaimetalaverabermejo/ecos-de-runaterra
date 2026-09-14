import Phaser from 'phaser';
import { DataRegistry } from '../data/DataRegistry';
import type { SaveGame } from '../state/GameState';
import { ProgressionService, type MasteryGainResult } from '../systems/progression/ProgressionService';
import { UiKit } from '../ui/components/UiKit';
import { UI } from '../ui/theme/UiTheme';

export class ProgressionScene extends Phaser.Scene {
  constructor() {
    super('ProgressionScene');
  }

  create(): void {
    const save = this.registry.get('save') as SaveGame;
    const gains = (this.registry.get('lastMasteryGains') as MasteryGainResult[] | undefined) ?? [];

    this.cameras.main.setBackgroundColor('#07131e');
    this.add.image(0, 0, 'bandle-bg').setOrigin(0).setDisplaySize(512, 288).setTint(0x506b72).setAlpha(0.34);
    this.add.rectangle(0, 0, 512, 288, 0x03101b, 0.7).setOrigin(0);

    UiKit.framedPanel(this, 18, 14, 476, 260, true);
    this.add.rectangle(22, 18, 468, 42, UI.colors.panelRaised, 1).setOrigin(0);
    UiKit.label(this, 34, 24, 'PROGRESO DE MAESTRÍA', UI.font.title, UI.text.primary, true);
    UiKit.label(this, 34, 45, 'RECOMPENSA DE COMBATE', UI.font.tiny, UI.text.accent, true);
    UiKit.runeDivider(this, 256, 66, 420, true);

    gains.slice(0, 5).forEach((gain, index) => {
      const champion = save.party.find((entry) => entry.instanceId === gain.instanceId);
      if (!champion) return;
      const definition = DataRegistry.champion(gain.championId);
      const y = 78 + index * 36;
      const leveled = gain.toMastery > gain.fromMastery;

      this.add.rectangle(30, y, 452, 31, leveled ? 0x123e55 : UI.colors.panelAlt, 0.97)
        .setOrigin(0)
        .setStrokeStyle(1, leveled ? UI.colors.gold : UI.colors.borderSoft);
      UiKit.label(this, 42, y + 5, definition.name.toUpperCase(), UI.font.small, UI.text.primary, true);
      UiKit.label(this, 152, y + 5, `+${gain.experienceGained} EXP`, UI.font.small, UI.text.accent, true);
      UiKit.label(this, 246, y + 5, leveled ? `M${gain.fromMastery} → M${gain.toMastery}` : `M${gain.toMastery}`, UI.font.small, leveled ? UI.text.gold : UI.text.secondary, true);

      const required = ProgressionService.experienceToNext(champion.mastery);
      const extra = [
        gain.unlockedSlots.length > 0 ? `Desbloqueada: ${gain.unlockedSlots.map((slot) => slot.toUpperCase()).join(', ')}` : '',
        gain.skillPointsGained > 0 ? `+${gain.skillPointsGained} punto${gain.skillPointsGained > 1 ? 's' : ''} de habilidad` : ''
      ].filter(Boolean).join(' · ');
      UiKit.label(this, 42, y + 18, extra || (required > 0 ? `EXP ${champion.masteryExperience}/${required}` : 'MAESTRÍA MÁXIMA'), UI.font.tiny, extra ? UI.text.gold : UI.text.muted, true);
    });

    if (gains.length === 0) {
      UiKit.label(this, 256, 140, 'No se obtuvo experiencia.', UI.font.body, UI.text.muted, true).setOrigin(0.5);
    }

    UiKit.label(this, 34, 244, 'El líder recibe 100% · el resto del equipo 70%.', UI.font.tiny, UI.text.secondary, true);
    UiKit.button(this, 442, 249, 84, 26, 'CONTINUAR', () => {
      this.registry.remove('lastMasteryGains');
      this.scene.start('WorldScene');
    }, { accent: 'gold', fontSize: UI.font.small });
  }
}
