import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export type NarrativeMode = 'speech' | 'event' | 'narration';

export interface NarrativeFrame {
  objects: Phaser.GameObjects.GameObject[];
  speakerText: Phaser.GameObjects.Text;
  bodyText: Phaser.GameObjects.Text;
  modeLabel: Phaser.GameObjects.Text;
  titlePlate?: Phaser.GameObjects.GameObject;
  portraitFrame?: Phaser.GameObjects.Image;
  portraitImage?: Phaser.GameObjects.Image;
  speakerXDefault: number;
  speakerXPortrait: number;
  bodyYSpeech: number;
  bodyYPlain: number;
}

export function inferNarrativeMode(
  speaker: string,
  explicit?: NarrativeMode
): NarrativeMode {
  if (explicit) return explicit;
  return speaker.trim() ? 'speech' : 'narration';
}

function speechTitle(speaker: string): string {
  return (speaker.trim() || '???').toUpperCase();
}

function portraitTexture(scene: Phaser.Scene, speaker: string, championId?: string): string | undefined {
  const explicit = championId ? `${championId}-portrait` : undefined;
  if (explicit && scene.textures.exists(explicit)) return explicit;

  const fallbackId = speaker.trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const fallback = fallbackId ? `${fallbackId}-portrait` : undefined;
  return fallback && scene.textures.exists(fallback) ? fallback : undefined;
}

function createMainPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.GameObject[] {
  const objects: Phaser.GameObjects.GameObject[] = [];

  const shadow = scene.add.rectangle(x + 4, y + 5, width, height, UI.colors.shadow, 0.34).setOrigin(0);
  objects.push(shadow);

  if (scene.textures.exists('ui960-panel')) {
    const panel = scene.add.nineslice(
      x,
      y,
      'ui960-panel',
      undefined,
      width,
      height,
      18,
      18,
      18,
      18
    ).setOrigin(0);
    objects.push(panel);
  } else {
    const panel = scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, UI.colors.borderSoft);
    objects.push(panel);
  }

  return objects;
}

function createSpeechPlate(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number
): Phaser.GameObjects.GameObject {
  if (scene.textures.exists('ui960a-panel-section-small')) {
    return scene.add.image(x, y, 'ui960a-panel-section-small')
      .setOrigin(0)
      .setDisplaySize(width, height);
  }
  return scene.add.rectangle(x, y, width, height, UI.colors.panelRaised, 0.99)
    .setOrigin(0)
    .setStrokeStyle(2, UI.colors.border);
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
  const objects = createMainPanel(scene, x, y, width, height);

  const titleWidth = Math.min(Math.max(270, width * 0.34), 360);
  const titleHeight = 48;
  const titlePlate = createSpeechPlate(scene, x + 22, y + 12, titleWidth, titleHeight);
  objects.push(titlePlate);

  const portraitKey = portraitTexture(scene, speaker, portraitChampionId);
  const showPortrait = mode === 'speech' && Boolean(portraitKey);

  let portraitFrame: Phaser.GameObjects.Image | undefined;
  let portraitImage: Phaser.GameObjects.Image | undefined;
  if (scene.textures.exists('ui960-slot')) {
    portraitFrame = scene.add.image(x + 50, y + 36, 'ui960-slot').setDisplaySize(42, 42);
    objects.push(portraitFrame);
  }
  if (portraitKey) {
    portraitImage = scene.add.image(x + 50, y + 36, portraitKey).setDisplaySize(36, 36);
    objects.push(portraitImage);
  }

  const speakerXDefault = x + 42;
  const speakerXPortrait = x + 78;
  const speakerText = scene.add.text(
    showPortrait ? speakerXPortrait : speakerXDefault,
    y + 24,
    speechTitle(speaker),
    {
      fontFamily: UI.font.family,
      fontSize: '17px',
      fontStyle: 'bold',
      color: UI.text.gold
    }
  ).setOrigin(0, 0.5);
  objects.push(speakerText);

  const modeLabel = scene.add.text(
    x + 32,
    y + 26,
    '◆ EVENTO',
    {
      fontFamily: UI.font.family,
      fontSize: '13px',
      fontStyle: 'bold',
      color: UI.text.accent,
      letterSpacing: 1
    }
  ).setOrigin(0, 0.5);
  objects.push(modeLabel);

  const bodyYSpeech = y + 72;
  const bodyYPlain = y + 38;
  const bodyText = scene.add.text(
    x + 30,
    mode === 'speech' ? bodyYSpeech : bodyYPlain,
    line,
    {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: mode === 'narration' ? 'italic' : 'normal',
      color: mode === 'narration' ? UI.text.secondary : UI.text.primary,
      wordWrap: { width: Math.max(260, width - 70) },
      lineSpacing: 6
    }
  );
  objects.push(bodyText);

  const frame: NarrativeFrame = {
    objects,
    speakerText,
    bodyText,
    modeLabel,
    titlePlate,
    portraitFrame,
    portraitImage,
    speakerXDefault,
    speakerXPortrait,
    bodyYSpeech,
    bodyYPlain
  };

  updateNarrativeFrame(scene, frame, speaker, line, mode, portraitChampionId);
  return frame;
}

export function updateNarrativeFrame(
  scene: Phaser.Scene,
  frame: NarrativeFrame,
  speaker: string,
  line: string,
  mode: NarrativeMode,
  portraitChampionId?: string
): void {
  const portraitKey = portraitTexture(scene, speaker, portraitChampionId);
  const showPortrait = mode === 'speech' && Boolean(portraitKey);
  const isSpeech = mode === 'speech';
  const isEvent = mode === 'event';

  if ('setVisible' in frame.titlePlate!) {
    (frame.titlePlate as Phaser.GameObjects.GameObject & { setVisible: (value: boolean) => unknown }).setVisible(isSpeech);
  }

  frame.speakerText
    .setVisible(isSpeech)
    .setText(speechTitle(speaker))
    .setX(showPortrait ? frame.speakerXPortrait : frame.speakerXDefault)
    .setColor(UI.text.gold);

  frame.modeLabel
    .setVisible(isEvent)
    .setText(`◆ ${speaker.trim() ? speaker.trim().toUpperCase() : 'EVENTO'}`);

  if (frame.portraitFrame) frame.portraitFrame.setVisible(showPortrait);
  if (frame.portraitImage) {
    if (showPortrait && portraitKey) {
      frame.portraitImage.setTexture(portraitKey).setDisplaySize(36, 36).setVisible(true);
    } else {
      frame.portraitImage.setVisible(false);
    }
  }

  frame.bodyText
    .setY(isSpeech ? frame.bodyYSpeech : frame.bodyYPlain)
    .setText(line)
    .setFontStyle(mode === 'narration' ? 'italic' : 'normal')
    .setColor(mode === 'narration' ? UI.text.secondary : UI.text.primary);
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
  const plate = createSpeechPlate(scene, 0, 0, width, height);
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
