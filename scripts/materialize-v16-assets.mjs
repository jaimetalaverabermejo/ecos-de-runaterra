import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const root = process.cwd();
const packDir = path.join(root, 'asset-packs');
const rescaledPack = path.join(packDir, 'v16.2-rescaled.zip');
const uiPack = path.join(packDir, 'ui_960_v1.zip');

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

if (fs.existsSync(rescaledPack)) {
  const zip = new AdmZip(rescaledPack);
  for (const id of roster) {
    copyEntry(zip, `champions/${id}/overworld.png`, `src/contenido/campeones/${id}/overworld.png`);
    copyEntry(zip, `champions/${id}/portrait.png`, `src/contenido/campeones/${id}/retrato.png`);
    copyEntry(zip, `champions/${id}/battle/front.png`, `src/contenido/campeones/${id}/combate/frente.png`);
    copyEntry(zip, `champions/${id}/battle/back.png`, `src/contenido/campeones/${id}/combate/espalda.png`);
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

  console.log('[v16.2 assets] Pack de Ecos/protagonista/componentes materializado. Mega Gnar y Master Yi se ignoran deliberadamente.');
} else {
  console.warn('[v16.2 assets] Falta asset-packs/v16.2-rescaled.zip; se conservan los assets presentes en el checkout.');
}

// La categoría visual intermedia pasa a llamarse unique. Mantenemos los IDs internos actuales.
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
  console.log('[v16.2 assets] Pack UI960 materializado desde PNG originales.');
} else {
  console.warn('[v16.2 assets] Falta asset-packs/ui_960_v1.zip; se conserva la UI presente en el checkout.');
}
