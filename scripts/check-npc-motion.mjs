import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
let count = 0;
for (const file of readdirSync('src/contenido/mundo/npcs').filter(file=>file.endsWith('.json'))) {
  const entries = [JSON.parse(readFileSync(`src/contenido/mundo/npcs/${file}`, 'utf8'))].flat();
  for (const npc of entries) {
    if (npc.tipoVisual === 'santuario') continue;
    assert(npc.comportamiento?.tipo !== 'estatico' || typeof npc.excepcionMovimientoAutorizada === 'string',
      `${npc.id}: stationary NPC requires an explicitly user-authorized exception.`);
    if (npc.comportamiento?.tipo === 'patrulla') {
      const points = npc.comportamiento.puntos ?? [];
      assert(new Set(points.map(p=>`${p.x},${p.y}`)).size >= 2, `${npc.id}: patrol needs distinct positions.`);
    }
    count++;
  }
}
console.log(`Validated movement policy for ${count} world people and champions.`);
