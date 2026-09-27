import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const maps = [
  'bandle-village/bandle-village.tmj',
  'bandle-village/bandle_houses/three-house.tmj',
  ...Array.from({ length: 7 }, (_, i) => `bandle-village/bandle_houses/bandle_house_0${i + 2}.tmj`),
  'Dark_forest/Dark_forest.tmj',
  'Gnar_valley/Gnar_valley.tmj',
  'Gnar_valley/Gnar_cave/Gnar_cave.tmj',
  'Angar_corki/angar_corki.tmj'
];
const zoneRoot = 'public/assets/world/regions/bandle-city/zones';

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

for (const relative of maps) {
  const mapPath = resolve(zoneRoot, relative);
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  const tilesets = map.tilesets.map((entry) => {
    if (!entry.source) return entry;
    const sourcePath = resolve(dirname(mapPath), entry.source);
    if (!existsSync(sourcePath)) throw new Error(`${relative}: tileset inexistente ${entry.source}`);
    const xml = readFileSync(sourcePath, 'utf8');
    const tilesetTag = xml.match(/<tileset\s[^>]*>/)?.[0];
    const imageTag = xml.match(/<image\s[^>]*\/>/)?.[0];
    if (!tilesetTag || !imageTag || /<tile\b|<wangset\b/.test(xml)) {
      throw new Error(`${relative}: el tileset ${entry.source} necesita una conversión con propiedades de tile`);
    }
    const set = attributes(tilesetTag);
    const image = attributes(imageTag);
    if (!existsSync(resolve(dirname(sourcePath), image.source))) {
      throw new Error(`${relative}: imagen inexistente de ${entry.source}: ${image.source}`);
    }
    return {
      firstgid: entry.firstgid,
      name: set.name,
      tilewidth: Number(set.tilewidth), tileheight: Number(set.tileheight),
      tilecount: Number(set.tilecount), columns: Number(set.columns),
      margin: Number(set.margin ?? 0), spacing: Number(set.spacing ?? 0),
      image: image.source, imagewidth: Number(image.width), imageheight: Number(image.height)
    };
  });
  // Phaser identifies tilesets by name. Tiled permits reusing an image under
  // several firstgid values, so give subsequent instances a unique runtime name.
  const seen = new Map();
  map.tilesets = tilesets.map((set) => {
    const occurrence = (seen.get(set.name) ?? 0) + 1;
    seen.set(set.name, occurrence);
    return occurrence === 1 ? set : { ...set, name: `${set.name}__${occurrence}` };
  });
  writeFileSync(mapPath.replace(/\.tmj$/, '.runtime.json'), JSON.stringify(map));
}
