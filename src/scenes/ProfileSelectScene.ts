import Phaser from 'phaser';
import { configureSceneLayout } from '../config/GameDimensions';
import { SaveService, type SaveProfile, type SaveProfileKind } from '../systems/save/SaveService';
import { Ui960Kit, UI960_FONT } from '../ui/components/Ui960Kit';
import { UI } from '../ui/theme/UiTheme';
import { ConsoleFocusController, type ConsoleFocusOption } from '../input/ConsoleFocusController';

export class ProfileSelectScene extends Phaser.Scene {
  private consoleOptions: ConsoleFocusOption[] = [];
  private consoleFocus?: ConsoleFocusController;

  constructor() {
    super('ProfileSelectScene');
  }

  create(): void {
    configureSceneLayout(this, 'native-960');
    SaveService.initialize();
    this.consoleOptions = [];

    this.add.image(480, 270, 'ui960-title-bg').setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x01101a, 0.48).setOrigin(0);
    Ui960Kit.panel(this, 70, 42, 820, 456, { alpha: 0.97 });

    Ui960Kit.label(this, 102, 66, 'PERFILES', UI960_FONT.title, UI.text.primary, true);
    Ui960Kit.label(this, 854, 74, 'ECOS DE RUNATERRA', UI960_FONT.tiny, UI.text.accent, true).setOrigin(1, 0);
    Ui960Kit.separator(this, 480, 106, 720);

    const profiles = SaveService.profiles();
    if (profiles.length === 0) {
      Ui960Kit.label(this, 480, 190, 'Todavía no hay ningún perfil.', UI960_FONT.heading, UI.text.secondary, true).setOrigin(0.5);
      Ui960Kit.label(this, 480, 226, 'Crea uno para empezar una aventura o una partida de pruebas.', UI960_FONT.small, UI.text.muted, true).setOrigin(0.5);
    } else {
      profiles.slice(0, 4).forEach((profile, index) => this.createProfileRow(profile, 120 + index * 72));
    }

    Ui960Kit.separator(this, 480, 412, 720);
    const createStory = () => this.createProfile('story');
    const createProgression = () => this.createProfile('qa-progression');
    const createCombat = () => this.createProfile('qa-combat');

    Ui960Kit.button(this, 212, 454, 210, 42, '+ NUEVO PERFIL', createStory, {
      selected: true,
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 480, 454, 210, 42, '+ QA PROGRESIÓN', createProgression, {
      fontSize: UI960_FONT.small
    });
    Ui960Kit.button(this, 748, 454, 210, 42, '+ QA COMBATE', createCombat, {
      fontSize: UI960_FONT.small
    });

    this.consoleOptions.push(
      { x: 92, y: 454, activate: createStory },
      { x: 360, y: 454, activate: createProgression },
      { x: 628, y: 454, activate: createCombat }
    );
    this.consoleFocus = new ConsoleFocusController(this, this.consoleOptions, () => this.scene.start('TitleScene'));

    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('TitleScene'));
  }

  private createProfileRow(profile: SaveProfile, y: number): void {
    const save = SaveService.loadManual(profile.id);
    const panel = this.add.rectangle(112, y, 620, 60, 0x0b2230, 0.94)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x31536a)
      .setInteractive({ useHandCursor: true });

    const kind = this.kindLabel(profile.kind);
    const zone = save?.worldProgress.currentZoneId.replaceAll('-', ' ') ?? 'Sin partida guardada';
    const team = save ? `${save.party.length}/5 Ecos` : 'Nueva aventura';

    Ui960Kit.label(this, 132, y + 9, profile.name.toUpperCase(), UI960_FONT.small, UI.text.primary, true);
    Ui960Kit.label(this, 132, y + 34, `${kind} · ${zone}`, '11px', UI.text.secondary);
    Ui960Kit.label(this, 706, y + 11, team, '11px', UI.text.gold, true).setOrigin(1, 0);

    panel.on(Phaser.Input.Events.POINTER_OVER, () => panel.setStrokeStyle(3, 0x79d7e8));
    panel.on(Phaser.Input.Events.POINTER_OUT, () => panel.setStrokeStyle(2, 0x31536a));
    const selectProfile = (): void => {
      SaveService.setActiveProfile(profile.id);
      this.scene.start('SaveSelectScene');
    };
    panel.on(Phaser.Input.Events.POINTER_UP, selectProfile);
    this.consoleOptions.push({ x: 98, y: y + 30, activate: selectProfile });

    const rename = Ui960Kit.button(this, 780, y + 18, 110, 30, 'RENOMBRAR', () => this.renameProfile(profile), {
      fontSize: '9px'
    });
    const remove = Ui960Kit.button(this, 780, y + 48, 110, 30, 'BORRAR', () => this.deleteProfile(profile), {
      fontSize: '9px'
    });
    rename.button.setDepth(20);
    rename.label.setDepth(21);
    remove.button.setDepth(20);
    remove.label.setDepth(21);
  }

  update(): void {
    this.consoleFocus?.update();
  }

  private createProfile(kind: SaveProfileKind): void {
    if (SaveService.profiles().length >= 4) {
      window.alert('Puedes tener hasta 4 perfiles locales en esta versión.');
      return;
    }

    const suggested = kind === 'story'
      ? 'Nueva aventura'
      : kind === 'qa-progression'
        ? 'QA Progresión'
        : 'QA Combate';
    const name = window.prompt('Nombre del perfil:', suggested)?.trim();
    if (!name) return;

    const profile = SaveService.createProfile(name, kind);
    SaveService.setActiveProfile(profile.id);
    this.scene.restart();
  }

  private renameProfile(profile: SaveProfile): void {
    const name = window.prompt('Nuevo nombre del perfil:', profile.name)?.trim();
    if (!name) return;
    SaveService.renameProfile(profile.id, name);
    this.scene.restart();
  }

  private deleteProfile(profile: SaveProfile): void {
    if (!window.confirm(`¿Borrar el perfil "${profile.name}" y todas sus partidas? Esta acción no se puede deshacer.`)) return;
    SaveService.deleteProfile(profile.id);
    this.scene.restart();
  }

  private kindLabel(kind: SaveProfileKind): string {
    if (kind === 'qa-progression') return 'QA PROGRESIÓN';
    if (kind === 'qa-combat') return 'QA COMBATE';
    if (kind === 'legacy') return 'LEGACY';
    return 'HISTORIA';
  }
}
