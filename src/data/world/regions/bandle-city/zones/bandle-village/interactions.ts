export const bandleVillageInteractions = {
  npcs: [
    { id: 'guide-village', name: 'Explorador yordle', x: 596, y: 382, facing: 'left', color: 0x69d47c, dialogueId: 'guide-village-intro' },
    { id: 'villager-village', name: 'Aldeano yordle', x: 822, y: 390, facing: 'down', color: 0xd4a65f, dialogueId: 'villager-greeting' },
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
      id: 'guide-village-intro', startNodeId: 'start', nodes: [
        { id: 'start', speaker: 'Explorador yordle', lines: ['¡Bienvenido a la Aldea de Bandle!', '¿Quieres que te explique cómo funciona el pueblo?'], choices: [
          { label: 'Sí', nextNodeId: 'explain' }, { label: 'No', nextNodeId: 'skip' }
        ] },
        { id: 'explain', speaker: 'Explorador yordle', lines: ['Puedes entrar en algunas casas y hablar con los aldeanos.', 'Busca el emblema dorado de la tienda para comprar componentes.'] },
        { id: 'skip', speaker: 'Explorador yordle', lines: ['Perfecto. Explora a tu ritmo.'] }
      ]
    },
    {
      id: 'villager-greeting', startNodeId: 'start', nodes: [
        { id: 'start', speaker: 'Aldeano yordle', lines: ['Hoy la plaza está más animada de lo normal.', 'Dicen que el Claro del Portal vuelve a reaccionar.'] }
      ]
    }
  ]
} as const;
