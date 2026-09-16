import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const stagingDir = path.join(root, 'asset-staging', 'components');
const outDir = path.join(root, 'public', 'assets', 'items', 'components');

const expected = {
  'amplifying-tome.png': 'bf35a89c337f70b5c32a10719e3de37ea084846d',
  'agility-cloak.png': 'ef0b79d6dae99653602f277b35993d49b1f7805c',
  'cloth-armor.png': '4ea702dbad23c95d53522b8466d94fb53f5ce859',
  'dagger.png': 'c384d1e50335ac6cc1739fb8d300d21b0b70f30b',
  'glowing-mote.png': '1e21c170649aefddae77f2a5c4554b282f840c80',
  'long-sword.png': 'e9e31dbca5a28eae5f71fb6f0f8948d7d2184833',
  'null-magic-mantle.png': '9079fb330397e7d390329f6a8b3d14940b7b5d25',
  'ruby-crystal.png': '6ac393c4474cad97f968f8ec1fdc72b63c8faba0',
  'sapphire-crystal.png': 'ca564686ab4311436ef0347dbfef2f8295ec7f57'
};

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`);
  return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

if (!fs.existsSync(stagingDir)) {
  console.log('[staged-components] No hay staging.');
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(stagingDir).filter((name) => name.endsWith('.png.b64')).sort();
if (!files.length) {
  console.log('[staged-components] No hay componentes pendientes.');
  process.exit(0);
}

for (const stagedName of files) {
  const destName = stagedName.slice(0, -4);
  if (!expected[destName]) throw new Error(`Componente no permitido: ${destName}`);
  const encoded = fs.readFileSync(path.join(stagingDir, stagedName), 'utf8').replace(/\s+/g, '');
  const buffer = Buffer.from(encoded, 'base64');
  const actual = gitBlobSha(buffer);
  if (actual !== expected[destName]) {
    throw new Error(`SHA incorrecto para ${destName}: esperado ${expected[destName]}, recibido ${actual}`);
  }
  fs.writeFileSync(path.join(outDir, destName), buffer);
  fs.rmSync(path.join(stagingDir, stagedName));
  console.log(`[staged-components] OK ${destName} (${buffer.length} bytes, ${actual})`);
}
