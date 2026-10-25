import catalog from './mundo/combatientes/catalogo.json';
const fronts = import.meta.glob('./mundo/actores/Frente/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export class CatalogoCombatientes {
  static assets(): Array<{ textureKey: string; url: string }> {
    return catalog.map(unit => {
      const filename = unit.actorId.replace(/-overworld$/, '') + '-frente.png';
      const url = fronts['./mundo/actores/Frente/' + filename];
      if (!url) throw new Error(`Falta frontal de combatiente: ${unit.id}`);
      return { textureKey: unit.id + '-battle-front', url };
    });
  }
}
