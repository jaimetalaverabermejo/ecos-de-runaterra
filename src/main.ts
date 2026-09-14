import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { MenuScene } from './scenes/MenuScene';
import { TeamScene } from './scenes/TeamScene';
import { ChampionDetailScene } from './scenes/ChampionDetailScene';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 512,
  height: 288,
  backgroundColor: '#111111',
  pixelArt: true,
  input: { activePointers: 3 },
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, TitleScene, WorldScene, MenuScene, TeamScene, ChampionDetailScene, BattleScene]
};

new Phaser.Game(config);
