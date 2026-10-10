# Jonia: mapas iniciales

Los recursos comunes están en `public/assets/world/tiles` y `public/assets/world/Tilesets`. Tanto Bandle como Jonia apuntan a estas carpetas.

- `jo01_koeshin`: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/JO01_Koeshin.tmj`.
- `jo02_white_cliffs`: `public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos.tmj`.
- `jo03_lhradi`: `public/assets/world/regions/Jonia/Zones/JO03_Lhradi/JO03_Lhradi.tmj`.
- `jo04_rice_fields`: `public/assets/world/regions/Jonia/Zones/JO04_Camino_Arrozales/JO04_Camino_Arrozales.tmj`.
- `jo05_placidium`: `public/assets/world/regions/Jonia/Zones/JO05_Placidium_Navori/JO05_Placidium_Navori.tmj`.
- Sus definiciones de juego están en `src/data/world/regions/ionia/zones`.
- El menú de Jonia usa el mapa general provisional y señala las cinco zonas jugables. No permite viajes rápidos.

## Conexiones

Montañas de los Portales ↔ Koeshin ↔ Acantilados Blancos ↔ Lhradi ↔ Arrozales ↔ Placidium. La salida de Bandle requiere `story:kennen-portal-activated`, que ya concede Kennen. Los destinos tienen puntos de llegada fuera del acceso de retorno; las salidas siguen el ancho actual de los caminos.

## Casas, puertas y servicios

Hay 21 interiores: dos en Koeshin, uno en Acantilados, ocho en Lhradi, uno en Arrozales y nueve en Placidium. Se entra con el botón de interacción delante de cada puerta y se sale caminando por la puerta interior. Los interiores reutilizan por ahora el suelo, mobiliario y distribución existente de Bandle; tienen habitantes y textos de Jonia. Se conservan las capas artísticas exteriores sin modificaciones.

Lhradi tiene mercader exterior e interior con el mismo catálogo inicial de Bandle y nombre propio. Su tienda incluye un banco de fabricación, disponible después del desbloqueo de Bandle. El círculo central de Soraka cura al equipo y a la reserva al entrar, guarda el checkpoint y habilita la Reserva de Ecos mientras se permanece dentro. La oración mantiene la interacción manual. Una derrota devuelve al santuario de Jonia conservando región y zona.

Antes de los primeros desbloqueos, JO01 y JO02 permiten encontrar Kennen M7–8, sin condiciones. Completar las conversaciones de Yi o Wukong activa sus resonancias. JO03–JO05 usan Kennen como respaldo únicamente si no hay ninguna resonancia inicial disponible; se retira en cuanto se habilita una. Cada mapa tiene su propia tabla y rango.

La distribución de personajes y rutas está en `docs/IONIA_PROGRESSION.md` y `docs/diseno/jonia/plan-region.json`. Sett, Jhin y Karma tienen objetivos, diálogos y duelos activos. Irelia tiene su duelo final preparado, condicionado a `story:ionia-trial-complete`; no aparece durante esta primera visita. Los TMJ de JO06–JO21 existen como material de diseño y no están registrados como jugables.

## Campeones

Los 21 campeones de Jonia están en `src/contenido/campeones/<id>/`: Ahri, Akali, Irelia, Ivern, Jhin, Karma, Kayn, Lee Sin, Lillia, Master Yi, Rakan, Sett, Shen, Syndra, Varus, Wukong, Xayah, Yasuo, Yone, Yunara y Zed.

Cada carpeta contiene `eco.json`, `estadisticas.json`, `habilidades.json`, `personaje.json` y sus imágenes. El selector de Showdown los carga automáticamente y muestra cuatro Ecos por página en orden alfabético. Los datos nuevos están junto a los anteriores, sin una carpeta separada para packs.

## Verificación

`npm run build` prepara los mapas y compila el juego. Después, `node scripts/check-world-maps.mjs` comprueba imágenes, tilesets, portales y puntos de llegada de los mapas activos.

`node scripts/check-ionia-access.cjs` comprueba acceso desde la entrada a los spawns, puertas, objetivos y hierbas terrestres. `node scripts/check-ionia-plan.mjs` comprueba las condiciones y el reparto narrativo. La revisión en navegador comprueba puertas, historias, desbloqueos, curación, reserva, recuperación tras derrota, tienda, transiciones físicas y cruce de puentes.

La capa `Agua` se dibuja en el orden de Tiled y bloquea el paso a pie, salvo los puentes de `Paths`. `BridgeRails` mantiene cerrados sus laterales. La navegación y el surf quedan reservados para una fase futura; las hierbas sobre agua se conservan como material del mapa y no forman parte del recorrido terrestre.

## Representación y primera historia

Los mapas de Jonia usan tiled.layerOrder=authored para respetar el orden de capas de Tiled: ramas, flores y rocas decorativas quedan sobre el barranco. AbovePlayer conserva su altura superior. Los personajes sin escala declarada usan 0,52; Yi y Wukong declaran 0,60 en personaje.json, con frames de 96 px.

Kennen acompaña desde el portal hasta el templo usando el seguidor de mundo. Partidas que ya cruzaron lo encuentran al llegar a Koeshin. La conversación del templo alterna Kennen y Yi, desbloquea su resonancia y dirige al viajero a Wukong. El relato de Wukong permite volver a Yi con la primera pista y continuar hasta Lhradi. Los antiguos duelos iniciales se conservan solo como archivo en docs/archivo/duelos.
