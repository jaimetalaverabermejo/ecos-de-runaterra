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

function typedValue(type, value) {
  if (type === 'bool') return value === 'true' || value === '1';
  if (type === 'int' || type === 'float') return Number(value);
  return value;
}

function xmlProperties(xml) {
  const block = xml.match(/<properties>([\s\S]*?)<\/properties>/)?.[1];
  if (!block) return [];
  return [...block.matchAll(/<property\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/property>)/g)].map((match) => {
    const attr = attributes(match[1]);
    const raw = attr.value ?? match[2]?.trim() ?? '';
    const property = { name: attr.name, type: attr.type ?? 'string', value: typedValue(attr.type, raw) };
    return property;
  });
}

function mergeProperties(base = [], override = []) {
  const merged = new Map(base.map((property) => [property.name, property]));
  for (const property of override) merged.set(property.name, property);
  return [...merged.values()];
}

function parseTemplate(templatePath) {
  const xml = readFileSync(templatePath, 'utf8');
  const objectMatch = xml.match(/<object\s+([^>]*?)(?:\/\>|>([\s\S]*?)<\/object>)/);
  if (!objectMatch) throw new Error(`Template sin object: ${templatePath}`);

  const attr = attributes(objectMatch[1]);
  const body = objectMatch[2] ?? '';
  const object = {
    ...(attr.name ? { name: attr.name } : {}),
    ...(attr.type ? { type: attr.type } : {}),
    ...(attr.class ? { class: attr.class } : {}),
    ...(attr.gid !== undefined ? { gid: Number(attr.gid) } : {}),
    ...(attr.x !== undefined ? { x: Number(attr.x) } : {}),
    ...(attr.y !== undefined ? { y: Number(attr.y) } : {}),
    ...(attr.width !== undefined ? { width: Number(attr.width) } : {}),
    ...(attr.height !== undefined ? { height: Number(attr.height) } : {}),
    ...(attr.rotation !== undefined ? { rotation: Number(attr.rotation) } : {}),
    ...(body.includes('<ellipse') ? { ellipse: true } : {}),
    properties: xmlProperties(body)
  };

  const tilesetTag = xml.match(/<tileset\s+([^>]*?)\/>/)?.[1];
  const tileset = tilesetTag ? attributes(tilesetTag) : undefined;
  return { object, tileset };
}

function expandTemplates(map, mapPath, relative) {
  for (const layer of map.layers ?? []) {
    if (!Array.isArray(layer.objects)) continue;

    layer.objects = layer.objects.map((instance) => {
      if (!instance.template) return instance;

      const templatePath = resolve(dirname(mapPath), instance.template);
      if (!existsSync(templatePath)) {
        throw new Error(`${relative}: template inexistente ${instance.template}`);
      }

      const template = parseTemplate(templatePath);
      const base = template.object;
      const expanded = {
        ...base,
        ...instance,
        properties: mergeProperties(base.properties, instance.properties)
      };
      delete expanded.template;

      if (base.gid !== undefined) {
        // Pickup templates are authored as Tiled Tile Objects, whose Y coordinate
        // points to the bottom edge. Runtime renders the actual pickup from
        // itemId/world texture, so flatten the template into a normal rectangle
        // and remove the authoring-only GID. This keeps templates portable and
        // avoids requiring EdR_Pickups in every map's tileset list.
        const height = Math.max(1, Number(expanded.height ?? base.height ?? 32));
        expanded.y = Number(expanded.y ?? 0) - height;
        delete expanded.gid;
      }

      return expanded;
    });
  }
}

function validateGameplayObjects(map, relative) {
  for (const layerName of ['Interactions', 'Zones']) {
    const layer = (map.layers ?? []).find((entry) => entry.type === 'objectgroup' && entry.name === layerName);
    if (!layer) continue;
    const names = new Set();

    for (const object of layer.objects ?? []) {
      const name = object.name || `${layerName.toLowerCase()}-${object.id}`;
      if (names.has(name)) throw new Error(`${relative}: nombre duplicado en ${layerName}: ${name}`);
      names.add(name);

      const props = Object.fromEntries((object.properties ?? []).map((property) => [property.name, property.value]));
      if (layerName === 'Interactions' && props.action === 'pickup_item' && !props.itemId) {
        throw new Error(`${relative}: pickup_item "${name}" sin itemId`);
      }
      if (layerName === 'Interactions' && props.action === 'pickup_gold' && props.gold === undefined && props.quantity === undefined) {
        throw new Error(`${relative}: pickup_gold "${name}" sin gold/quantity`);
      }
      if (layerName === 'Zones' && props.action === 'sanctuary' && !props.sanctuaryId) {
        throw new Error(`${relative}: sanctuary "${name}" sin sanctuaryId`);
      }
    }
  }
}

for (const relative of maps) {
  const mapPath = resolve(zoneRoot, relative);
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));

  expandTemplates(map, mapPath, relative);
  validateGameplayObjects(map, relative);

  const tilesets = map.tilesets.map((entry) => {
    if (!entry.source) return entry;
    const sourcePath = resolve(dirname(mapPath), entry.source);
    if (!existsSync(sourcePath)) throw new Error(`${relative}: tileset inexistente ${entry.source}`);
    const xml = readFileSync(sourcePath, 'utf8');
    const tilesetTag = xml.match(/<tileset\s[^>]*>/)?.[0];
    if (!tilesetTag || /<wangset\b/.test(xml)) {
      throw new Error(`${relative}: no se puede convertir el tileset ${entry.source}`);
    }
    const set = attributes(tilesetTag);
    const tileBlocks = [...xml.matchAll(/<tile\s+[^>]*id="(\d+)"[^>]*>([\s\S]*?)<\/tile>/g)];

    if (tileBlocks.length > 0) {
      const tiles = tileBlocks.map((match) => {
        const id = Number(match[1]);
        const imageTag = match[2].match(/<image\s[^>]*\/>/)?.[0];
        if (!imageTag) throw new Error(`${relative}: tile ${id} sin imagen en ${entry.source}`);
        const image = attributes(imageTag);
        if (!existsSync(resolve(dirname(sourcePath), image.source))) {
          throw new Error(`${relative}: imagen inexistente de ${entry.source}: ${image.source}`);
        }
        const properties = xmlProperties(match[2]);
        return {
          id,
          image: image.source,
          imagewidth: Number(image.width),
          imageheight: Number(image.height),
          ...(properties.length > 0 ? { properties } : {})
        };
      });
      return {
        firstgid: entry.firstgid,
        name: set.name,
        tilewidth: Number(set.tilewidth),
        tileheight: Number(set.tileheight),
        tilecount: Number(set.tilecount ?? tiles.length),
        columns: Number(set.columns ?? 0),
        tiles
      };
    }

    const imageTag = xml.match(/<image\s[^>]*\/>/)?.[0];
    if (!imageTag || /<tile\b/.test(xml)) {
      throw new Error(`${relative}: el tileset ${entry.source} necesita una conversión con propiedades de tile`);
    }
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
