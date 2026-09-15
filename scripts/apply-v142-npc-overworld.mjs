import fs from 'node:fs';

function replaceOnce(text, oldValue, newValue, label) {
  if (text.includes(newValue)) return text;
  if (!text.includes(oldValue)) throw new Error(`No se encontró el ancla: ${label}`);
  return text.replace(oldValue, newValue);
}

const worldPath = 'src/scenes/WorldScene.ts';
let world = fs.readFileSync(worldPath, 'utf8');

world = replaceOnce(
  world,
  "import { SaveService } from '../systems/save/SaveService';\n",
  "import { SaveService } from '../systems/save/SaveService';\nimport { WorldStateService } from '../systems/world/WorldStateService';\n",
  'import WorldStateService'
);

world = replaceOnce(
  world,
  "  service?: NpcService;\n  visualType?: NpcVisualType;\n};",
  "  service?: NpcService;\n  visualType?: NpcVisualType;\n  championId?: string;\n  overworldScale?: number;\n};",
  'campos de NpcPlacement'
);

const oldNpcVisual = `      } else {
        const shadow = this.add.ellipse(0, 7, 26, 10, 0x07131e, 0.32);
        const torso = this.add.rectangle(0, -5, 18, 22, placement.color, 1).setStrokeStyle(2, 0x132630);
        const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
        visual = this.add.container(placement.x, placement.y, [shadow, torso, head]).setDepth(100 + placement.y);
      }
`;

const newNpcVisual = `      } else {
        const textureKey = placement.championId ? \`${'${placement.championId}'}-overworld\` : null;
        if (textureKey && this.textures.exists(textureKey)) {
          const shadow = this.add.ellipse(0, 7, 28, 10, 0x07131e, 0.32);
          const sprite = this.add.sprite(0, 7, textureKey, PLAYER_IDLE_FRAME[placement.facing])
            .setOrigin(0.5, 1)
            .setScale(placement.overworldScale ?? 1.4);
          visual = this.add.container(placement.x, placement.y, [shadow, sprite]).setDepth(100 + placement.y);
        } else {
          const shadow = this.add.ellipse(0, 7, 26, 10, 0x07131e, 0.32);
          const torso = this.add.rectangle(0, -5, 18, 22, placement.color, 1).setStrokeStyle(2, 0x132630);
          const head = this.add.circle(0, -20, 10, 0xe9c68d, 1).setStrokeStyle(2, 0x4a3229);
          visual = this.add.container(placement.x, placement.y, [shadow, torso, head]).setDepth(100 + placement.y);
        }
      }
`;

if (!world.includes('const textureKey = placement.championId')) {
  if (!world.includes(oldNpcVisual)) throw new Error('No se encontró el bloque visual NPC original');
  world = world.replace(oldNpcVisual, newNpcVisual);
}

world = replaceOnce(
  world,
  `  private beginNpcInteraction(npc: NpcRuntime): void {\n    const service = npc.placement.service;\n`,
  `  private beginNpcInteraction(npc: NpcRuntime): void {\n    if (WorldStateService.recordNpcSpoken(this.save, npc.placement.id)) {\n      SaveService.save(this.save);\n    }\n    const service = npc.placement.service;\n`,
  'registro de NPC hablado'
);

fs.writeFileSync(worldPath, world);

const interactions = `export const bandleVillageInteractions = {
  npcs: [
    {
      id: 'garen-bandle',
      name: 'Garen',
      championId: 'garen',
      overworldScale: 1.4,
      x: 596,
      y: 382,
      facing: 'left',
      color: 0x69d47c,
      dialogueId: 'garen-bandle-intro',
      service: { type: 'quest', questId: 'bandle-first-link' }
    },
    {
      id: 'teemo-bandle',
      name: 'Teemo',
      championId: 'teemo',
      overworldScale: 1.25,
      x: 822,
      y: 390,
      facing: 'down',
      color: 0xd4a65f,
      dialogueId: 'teemo-bandle-greeting'
    },
    {
      id: 'soraka-shrine-bandle',
      name: 'Santuario de Soraka',
      x: 520,
      y: 558,
      facing: 'down',
      color: 0x8f7de8,
      visualType: 'sanctuary',
      dialogueId: 'soraka-sanctuary-prayer',
      service: { type: 'sanctuary', sanctuaryId: 'bandle-soraka-shrine' }
    },
    {
      id: 'runeterra-merchant-bandle',
      name: 'Mercader',
      x: 760,
      y: 656,
      facing: 'down',
      color: 0x8a6a52,
      visualType: 'merchant',
      service: { type: 'shop', shopId: 'bandle-workshop' }
    }
  ],
  dialogues: [
    {
      id: 'garen-bandle-intro', startNodeId: 'start', nodes: [
        { id: 'start', speaker: 'Garen', lines: ['El Claro del Portal está reaccionando de forma extraña.', 'Necesito comprobar si esos Ecos pueden estabilizarse.'] }
      ]
    },
    {
      id: 'teemo-bandle-greeting', startNodeId: 'start', nodes: [
        { id: 'start', speaker: 'Teemo', lines: ['Hoy la plaza está más animada de lo normal.', 'Dicen que el Claro del Portal vuelve a reaccionar.'] }
      ]
    },
    {
      id: 'soraka-sanctuary-prayer', startNodeId: 'start', nodes: [
        { id: 'start', speaker: 'Santuario de Soraka', lines: ['Una luz estelar envuelve a tus Ecos.', 'El equipo recupera toda su Vida.', 'Este santuario queda ligado a tu viaje. Si todo el equipo cae, regresarás aquí.'] }
      ]
    }
  ]
} as const;
`;
fs.writeFileSync('src/data/world/regions/bandle-city/zones/bandle-village/interactions.ts', interactions);

const questPath = 'src/data/quests/bandle-first-link.json';
const quest = JSON.parse(fs.readFileSync(questPath, 'utf8'));
quest.description = 'Garen quiere comprobar si las anomalías del Claro del Portal pueden estabilizarse mediante un Vinculador Hextech.';
quest.startNpcId = 'garen-bandle';
quest.completionNpcId = 'garen-bandle';
fs.writeFileSync(questPath, `${JSON.stringify(quest, null, 2)}\n`);

const packagePath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
packageJson.version = '0.14.2';
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

const titlePath = 'src/scenes/TitleScene.ts';
let title = fs.readFileSync(titlePath, 'utf8');
if (title.includes('BUILD v14.1')) title = title.replace('BUILD v14.1', 'BUILD v14.2');
if (!title.includes('BUILD v14.2')) throw new Error('No se pudo actualizar el identificador visual a v14.2');
fs.writeFileSync(titlePath, title);

console.log('Parche v14.2 aplicado.');
