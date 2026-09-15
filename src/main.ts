import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { MenuScene } from './scenes/MenuScene';
import { PlayerScene } from './scenes/PlayerScene';
import { TeamScene } from './scenes/TeamScene';
import { ChampionDetailScene } from './scenes/ChampionDetailScene';
import { MasteryScene } from './scenes/MasteryScene';
import { BuildScene } from './scenes/BuildScene';
import { ProgressionScene } from './scenes/ProgressionScene';
import { DefeatScene } from './scenes/DefeatScene';
import { JournalScene } from './scenes/JournalScene';
import { BagScene } from './scenes/BagScene';
import { ShopScene } from './scenes/ShopScene';
import { CraftingScene } from './scenes/CraftingScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { RegionMapScene } from './scenes/RegionMapScene';
import { BattleScene } from './scenes/BattleScene';
import { applyCombatUxV1211 } from './scenes/CombatUxV1211';
import { applyPlayerWorldV13 } from './scenes/PlayerWorldV13';

applyCombatUxV1211();
applyPlayerWorldV13();

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
  scene: [
    BootScene,
    TitleScene,
    WorldScene,
    MenuScene,
    PlayerScene,
    TeamScene,
    ChampionDetailScene,
    MasteryScene,
    BuildScene,
    ProgressionScene,
    DefeatScene,
    JournalScene,
    BagScene,
    ShopScene,
    CraftingScene,
    WorldMapScene,
    RegionMapScene,
    BattleScene
  ]
};

new Phaser.Game(config);
