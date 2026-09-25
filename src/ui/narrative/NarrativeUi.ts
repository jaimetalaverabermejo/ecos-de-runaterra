import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export type NarrativeMode = 'speech' | 'event' | 'narration';

export interface NarrativeFrame {
  objects: Phaser.GameObjects.GameObject[];
  speakerText: Phaser.GameObjects.Text;
  bodyText: Phaser.GameObjects.Text;
  modeIcon: Phaser.GameObjects.Text;
  portraitFrame?: Phaser.GameObjects.Image;
  portraitImage?: Phaser.GameObjects.Image;
}

export function inferNarrativeMode(
  speaker: string,
  explicit?: NarrativeMode
): NarrativeMode {
  if (explicit) return explicit;
  return speaker.trim() ? 'speech' : 'narration';
}

function titleLabel(speaker: string, mode: NarrativeMode): string {
  const normalized = speaker.trim();
  if (mode === 'event') return `EVENTO${normalized ? ` · ${normalized}` : ''}`.toUpperCase();
  if (mode === 'narration') return normalized && normalized.toUpperCase() !== 'NARRACIÓN'
    ? `NARRACIÓN · ${normalized}`.toUpperCase()
    : 'NARRACIÓN';
  return (normalized || '???').toUpperCase();
}

function modeIcon(mode: NarrativeMode): string {
  if (mode === 'event') return '◆';
  if (mode === 'narration') return '◇';
  return '';
}

function titleColor(mode: NarrativeMode): string {
  if (mode === 'event') return UI.text.accent;
  if (mode === 'narration') return UI.text.secondary;
  return UI.text.gold;
}

function createPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  if (scene.textures.exists('ui960-panel')) {
    return scene.add.image(x, y, 'ui960-panel').setOrigin(0).setDisplaySize(width, height);
  }
  return scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.98)
    .setOrigin(0)
    .setStrokeStyle(2, UI.colors.borderSoft);
}

function createTitlePlate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
  if (scene.textures.exists('ui960a-panel-section-small')) {
    return scene.add.image(x, y, 'ui960a-panel-section-small').setOrigin(0).setDisplaySize(width, height);
  }
  if (scene.textures.exists('ui960-panel-alt')) {
    return scene.add.image(x, y, 'ui960-panel-alt').setOrigin(0).setDisplaySize(width, height);
  }
  return scene.add.rectangle(x, y, width, height, UI.colors.panelRaised, 0.99)
    .setOrigin(0)
    .setStrokeStyle(2, UI.colors.border);
}

function portraitTexture(championId?: string): string | undefined {
  if (!championId) return undefined;
  return `${championId}-portrait`;
}

export function createNarrativeFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  speaker: string,
  line: string,
  mode: NarrativeMode,
  portraitChampionId?: string
): NarrativeFrame {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const panel = createPanel(scene, x, y, width, height);
  objects.push(panel);

  const titleWidth = Math.min(Math.max(270, width * 0.34), 360);
  const titleHeight = 48;
  const plate = createTitlePlate(scene, x + 22, y + 12, titleWidth, titleHeight);
  objects.push(plate);

  const icon = scene.add.text(x + 37, y + 25, modeIcon(mode), {
    fontFamily: UI.font.family,
    fontSize: '17px',
    fontStyle: 'bold',
    color: mode === 'event' ? UI.text.accent : UI.text.secondary
  }).setOrigin(0, 0.5);
  objects.push(icon);

  let portraitFrame: Phaser.GameObjects.Image | undefined;
  let portraitImage: Phaser.GameObjects.Image | undefined;
  const texture = portraitTexture(portraitChampionId);
  const showPortrait = mode === 'speech' && Boolean(texture && scene.textures.exists(texture));

  if (scene.textures.exists('ui960-slot')) {
    portraitFrame = scene.add.image(x + 50, y + 36, 'ui960-slot').setDisplaySize(42, 42).setVisible(showPortrait);
    objects.push(portraitFrame);
  }
  if (showPortrait && texture) {
    portraitImage = scene.add.image(x + 50, y + 36, texture).setDisplaySize(36, 36);
    objects.push(portraitImage);
  } else {
    portraitImage = scene.add.image(x + 50, y + 36, '__WHITE').setDisplaySize(1, 1).setVisible(false);
    objects.push(portraitImage);
  }

  const speakerX = showPortrait ? x + 78 : x + 58;
  const speakerText = scene.add.text(
    speakerX,
    y + 24,
    titleLabel(speaker, mode),
    {
      fontFamily: UI.font.family,
      fontSize: '17px',
      fontStyle: 'bold',
      color: titleColor(mode)
    }
  ).setOrigin(0, 0.5);
  objects.push(speakerText);

  const bodyText = scene.add.text(
    x + 30,
    y + 72,
    line,
    {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: mode === 'narration' ? 'italic' : 'normal',
      color: mode === 'narration' ? UI.text.secondary : UI.text.primary,
      wordWrap: { width: Math.max(240, width - 330) },
      lineSpacing: 6
    }
  );
  objects.push(bodyText);

  return {
    objects,
    speakerText,
    bodyText,
    modeIcon: icon,
    portraitFrame,
    portraitImage
  };
}

export function updateNarrativeFrame(
  scene: Phaser.Scene,
  frame: NarrativeFrame,
  speaker: string,
  line: string,
  mode: NarrativeMode,
  portraitChampionId?: string
): void {
  const texture = portraitTexture(portraitChampionId);
  const showPortrait = mode === 'speech' && Boolean(texture && scene.textures.exists(texture));

  frame.speakerText.setText(titleLabel(speaker, mode));
  frame.speakerText.setColor(titleColor(mode));
  frame.speakerText.setX(showPortrait ? frame.speakerText.x + (frame.speakerText.x % 1 === 0 ? 0 : 0) : frame.speakerText.x);
  frame.modeIcon.setText(modeIcon(mode));
  frame.modeIcon.setColor(mode === 'event' ? UI.text.accent : UI.text.secondary);

  if (frame.portraitFrame) frame.portraitFrame.setVisible(showPortrait);
  if (frame.portraitImage) {
    if (showPortrait && texture) {
      frame.portraitImage.setTexture(texture).setDisplaySize(36, 36).setVisible(true);
    } else {
      frame.portraitImage.setVisible(false);
    }
  }

  frame.bodyText.setText(line);
  frame.bodyText.setFontStyle(mode === 'narration' ? 'italic' : 'normal');
  frame.bodyText.setColor(mode === 'narration' ? UI.text.secondary : UI.text.primary);
}

export function createNarrativeTitle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  depth = 90
): Phaser.GameObjects.Container {
  const width = Math.max(300, Math.min(590, 58 + text.length * 9));
  const height = 44;
  const plate = createTitlePlate(scene, 0, 0, width, height);
  const rune = scene.add.text(18, 22, '◆', {
    fontFamily: UI.font.family,
    fontSize: '14px',
    fontStyle: 'bold',
    color: UI.text.accent
  }).setOrigin(0, 0.5);
  const label = scene.add.text(38, 22, text.toUpperCase(), {
    fontFamily: UI.font.family,
    fontSize: '15px',
    fontStyle: 'bold',
    color: UI.text.gold
  }).setOrigin(0, 0.5);
  return scene.add.container(x, y, [plate, rune, label]).setDepth(depth);
}
