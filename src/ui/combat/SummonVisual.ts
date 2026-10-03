import Phaser from 'phaser';

/** Dedicated summon art takes priority; a clone can reuse its owner's sprite. */
export function createSummonVisual(
  scene: Phaser.Scene, championId: string, summonId: string, player: boolean,
  x: number, y: number, size: number
): Phaser.GameObjects.Image | null {
  const facing = player ? '-battle-back' : '-battle-front';
  const alternate = player ? '-battle-front' : '-battle-back';
  const prefix = championId + '-summon-' + summonId;
  const isWukongClone = championId === 'wukong' && summonId === 'wukong-clone';
  const candidates = [prefix + facing, prefix + alternate];
  if (isWukongClone) candidates.push(championId + facing, championId + alternate);
  const texture = candidates.find((key) => scene.textures.exists(key));
  if (!texture) return null;
  const visual = scene.add.image(x, y, texture).setOrigin(0.5, 1).setDisplaySize(size, size);
  if (isWukongClone) visual.setTint(0xb9e8ff).setAlpha(0.72);
  return visual;
}
