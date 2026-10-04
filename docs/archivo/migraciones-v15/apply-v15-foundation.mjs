import fs from 'node:fs';

function patch(path, from, to) {
  const text = fs.readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error(`Patrón no encontrado en ${path}`);
  fs.writeFileSync(path, text.replace(from, to));
}

patch(
  'src/data/types.ts',
  "  handlerId?: string;\n}",
  "  handlerId?: string;\n  params?: Record<string, string | number | boolean>;\n}"
);

patch(
  'src/contenido/CatalogoContenido.ts',
  "  gestorId?: string;\n}",
  "  gestorId?: string;\n  parametros?: Record<string, string | number | boolean>;\n}"
);

patch(
  'src/contenido/CatalogoContenido.ts',
  "    chance: effect.probabilidad,\n    handlerId: effect.gestorId\n",
  "    chance: effect.probabilidad,\n    handlerId: effect.gestorId,\n    params: effect.parametros\n"
);

patch(
  'src/scenes/BattleScene.ts',
  "  private playerBattleTexture(championId: string): string {\n    if (championId === 'garen') return 'garen-battle-back';\n    if (championId === 'teemo') return 'teemo-battle-front';\n    return 'garen-battle-back';\n  }\n\n  private wildBattleTexture(championId: string): string {\n    if (championId === 'garen') return 'garen-battle-front';\n    if (championId === 'teemo') return 'teemo-battle-front';\n    return 'teemo-battle-front';\n  }",
  "  private playerBattleTexture(championId: string): string {\n    const back = championId + '-battle-back';\n    if (this.textures.exists(back)) return back;\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'garen-battle-back';\n  }\n\n  private wildBattleTexture(championId: string): string {\n    const front = championId + '-battle-front';\n    if (this.textures.exists(front)) return front;\n    return 'teemo-battle-front';\n  }"
);

patch(
  'src/scenes/BattleScene.ts',
  "    const playerSize = this.playerChampion.championId === 'garen' ? { width: 132, height: 134 } : { width: 92, height: 108 };",
  "    const playerSize = this.playerChampion.championId === 'garen' ? { width: 132, height: 134 } : { width: 104, height: 116 };"
);

patch(
  'src/scenes/BattleScene.ts',
  "    const wildSize = this.wildChampion.championId === 'garen' ? { width: 116, height: 120 } : { width: 92, height: 108 };",
  "    const wildSize = this.wildChampion.championId === 'garen' ? { width: 116, height: 120 } : { width: 104, height: 116 };"
);

console.log('v15 foundation patch applied');
