import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const roster = ['corki','garen','gnar','kennen','kled','lulu','miss-fortune','poppy','rumble','teemo','tristana','veigar'];

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`PNG inválido: ${path.relative(root, file)}`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function expectPng(relative, width, height) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) throw new Error(`Falta asset: ${relative}`);
  const size = pngSize(file);
  if (size.width !== width || size.height !== height) {
    throw new Error(`${relative}: ${size.width}x${size.height}; esperado ${width}x${height}`);
  }
}

for (const id of roster) {
  expectPng(`src/contenido/campeones/${id}/overworld.png`, 288, 384);
  expectPng(`src/contenido/campeones/${id}/retrato.png`, 160, 160);
  expectPng(`src/contenido/campeones/${id}/combate/frente.png`, 320, 320);
  expectPng(`src/contenido/campeones/${id}/combate/espalda.png`, 320, 320);
}

expectPng('public/assets/player/overworld.png', 288, 384);
expectPng('public/assets/player/portrait.png', 160, 160);

for (const id of [
  'amplifying-tome','agility-cloak','cloth-armor','dagger','glowing-mote','long-sword',
  'null-magic-mantle','ruby-crystal','sapphire-crystal'
]) {
  expectPng(`public/assets/items/components/${id}.png`, 96, 96);
}

expectPng('public/assets/ui/ui_960_v1/ui960-atlas.png', 1024, 831);
expectPng('public/assets/ui/ui_960_v1/title/56_title_background.png', 960, 540);
expectPng('public/assets/ui/ui_960_v1/title/57_title_logo.png', 520, 150);
expectPng('public/assets/ui/ui_960_v1/save_select/58_save_slot_panel.png', 760, 120);
expectPng('public/assets/ui/ui_960_v1/save_select/59_save_option_panel.png', 320, 120);

// Mega Gnar permanece deliberadamente en estándar legacy hasta recibir su pack definitivo.
expectPng('src/contenido/campeones/gnar/formas/mega-gnar/overworld.png', 144, 192);

console.log('[v16.2 validate] Assets 960/96/320 correctos; Mega Gnar legacy 48 preservado.');
