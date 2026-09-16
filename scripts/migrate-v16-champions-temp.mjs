import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const expected = {
  'public/assets/champions/corki/overworld.png': '247a72b174639b4a4df811675723a338a3499953',
  'public/assets/champions/corki/retrato.png': '923c2e7455c0ae4d996efc19374503998af58e28',
  'public/assets/champions/corki/frente.png': 'd47026cd5c5ed52a45b2afe1e5f092965e17addf',
  'public/assets/champions/corki/espalda.png': '21c7d5c042ab2a93b001b69fd3f2919a9662d997',
  'public/assets/champions/garen/overworld.png': '11701e1f01e31df3924c9a78eb341ec91f3659c8',
  'public/assets/champions/garen/retrato.png': '9975d07655010f613faf556478e0a1ec225e6269',
  'public/assets/champions/garen/frente.png': '838d65b00fb448f0919eb3eabe7bd95c3e220da0',
  'public/assets/champions/garen/espalda.png': '2b01f16533fd959e12f09390c0a59ca5518e4a10',
  'public/assets/champions/gnar/overworld.png': 'b5720a0f7ca3949f459327ddc823401e8b1874ef',
  'public/assets/champions/gnar/retrato.png': '655ed885ecb206b7bae108b80a93339ccba1a7e8',
  'public/assets/champions/gnar/frente.png': 'c1b9a20a89f512dbce7ce9d615a97aa1820d4a14',
  'public/assets/champions/gnar/espalda.png': '4557938a29a6b419d14fbd141307f9e82c7201e7',
  'public/assets/champions/kennen/overworld.png': 'a50cf963ae840ba48e0076c13bd0dd68ce872766',
  'public/assets/champions/kennen/retrato.png': '48300775b338c0f02925b2430f027513570281fe',
  'public/assets/champions/kennen/frente.png': 'b6f70fb0b1f72c49131b8827031b252457ec09d9',
  'public/assets/champions/kennen/espalda.png': '494c2d9b97745bcf965b7aa2a43c691da0b74e4f',
  'public/assets/champions/kled/overworld.png': '7557f572c5572f48befefa5fdc3290b099f0a934',
  'public/assets/champions/kled/retrato.png': '64deaeee447cdd8c164e1cb38375f9b7a39bdee0',
  'public/assets/champions/kled/frente.png': '17699bde6ccb2d5664852eb562eb7824f5d4d41d',
  'public/assets/champions/kled/espalda.png': 'cb272e36adecd20a595bc54caa3dbda8498e7366',
  'public/assets/champions/lulu/overworld.png': '76d3ee5e488e0d67e76296628cf25223bf5b16b0',
  'public/assets/champions/lulu/retrato.png': '1822e652e30f7c7d5e5a1025df671bae483c4306',
  'public/assets/champions/lulu/frente.png': 'd7eb61bf8169365b4fb3772e934c2b586c3c953c',
  'public/assets/champions/lulu/espalda.png': '577d1720bf6e2ad485ed1be6f7efb5ca727f5665',
  'public/assets/champions/miss-fortune/overworld.png': '8ef58647577934d74eb8de078bc5cfb525a80169',
  'public/assets/champions/miss-fortune/retrato.png': '8d5e3c4c6a500d90172b4055a5d5e847e948dde6',
  'public/assets/champions/miss-fortune/frente.png': 'a1939c8a9cc894bda9de785d3ff4c512beb40fcd',
  'public/assets/champions/miss-fortune/espalda.png': '30d390d13c8cee3b33349301bead3748e97601b2',
  'public/assets/champions/poppy/overworld.png': '966f9e9a3e88a6bb8a86507aaf19974e8366087c',
  'public/assets/champions/poppy/retrato.png': '031af38ec84e02b7f180328f1b33fe9b7020a146',
  'public/assets/champions/poppy/frente.png': 'bedf142207fb68f9c498975d831fdd76920de5c4',
  'public/assets/champions/poppy/espalda.png': '9e3ae243e0b25288a034be719f6dc0eadd488925',
  'public/assets/champions/rumble/overworld.png': '1478371ace18068b6ed4d6d754071c1e30e1bcb1',
  'public/assets/champions/rumble/retrato.png': 'c1755728691e448420b220ed5e9fb56b1ad092cd',
  'public/assets/champions/rumble/frente.png': 'd5104ac86e0d408853994d3756dc0f098771c0f5',
  'public/assets/champions/rumble/espalda.png': '6cda4fea8491652d046d448cab2892213e39cf56',
  'public/assets/champions/teemo/overworld.png': '439bab2545d113c373bcf6c39d7f0b7f1677a60c',
  'public/assets/champions/teemo/retrato.png': '5c5d761abc8aa0096334d2bd172cbc08c8198a89',
  'public/assets/champions/teemo/frente.png': '8cd4806adee1c456d6fbb357b2517fa1e8800f4d',
  'public/assets/champions/teemo/espalda.png': '406d74535ababa537cd0996916f5e8e0f096003a',
  'public/assets/champions/tristana/overworld.png': 'dffd8e1c4b57e6b1b2c716f23a91812128666774',
  'public/assets/champions/tristana/retrato.png': 'f8bbc1b0e2be0dad121fc6335aefe30ad42e0b9a',
  'public/assets/champions/tristana/frente.png': '20aa19c52fc49381b969c66de22058ae8206e108',
  'public/assets/champions/tristana/espalda.png': 'b903d041ab502568e5aede1a329db00bbfada364',
  'public/assets/champions/veigar/overworld.png': 'e249ed3ec804ed27b80584d52be1c022d105da51',
  'public/assets/champions/veigar/retrato.png': 'f6c8c134f0a137492513261a5ddefbe9ef3bf772',
  'public/assets/champions/veigar/frente.png': 'c20fec1f89abf56386498f9e8e9f82bc34d6cd4a',
  'public/assets/champions/veigar/espalda.png': '4c4449171771ad317cd68cdaf4a964fe3e3de5a0',
  'public/assets/champions/gnar/forms/mega/overworld.png': '03a4ee6e43edef35fe932355c51831b6f2ee5bc9',
  'public/assets/champions/gnar/forms/mega/retrato.png': 'c6338095c1a9f2fa102b7fc8426910208e7ffcbe',
  'public/assets/champions/gnar/forms/mega/frente.png': 'a5ac766ea977f8d6a14ddcfc443401349e5b2093',
  'public/assets/champions/gnar/forms/mega/espalda.png': 'cebad0accddf5030e4e2d09c3210ed9f1d9d1d4c'
};

