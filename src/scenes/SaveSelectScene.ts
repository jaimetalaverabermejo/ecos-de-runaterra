import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import type { SaveGame } from '../state/GameState';
import { SaveService, type SaveProfile } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';

export class SaveSelectScene extends Phaser.Scene {
  private profile?: SaveProfile;

  constructor() {
    super('SaveSelectScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    this.profile = SaveService.activeProfile();
    if (!this.profile) {
      this.scene.start('ProfileSelectScene');
      return;
    }

    const manual = SaveService.loadManual(this.profile.id);
    const recovery = SaveService.hasNewerRecovery(this.profile.id)
      ? SaveService.loadRecovery(this.profile.id)
      : undefined;

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.42).setOrigin(0);
    Ui960Kit.panel(this, 66, 48, 828, 444, { alpha: 0.96 });

    Ui960Kit.label(this, 96, 74, 'SELECCIONAR PARTIDA', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 862, 78, this.profile.name.toUpperCase(), UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 480, 112, 724);

    if (manual) this.createContinuePanel(manual);
    else this.createEmptyPanel();

    this.createOption(100, 292, 'NUEVA PARTIDA', manual ? 'Reiniciar este perfil desde cero' : 'Comenzar una nueva aventura', () => this.startNewGame());

    if (recovery) {
      this.createOption(440, 292, 'RECUPERAR SESIÓN', 'Volver al estado previo a un cierre sin guardar', () => this.startSave(recovery));
    } else {
      this.createOption(440, 292, 'CAMBIAR PERFIL', 'Volver a la selección de perfiles', () => this.scene.start('ProfileSelectScene'));
    }

    Ui960Kit.separator(this, 480, 438, 724);
    Ui960Kit.label(this, 104, 458, 'ENTER  Continuar     ESC  Perfiles', UI960_FONT.tiny, UI.text.secondary, true);

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (manual) this.startSave(manual);
    });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('ProfileSelectScene'));
  }

  private createContinuePanel(save: SaveGame): void {
    const panel = this.add.image(100, 130, 'ui960-save-slot')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    Ui960Kit.label(this, 126, 150, 'CONTINUAR', UI960_FONT.heading, UI.text.primary, true);
    Ui960Kit.label(this, 126, 190, save.player.name, UI960_FONT.body, UI.text.primary, true);
    const zone = save.worldProgress.currentZoneId.replaceAll('-', ' ');
    Ui960Kit.label(this, 126, 219, `Bandle · ${zone}`, UI960_FONT.small, UI.text.secondary);
    Ui960Kit.label(this, 474, 153, `EQUIPO ${save.party.length}/5`, UI960_FONT.small, UI.text.gold, true);

    save.party.slice(0, 5).forEach((champion, index) => {
      const texture = `${champion.championId}-portrait`;
      const x = 514 + index * 66;
      Ui960Kit.slot(this, x, 208, 56, index === 0);
      if (this.textures.exists(texture)) this.add.image(x, 208, texture).setDisplaySize(44, 44);
    });

    if (save.party.length === 0) {
      Ui960Kit.label(this, 650, 208, 'SIN ECOS', UI960_FONT.tiny, UI.text.muted, true).setOrigin(0.5);
    }

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setTint(0xd9ffff));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.clearTint());
    panel.on(Phaser.Input.Events.POINTER_UP, () => this.startSave(save));
  }

  private createEmptyPanel(): void {
    this.add.image(100, 130, 'ui960-save-slot').setOrigin(0).setAlpha(0.72);
    Ui960Kit.label(this, 126, 150, 'SIN PARTIDA GUARDADA', UI960_FONT.heading, UI.text.secondary, true);
    Ui960Kit.label(this, 126, 194, 'Este perfil todavía no ha guardado su aventura.', UI960_FONT.small, UI.text.muted);
    Ui960Kit.label(this, 126, 225, 'Empieza una nueva partida para entrar en Runaterra.', UI960_FONT.tiny, UI.text.accent);
  }

  private createOption(x: number, y: number, title: string, subtitle: string, onClick: () => void): void {
    const panel = this.add.image(x, y, 'ui960-save-option')
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });

    Ui960Kit.label(this, x + 160, y + 29, title, UI960_FONT.heading, UI.text.primary, true).setOrigin(0.5, 0);
    Ui960Kit.label(this, x + 160, y + 73, subtitle, UI960_FONT.tiny, UI.text.secondary).setOrigin(0.5, 0);

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setTint(0xd9ffff));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.clearTint());
    panel.on(Phaser.Input.Events.POINTER_UP, onClick);
  }

  private startNewGame(): void {
    const profile = this.profile;
    if (!profile) return;
    if (SaveService.hasManualSave(profile.id) && !window.confirm('¿Empezar de cero? Se sustituirá la partida guardada de este perfil.')) return;

    SaveService.clear(profile.id);
    const fresh = SaveService.createGameForProfile(profile.id);
    this.registry.set('save', fresh);

    if (profile.kind === 'qa-progression' || profile.kind === 'qa-combat') {
      SaveService.saveManual(fresh, profile.id);
      this.scene.start('WorldScene');
      return;
    }

    SaveService.save(fresh, profile.id);
    this.scene.start('IntroScene');
  }

  private startSave(save: SaveGame): void {
    const runtime = JSON.parse(JSON.stringify(save)) as SaveGame;
    this.registry.set('save', runtime);
    const introPending = runtime.worldProgress.flags.includes('story:intro-pending')
      && !runtime.worldProgress.flags.includes('story:intro-complete');
    this.scene.start(introPending ? 'IntroScene' : 'WorldScene');
  }
}
