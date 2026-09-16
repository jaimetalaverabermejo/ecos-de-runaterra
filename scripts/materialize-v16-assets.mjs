import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const root = process.cwd();
const packDir = path.join(root, 'asset-packs');
const combinedPack = path.join(packDir, 'v16.2-all-assets.zip');
const rescaledPack = fs.existsSync(combinedPack) ? combinedPack : path.join(packDir, 'v16.2-rescaled.zip');
const uiPack = fs.existsSync(combinedPack) ? combinedPack : path.join(packDir, 'ui_960_v1.zip');
const roster = ['corki','garen','gnar','kennen','kled','lulu','miss-fortune','poppy','rumble','teemo','tristana','veigar'];

function ensureDir(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function writeBuffer(dest, buffer) { ensureDir(dest); fs.writeFileSync(dest, buffer); }
function findEntry(zip, suffix) {
  const normalized = suffix.replaceAll('\\','/').toLowerCase();
  return zip.getEntries().find((e) => !e.isDirectory && e.entryName.replaceAll('\\','/').toLowerCase().endsWith(normalized));
}
function copyEntry(zip, suffix, dest, required = true) {
  const entry = findEntry(zip, suffix);
  if (!entry) {
    if (required) throw new Error(`No encuentro ${suffix} dentro del pack`);
    return false;
  }
  writeBuffer(path.join(root, dest), entry.getData());
  return true;
}
function copyExisting(src, dest) {
  const source = path.join(root, src);
  if (!fs.existsSync(source)) return;
  const target = path.join(root, dest);
  ensureDir(target);
  fs.copyFileSync(source, target);
}
function markChampionAs96(id) {
  const file = path.join(root, `src/contenido/campeones/${id}/personaje.json`);
  if (!fs.existsSync(file)) return;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.visual = { ...(data.visual ?? {}), frameOverworld: 96 };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function patchWorldForNewPlayer() {
  const file = path.join(root, 'src/scenes/WorldScene.ts');
  if (!fs.existsSync(file)) return;
  let source = fs.readFileSync(file, 'utf8');
  source = source
    .replace("const PLAYER_TEXTURE_KEY = 'garen-overworld';", "const PLAYER_TEXTURE_KEY = 'player-overworld';")
    .replace("down: 'garen-walk-down', up: 'garen-walk-up', left: 'garen-walk-left', right: 'garen-walk-right'", "down: 'player-walk-down', up: 'player-walk-up', left: 'player-walk-left', right: 'player-walk-right'")
    .replace("const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1.88, right: 1.92, up: 2.02, left: 1.98 };", "const PLAYER_VISUAL_SCALE: Record<Facing, number> = { down: 1, right: 1, up: 1, left: 1 };")
    .replace(
      "const scale = placement.overworldScale ?? config?.overworldScale ?? 1.4;",
      "const frameSize = config?.overworldFrameSize ?? 48;\n          const resolutionScale = frameSize >= 96 ? 0.5 : 1;\n          const scale = (placement.overworldScale ?? config?.overworldScale ?? 1.4) * resolutionScale;"
    );
  fs.writeFileSync(file, source);
}

if (fs.existsSync(rescaledPack)) {
  const zip = new AdmZip(rescaledPack);
  for (const id of roster) {
    copyEntry(zip, `champions/${id}/overworld.png`, `src/contenido/campeones/${id}/overworld.png`);
    copyEntry(zip, `champions/${id}/portrait.png`, `src/contenido/campeones/${id}/retrato.png`);
    copyEntry(zip, `champions/${id}/battle/front.png`, `src/contenido/campeones/${id}/combate/frente.png`);
    copyEntry(zip, `champions/${id}/battle/back.png`, `src/contenido/campeones/${id}/combate/espalda.png`);
    markChampionAs96(id);
  }

  copyEntry(zip, 'Personaje principal/overworld.png', 'public/assets/player/overworld.png');
  copyEntry(zip, 'Personaje principal/portrait.png', 'public/assets/player/portrait.png');

  const componentMap = {
    'amplifying-tome.png':'amplifying-tome.png',
    'cloak-of-agility.png':'agility-cloak.png',
    'cloth-armor.png':'cloth-armor.png',
    'dagger.png':'dagger.png',
    'glowing-mote.png':'glowing-mote.png',
    'long-sword.png':'long-sword.png',
    'null-magic-mantle.png':'null-magic-mantle.png',
    'ruby-crystal.png':'ruby-crystal.png',
    'sapphire-crystal.png':'sapphire-crystal.png'
  };
  for (const [sourceName, destName] of Object.entries(componentMap)) {
    copyEntry(zip, `components/${sourceName}`, `public/assets/items/components/${destName}`);
  }
  patchWorldForNewPlayer();
  console.log('[v16.2 assets] Ecos, protagonista y componentes 96px materializados. Mega Gnar y Master Yi se ignoran deliberadamente.');
} else {
  console.warn('[v16.2 assets] Falta pack de assets reescalados; se conservan los assets presentes en el checkout.');
}

copyExisting('public/assets/items/epic/lost-chapter.png', 'public/assets/items/unique/lost-chapter.png');
copyExisting('public/assets/items/epic/power-wand.png', 'public/assets/items/unique/power-wand.png');
copyExisting('public/assets/items/epic/speed-core.png', 'public/assets/items/unique/speed-core.png');

if (fs.existsSync(uiPack)) {
  const zip = new AdmZip(uiPack);
  const files = [
    ['ui960-atlas.png','public/assets/ui/ui_960_v1/ui960-atlas.png'],
    ['ui960-atlas.json','public/assets/ui/ui_960_v1/ui960-atlas.json'],
    ['title/56_title_background.png','public/assets/ui/ui_960_v1/title/56_title_background.png'],
    ['title/57_title_logo.png','public/assets/ui/ui_960_v1/title/57_title_logo.png'],
    ['save_select/58_save_slot_panel.png','public/assets/ui/ui_960_v1/save_select/58_save_slot_panel.png'],
    ['save_select/59_save_option_panel.png','public/assets/ui/ui_960_v1/save_select/59_save_option_panel.png']
  ];
  for (const [source, dest] of files) copyEntry(zip, source, dest);
  console.log('[v16.2 assets] UI960 materializada desde PNG originales.');
} else {
  console.warn('[v16.2 assets] Falta pack UI960; se conserva la UI presente en el checkout.');
}
