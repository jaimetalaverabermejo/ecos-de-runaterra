import fs from 'node:fs';

function edit(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`Sin cambios en ${path}`);
  fs.writeFileSync(path, after);
}

function replaceOnce(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`No se encontró ${label}`);
  return text.replace(before, after);
}

edit('src/main.ts', (text) => {
  text = replaceOnce(text, "import { applyPlayerWorldV13 } from './scenes/PlayerWorldV13';", "import { applyPlayerWorldV13 } from './scenes/PlayerWorldV13';\nimport { GAME_HEIGHT, GAME_WIDTH } from './config/GameDimensions';", 'import dimensiones');
  text = replaceOnce(text, '  width: 512,\n  height: 288,', '  width: GAME_WIDTH,\n  height: GAME_HEIGHT,\n  resolution: 1,', 'canvas 512x288');
  return text;
});

edit('package.json', (text) => {
  const pkg = JSON.parse(text);
  pkg.version = '0.16.0-test.0';
  return JSON.stringify(pkg, null, 2) + '\n';
});

edit('src/contenido/CatalogoContenido.ts', (text) => {
  text = replaceOnce(text, "} from '../data/types';", "} from '../data/types';\nimport { LEGACY_ASSET_STANDARD } from '../config/AssetStandards';", 'import asset standard');
  text = replaceOnce(text, '  escalaOverworld?: number;\n  escalaCombate?: number;', '  escalaOverworld?: number;\n  frameOverworld?: number;\n  escalaCombate?: number;', 'frame visual json');
  text = replaceOnce(text, 'export interface VisualOverworldConfig {\n  overworldScale?: number;', 'export interface VisualOverworldConfig {\n  overworldScale?: number;\n  overworldFrameSize?: number;', 'frame visual runtime');
  text = replaceOnce(text, '  textureKey: string;\n}', '  textureKey: string;\n  frameWidth?: number;\n  frameHeight?: number;\n}', 'asset frame metadata');
  text = replaceOnce(text, '    overworldScale: merged.escalaOverworld,\n    offsetY: merged.offsetY,', '    overworldScale: merged.escalaOverworld,\n    overworldFrameSize: merged.frameOverworld,\n    offsetY: merged.offsetY,', 'visual config frame');

  text = replaceOnce(text,
`function assetsFrom(glob: Record<string, string>, type: TipoAssetCampeon, suffix: string): AssetCampeonDescubierto[] {
  return Object.entries(glob).map(([path, url]) => {
    const championId = championIdFromPath(path);
    return { championId, type, url, textureKey: \`${'${championId}'}-${'${suffix}'}\` };
  });
}`,
`function assetsFrom(glob: Record<string, string>, type: TipoAssetCampeon, suffix: string): AssetCampeonDescubierto[] {
  return Object.entries(glob).map(([path, url]) => {
    const championId = championIdFromPath(path);
    const frameSize = type === 'overworld'
      ? personajesPorId.get(championId)?.visual?.frameOverworld ?? LEGACY_ASSET_STANDARD.overworld.frameWidth
      : undefined;
    return {
      championId,
      type,
      url,
      textureKey: \`${'${championId}'}-${'${suffix}'}\`,
      frameWidth: frameSize,
      frameHeight: frameSize
    };
  });
}`,
'assetsFrom');

  text = replaceOnce(text,
`function formAssetsFrom(glob: Record<string, string>, type: TipoAssetCampeon, suffix: string): AssetCampeonDescubierto[] {
  return Object.entries(glob).map(([path, url]) => {
    const championId = championIdFromPath(path);
    const formId = formIdFromPath(path);
    return { championId, formId, type, url, textureKey: \`${'${championId}'}-form-${'${formId}'}-${'${suffix}'}\` };
  });
}`,
`function formAssetsFrom(glob: Record<string, string>, type: TipoAssetCampeon, suffix: string): AssetCampeonDescubierto[] {
  return Object.entries(glob).map(([path, url]) => {
    const championId = championIdFromPath(path);
    const formId = formIdFromPath(path);
    const frameSize = type === 'overworld'
      ? formasPorClave.get(championId + ':' + formId)?.visual?.frameOverworld
        ?? personajesPorId.get(championId)?.visual?.frameOverworld
        ?? LEGACY_ASSET_STANDARD.overworld.frameWidth
      : undefined;
    return {
      championId,
      formId,
      type,
      url,
      textureKey: \`${'${championId}'}-form-${'${formId}'}-${'${suffix}'}\`,
      frameWidth: frameSize,
      frameHeight: frameSize
    };
  });
}`,
'formAssetsFrom');
  return text;
});

edit('src/scenes/BootScene.ts', (text) => {
  text = replaceOnce(text, "import { BATTLE_UI_ATLAS_DATA_URI, BATTLE_UI_FRAMES } from '../ui/battle/v2/assets';", "import { BATTLE_UI_ATLAS_DATA_URI, BATTLE_UI_FRAMES } from '../ui/battle/v2/assets';\nimport { LEGACY_ASSET_STANDARD } from '../config/AssetStandards';", 'Boot import asset standard');
  text = replaceOnce(text, '{ frameWidth: 48, frameHeight: 48 }', '{ frameWidth: LEGACY_ASSET_STANDARD.overworld.frameWidth, frameHeight: LEGACY_ASSET_STANDARD.overworld.frameHeight }', 'player frame size');
  text = replaceOnce(text, "this.load.spritesheet(asset.textureKey, asset.url, { frameWidth: 48, frameHeight: 48 });", "this.load.spritesheet(asset.textureKey, asset.url, {\n          frameWidth: asset.frameWidth ?? LEGACY_ASSET_STANDARD.overworld.frameWidth,\n          frameHeight: asset.frameHeight ?? LEGACY_ASSET_STANDARD.overworld.frameHeight\n        });", 'champion frame size');
  text = text.replace(/this\.registry\.set\('app\.version', '[^']+'\);/, "this.registry.set('app.version', '16.0 RESOLUTION TEST');");
  return text;
});

const sceneFiles = [
  'TitleScene.ts', 'WorldScene.ts', 'MenuScene.ts', 'PlayerScene.ts', 'TeamScene.ts',
  'ChampionDetailScene.ts', 'MasteryScene.ts', 'BuildScene.ts', 'ProgressionScene.ts',
  'DefeatScene.ts', 'JournalScene.ts', 'BagScene.ts', 'ShopScene.ts', 'CraftingScene.ts',
  'WorldMapScene.ts', 'RegionMapScene.ts', 'BattleScene.ts'
];

for (const file of sceneFiles) {
  edit(`src/scenes/${file}`, (text) => {
    if (!text.includes("../config/GameDimensions")) {
      const firstImportEnd = text.indexOf('\n');
      if (firstImportEnd < 0) throw new Error(`No se pudo insertar import en ${file}`);
      text = text.slice(0, firstImportEnd + 1)
        + "import { configureSceneLayout } from '../config/GameDimensions';\n"
        + text.slice(firstImportEnd + 1);
    }
    const createPattern = /create\(([^)]*)\): void \{\n/;
    const match = text.match(createPattern);
    if (!match) throw new Error(`No se encontró create() en ${file}`);
    if (!text.includes('configureSceneLayout(this);')) {
      text = text.replace(createPattern, (full) => full + '    configureSceneLayout(this);\n');
    }
    return text;
  });
}

console.log('v16 resolution foundation aplicada');