const champions = ['corki','garen','gnar','kennen','kled','lulu','miss-fortune','poppy','rumble','teemo','tristana','veigar'];

function gitHash(file) {
  return execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim();
}

function pngSize(file) {
  const raw = fs.readFileSync(file).subarray(0, 24);
  if (!raw.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error(`Not PNG: ${file}`);
  return [raw.readUInt32BE(16), raw.readUInt32BE(20)];
}

for (const [file, sha] of Object.entries(expected)) {
  if (!fs.existsSync(file)) throw new Error(`Missing uploaded asset: ${file}`);
  const actual = gitHash(file);
  if (actual !== sha) throw new Error(`Blob mismatch for ${file}: ${actual} != ${sha}`);
  const name = path.basename(file);
  const wanted = name === 'overworld.png' ? [288,384] : name === 'retrato.png' ? [160,160] : [320,320];
  const actualSize = pngSize(file);
  if (actualSize[0] !== wanted[0] || actualSize[1] !== wanted[1]) throw new Error(`Wrong dimensions for ${file}: ${actualSize.join('x')} != ${wanted.join('x')}`);
}

for (const id of champions) {
  const source = path.join('public/assets/champions', id);
  const target = path.join('src/contenido/campeones', id);
  if (!fs.existsSync(target)) throw new Error(`Missing content folder: ${target}`);
  fs.mkdirSync(path.join(target, 'combate'), { recursive: true });
  fs.copyFileSync(path.join(source, 'overworld.png'), path.join(target, 'overworld.png'));
  fs.copyFileSync(path.join(source, 'retrato.png'), path.join(target, 'retrato.png'));
  fs.copyFileSync(path.join(source, 'frente.png'), path.join(target, 'combate/frente.png'));
  fs.copyFileSync(path.join(source, 'espalda.png'), path.join(target, 'combate/espalda.png'));

  const personajePath = path.join(target, 'personaje.json');
  const data = JSON.parse(fs.readFileSync(personajePath, 'utf8'));
  const visual = data.visual ?? (data.visual = {});
  if (visual.frameOverworld !== 96) {
    if (typeof visual.escalaOverworld === 'number') visual.escalaOverworld = Math.round((visual.escalaOverworld / 2) * 1000) / 1000;
    visual.frameOverworld = 96;
  }
  fs.writeFileSync(personajePath, JSON.stringify(data, null, 2) + '\n');
}

const megaSource = 'public/assets/champions/gnar/forms/mega';
const megaTarget = 'src/contenido/campeones/gnar/formas/mega-gnar';
fs.mkdirSync(path.join(megaTarget, 'combate'), { recursive: true });
fs.copyFileSync(path.join(megaSource, 'overworld.png'), path.join(megaTarget, 'overworld.png'));
fs.copyFileSync(path.join(megaSource, 'retrato.png'), path.join(megaTarget, 'retrato.png'));
fs.copyFileSync(path.join(megaSource, 'frente.png'), path.join(megaTarget, 'combate/frente.png'));
fs.copyFileSync(path.join(megaSource, 'espalda.png'), path.join(megaTarget, 'combate/espalda.png'));

const formPath = path.join(megaTarget, 'forma.json');
const form = JSON.parse(fs.readFileSync(formPath, 'utf8'));
const formVisual = form.visual ?? (form.visual = {});
if (formVisual.frameOverworld !== 96) {
  if (typeof formVisual.escalaOverworld === 'number') formVisual.escalaOverworld = Math.round((formVisual.escalaOverworld / 2) * 1000) / 1000;
  formVisual.frameOverworld = 96;
}
fs.writeFileSync(formPath, JSON.stringify(form, null, 2) + '\n');

console.log(`Validated and staged ${Object.keys(expected).length} PNG assets.`);
