import Phaser from 'phaser';
import { UI } from '../theme/UiTheme';

export type NarrativeMode = 'speech' | 'narration';

export interface NarrativeFrame {
  objects: Phaser.GameObjects.GameObject[];
  speakerText: Phaser.GameObjects.Text;
  bodyText: Phaser.GameObjects.Text;
}

export function inferNarrativeMode(
  speaker: string,
  explicit?: NarrativeMode
): NarrativeMode {
  if (explicit) return explicit;
  const normalized = speaker.trim().toUpperCase();
  if (!normalized || normalized === 'SISTEMA' || normalized === 'NARRACIÓN' || normalized === 'RESONANCIA') {
    return 'narration';
  }
  return 'speech';
}

export function narrativeSpeakerLabel(speaker: string, mode: NarrativeMode): string {
  const normalized = speaker.trim();
  if (mode === 'narration') return `◇ ${normalized || 'NARRACIÓN'}`.toUpperCase();
  return `“ ${normalized}`.toUpperCase();
}

export function createNarrativeFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  speaker: string,
  line: string,
  mode: NarrativeMode
): NarrativeFrame {
  const objects: Phaser.GameObjects.GameObject[] = [];

  objects.push(scene.add.rectangle(x + 3, y + 3, width, height, UI.colors.shadow, 0.45).setOrigin(0, 0));
  objects.push(
    scene.add.rectangle(x, y, width, height, UI.colors.panel, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI.colors.borderSoft)
  );
  objects.push(scene.add.rectangle(x + 4, y + 4, width - 8, 2, UI.colors.cyanGlow, 0.85).setOrigin(0, 0));
  objects.push(scene.add.rectangle(x + 10, y + 13, 5, 5, UI.colors.accent, 0.9).setAngle(45));
  objects.push(scene.add.rectangle(x + width - 12, y + 13, 5, 5, UI.colors.gold, 0.9).setAngle(45));

  const titleWidth = Math.min(Math.max(250, width * 0.36), 350);
  objects.push(
    scene.add.rectangle(x + 24, y + 16, titleWidth, 34, mode === 'narration' ? 0x123748 : 0x173d5b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, mode === 'narration' ? UI.colors.cyanGlow : UI.colors.border)
  );

  const speakerText = scene.add.text(
    x + 38,
    y + 22,
    narrativeSpeakerLabel(speaker, mode),
    {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: 'bold',
      color: mode === 'narration' ? UI.text.accent : UI.text.gold
    }
  );
  objects.push(speakerText);

  const bodyText = scene.add.text(
    x + 30,
    y + 66,
    line,
    {
      fontFamily: UI.font.family,
      fontSize: '18px',
      fontStyle: mode === 'narration' ? 'italic' : 'normal',
      color: mode === 'narration' ? UI.text.secondary : UI.text.primary,
      wordWrap: { width: Math.max(220, width - 310) },
      lineSpacing: 6
    }
  );
  objects.push(bodyText);

  return { objects, speakerText, bodyText };
}

export function updateNarrativeFrame(
  frame: NarrativeFrame,
  speaker: string,
  line: string,
  mode: NarrativeMode
): void {
  frame.speakerText.setText(narrativeSpeakerLabel(speaker, mode));
  frame.speakerText.setColor(mode === 'narration' ? UI.text.accent : UI.text.gold);
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
  const width = Math.max(260, Math.min(560, 46 + text.length * 9));
  const bg = scene.add.rectangle(0, 0, width, 36, 0x173d5b, 0.98)
    .setOrigin(0, 0)
    .setStrokeStyle(2, UI.colors.border);
  const rune = scene.add.rectangle(14, 18, 7, 7, UI.colors.accent, 0.95).setAngle(45);
  const label = scene.add.text(30, 8, text.toUpperCase(), {
    fontFamily: UI.font.family,
    fontSize: '15px',
    fontStyle: 'bold',
    color: UI.text.gold
  });
  return scene.add.container(x, y, [bg, rune, label]).setDepth(depth);
}
