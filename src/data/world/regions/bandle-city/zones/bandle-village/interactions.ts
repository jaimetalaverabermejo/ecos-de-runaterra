export const bandleVillageInteractions = {
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
