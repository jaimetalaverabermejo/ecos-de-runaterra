import Phaser from 'phaser';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const LEGACY_WIDTH = 512;
export const LEGACY_HEIGHT = 288;
export const LEGACY_LAYOUT_SCALE = GAME_WIDTH / LEGACY_WIDTH;

export type SceneLayoutMode = 'legacy-512' | 'native-960';

/**
 * Transitional camera setup used while the old 512x288 layouts are migrated
 * scene by scene to the new 960x540 native canvas.
 */
export function configureSceneLayout(scene: Phaser.Scene, mode: SceneLayoutMode = 'legacy-512'): void {
  const camera = scene.cameras.main;
  camera.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT);
  camera.setRoundPixels(true);

  if (mode === 'native-960') {
    camera.setZoom(1);
    camera.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    return;
  }

  camera.setZoom(LEGACY_LAYOUT_SCALE);
  camera.centerOn(LEGACY_WIDTH / 2, LEGACY_HEIGHT / 2);
}
