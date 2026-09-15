import fs from 'node:fs';

function replaceOnce(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`No se encontró el ancla: ${label}`);
  return text.replace(oldValue, newValue);
}

// 1) NPC narrativo: campeón y forma visual son independientes del Eco jugable.
const narrativePath = 'src/data/narrativeTypes.ts';
let narrative = fs.readFileSync(narrativePath, 'utf8');
narrative = replaceOnce(
  narrative,
  '  championId?: string;\n  overworldScale?: number;\n',
  '  championId?: string;\n  formId?: string;\n  overworldScale?: number;\n',
  'NpcDefinition.formId'
);
fs.writeFileSync(narrativePath, narrative);

// 2) Conversión del JSON de contenido al modelo runtime.
const catalogPath = 'src/contenido/CatalogoMundo.ts';
let catalog = fs.readFileSync(catalogPath, 'utf8');
catalog = replaceOnce(
  catalog,
  '  campeonId?: string;\n  escalaOverworld?: number;\n',
  '  campeonId?: string;\n  formaId?: string;\n  escalaOverworld?: number;\n',
  'NpcJson.formaId'
);
catalog = replaceOnce(
  catalog,
  '    championId: value.campeonId,\n    overworldScale: value.escalaOverworld,\n',
  '    championId: value.campeonId,\n    formId: value.formaId,\n    overworldScale: value.escalaOverworld,\n',
  'npcFromJson.formId'
);
fs.writeFileSync(catalogPath, catalog);

// 3) El NPC puede renderizar el overworld de una forma concreta.
const worldPath = 'src/scenes/WorldScene.ts';
let world = fs.readFileSync(worldPath, 'utf8');
world = replaceOnce(
  world,
  "        const textureKey = placement.championId ? `${placement.championId}-overworld` : null;\n",
  "        const textureKey = placement.championId\n          ? placement.formId\n            ? `${placement.championId}-form-${placement.formId}-overworld`\n            : `${placement.championId}-overworld`\n          : null;\n",
  'texture key de forma NPC'
);
fs.writeFileSync(worldPath, world);

// 4) Validación correcta: un personaje narrativo no necesita Eco jugable.
const registryPath = 'src/data/DataRegistry.ts';
let registry = fs.readFileSync(registryPath, 'utf8');
registry = replaceOnce(
  registry,
  '      if (!this.championIndex.has(form.championId)) errors.push(`Forma "${form.championId}/${form.id}": el Eco base no tiene definición jugable.`);\n',
  '      if (!this.characterIndex.has(form.championId)) errors.push(`Forma "${form.championId}/${form.id}": personaje base desconocido.`);\n      if ((form.contentStatus === \'jugable\' || form.contentStatus === \'completo\') && !this.championIndex.has(form.championId)) {\n        errors.push(`Forma "${form.championId}/${form.id}": está marcada como jugable pero el Eco base no tiene definición jugable.`);\n      }\n',
  'validación de forma planeada'
);
registry = replaceOnce(
  registry,
  '      if (npc.championId && !this.championIndex.has(npc.championId)) errors.push(`NPC "${npc.id}": campeón/Eco desconocido "${npc.championId}".`);\n',
  '      if (npc.championId && !this.characterIndex.has(npc.championId)) errors.push(`NPC "${npc.id}": personaje desconocido "${npc.championId}".`);\n      if (npc.formId && (!npc.championId || !this.formIndex.has(formKey(npc.championId, npc.formId)))) {\n        errors.push(`NPC "${npc.id}": forma desconocida "${npc.championId ?? \'sin-campeon\'}/${npc.formId}".`);\n      }\n',
  'validación personaje/forma NPC'
);
fs.writeFileSync(registryPath, registry);

// 5) Galería visual provisional en Bandle para comparar tamaños con la misma escala runtime.
const npcPath = 'src/contenido/mundo/npcs/bandle-village.json';
const npcData = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
const teemo = npcData.find((npc) => npc.id === 'teemo-bandle');
if (teemo) teemo.escalaOverworld = 1.4;

const roster = [
  { id: 'corki-bandle-test', nombre: 'Corki', campeonId: 'corki', x: 170, y: 390, orientacion: 'abajo' },
  { id: 'gnar-bandle-test', nombre: 'Gnar', campeonId: 'gnar', x: 250, y: 390, orientacion: 'abajo' },
  { id: 'mega-gnar-bandle-test', nombre: 'Mega Gnar', campeonId: 'gnar', formaId: 'mega-gnar', x: 330, y: 390, orientacion: 'abajo' },
  { id: 'kennen-bandle-test', nombre: 'Kennen', campeonId: 'kennen', x: 410, y: 390, orientacion: 'abajo' },
  { id: 'kled-bandle-test', nombre: 'Kled', campeonId: 'kled', x: 620, y: 430, orientacion: 'abajo' },
  { id: 'lulu-bandle-test', nombre: 'Lulu', campeonId: 'lulu', x: 700, y: 430, orientacion: 'abajo' },
  { id: 'miss-fortune-bandle-test', nombre: 'Miss Fortune', campeonId: 'miss-fortune', x: 780, y: 430, orientacion: 'abajo' },
  { id: 'poppy-bandle-test', nombre: 'Poppy', campeonId: 'poppy', x: 170, y: 680, orientacion: 'arriba' },
  { id: 'rumble-bandle-test', nombre: 'Rumble', campeonId: 'rumble', x: 270, y: 680, orientacion: 'arriba' },
  { id: 'tristana-bandle-test', nombre: 'Tristana', campeonId: 'tristana', x: 370, y: 680, orientacion: 'arriba' },
  { id: 'veigar-bandle-test', nombre: 'Veigar', campeonId: 'veigar', x: 650, y: 680, orientacion: 'arriba' }
].map((npc) => ({
  ...npc,
  mapaId: 'bandle-village',
  escalaOverworld: 1.4,
  color: '#69d47c',
  condiciones: [],
  accionesAlHablar: [],
  comportamiento: { tipo: 'estatico' }
}));

for (const npc of roster) {
  if (!npcData.some((existing) => existing.id === npc.id)) npcData.push(npc);
}
fs.writeFileSync(npcPath, `${JSON.stringify(npcData, null, 2)}\n`);

// 6) Versión de prueba.
const bootPath = 'src/scenes/BootScene.ts';
let boot = fs.readFileSync(bootPath, 'utf8');
boot = replaceOnce(boot, "    this.registry.set('app.version', '14.3');", "    this.registry.set('app.version', '14.4');", 'versión BootScene');
fs.writeFileSync(bootPath, boot);

const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '0.14.4';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log('Parche v14.4 roster aplicado.');
