# Swain, Mel y Riven: catálogo jugable

## Criterio de estadísticas

Arquetipos inspirados en Pokémon, adaptados manualmente a los valores y crecimiento de los Ecos existentes. No se copian sus cifras literalmente, tipos ni habilidades. Los repartos de referencia se conservan en `docs/diseno/jonia/arquetipos-combate.json`, con orden explícito de atributos.

| Eco | Arquetipo | Vida | Ataque | Poder | Defensa | Resistencia | Velocidad |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Swain | Slowbro: tanque mágico lento | 112 | 10 | 22 | 18 | 13 | 8 |
| Mel | Espeon: maga rápida, poca defensa física | 82 | 8 | 28 | 8 | 16 | 21 |
| Riven | Gallade: espadachina física con resistencia especial | 96 | 26 | 7 | 10 | 17 | 17 |

Fuentes de los repartos Pokémon: https://pokemondb.net/pokedex/slowbro, https://pokemondb.net/pokedex/espeon, https://pokemondb.net/pokedex/gallade. Los números de esta tabla son diseño del juego. Los JSON de estadísticas contienen además el crecimiento por maestría; los tres tienen tier A y desbloqueos normales Q1/W3/E5/R8.

## Swain

- Pasiva: W/E que impactan recuperan un 5% de la Vida máxima, una vez por lanzamiento.
- Q: descarga mágica de un objetivo, potencia 22/27/32/37/42, CD1.
- W: daño a todos los enemigos, potencia 10/13/16/19/22; −20% de Velocidad durante dos turnos, CD3.
- E: daño de un objetivo, potencia 15/19/23/27/31 y aturdimiento de un turno, CD3.
- R: +40% de Vida máxima, incluyendo Vida de objetos; concede inmediatamente la diferencia de máximos. Durante tres turnos propios, incluyendo la activación, drena a todos los rivales vivos al final del turno. Cada objetivo recibe `6 + 2 × rango R + 0,1 × Poder`, antes de escudos, y cura el 50% del daño efectivo, limitado por la Vida que realmente perdió cada rival. CD6.

La forma temporal no acumula estadísticas en la partida. Al expirar se limita la Vida actual al máximo normal; el aumento no se conserva fuera del combate. Se reutiliza el arte aprobado de Swain, sin inventar sprites de una forma adicional.

## Mel

- Pasiva: Q/E que impactan aplican una marca Deslumbrar por objetivo y lanzamiento, hasta tres. Los tres impactos de Q no añaden tres marcas.
- Q: tres proyectiles, potencia total 24/29/34/39/44, CD1.
- W: prioridad +3, espejo de un solo uso hasta el inicio de su siguiente turno, CD4. Reenvía daño y estados negativos de la primera habilidad ofensiva dirigida a Mel. No refleja básicos, ticks periódicos ni provoca cadenas de reflejos. Un área sigue alcanzando a los demás objetivos.
- E: potencia 13/17/21/25/29 y aturdimiento de un turno, CD3.
- R: todos los enemigos marcados reciben daño aumentado por sus marcas, que se consumen. Bajo el 25% de Vida añade daño de ejecución; no causa una eliminación automática. CD5.

## Riven

- Pasiva: cada habilidad concede una carga, máximo tres. Riven dispone de un botón BÁSICO propio en individual y dobles, con selección de objetivo; su IA lo utiliza al reunir dos cargas. Un básico que impacta consume una para aumentar su daño un 30%.
- Q: tres impactos en una acción, potencia total 26/31/36/41/46. Los impactos comparten el escalado total, con pesos 1:1:1,4 para que el tercero sea más fuerte. No añade control, CD1.
- W: potencia 12/16/20/24/28 y aturdimiento de un turno, CD3.
- E: prioridad +2, escudo de 24/30/36/42/48 durante un turno, CD3.
- R: +35% de Ataque durante tres turnos y una reactivación Cuchillada de viento. El remate consume otra acción, golpea a todos los rivales con potencia 30/40/50 y multiplica su daño hasta un 80% adicional según la Vida faltante. Activación y remate comparten CD6; el enfriamiento comienza al consumir o dejar expirar la ventana.

Los efectos, duraciones y cifras son las adaptaciones aprobadas para Ecos de Runaterra, no una reproducción exacta de LoL.

## Luchadores básicos

Los siete ya estaban publicados con estadísticas y ataques; se conservan sus cifras para no alterar las rutas iniciales. Como referencia de reparto: monje/Hitmontop, guardián/Sneasel, miliciana/Mienfoo, lancero/Pawniard, ballestero/Remoraid, escudero/Shieldon y comandante/Bisharp. Es una analogía de función, no equivalencia numérica.

`src/contenido/mundo/combatientes/catalogo.json` contiene base, crecimiento, dos técnicas por soldado y tres en el comandante. Están conectados a los frontales, overworld, escenas de combate y pruebas. Siguen sin ser capturables ni figurar en la colección de Ecos.

## Disponibilidad y pruebas

Los tres campeones tienen personaje, Eco, estadísticas, pasiva, cuatro habilidades principales, perfiles de animación, textos de ayuda y su pack de arte original. Se pueden utilizar en el sandbox de combate. Las apariciones salvajes quedan vacías hasta conectarlas a sus desenlaces narrativos; no se adelantan capturas ni resonancias.

El combate final de la historia sigue pendiente de la integración de Irelia como aliada IA; no se sustituye por una victoria automática. El catálogo de Swain ya está preparado para ese paso. La secundaria de Riven y la escena de Mel conservan su guion pendiente de integración narrativa.

`npm run check:champion-kits` ejecuta los kits y rutas reales de las escenas individual/doble: espejo, control reflejado, área sobre el compañero, curación/vida temporal, tres pulsos exactos, cargas, tres golpes, marcas, remate y enfriamiento compartido. También se mantienen las pruebas de los siete combatientes y de los encuentros mixtos.

Arte aportado: frentes/espaldas/retratos 192×192 y overworld 288×384. Se mantiene transparente y sin ampliarlo. La revisión en navegador del juego sigue pendiente.
