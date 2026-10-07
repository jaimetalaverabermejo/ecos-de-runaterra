# Jonia: mapas iniciales

Los recursos comunes están en `public/assets/world/tiles` y `public/assets/world/Tilesets`. Tanto Bandle como Jonia apuntan a estas carpetas.

- `jo01_koeshin`: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/JO01_Koeshin.tmj`.
- `jo02_white_cliffs`: `public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos.tmj`.
- Sus definiciones de juego están en `src/data/world/regions/ionia/zones`.
- El menú de Jonia usa el mapa general provisional y señala las dos zonas jugables. No permite viajes rápidos.

## Conexiones

Montañas de los Portales ↔ Koeshin ↔ Acantilados Blancos. La salida de Bandle requiere `story:kennen-portal-activated`, que ya concede Kennen. Los cuatro destinos tienen puntos de llegada fuera del acceso de retorno.

## Primera casa futura

Koeshin incluye el punto de retorno `from_koeshin_house_01` y una reserva en `DesignNotes` delante de la casa cercana al portal. Para crear el interior:

1. Registrar el mapa `koeshin_house_01` con un spawn `from_koeshin`.
2. Convertir la reserva `koeshin_house_01_entrance_reserved` en un objeto de la capa `Portals`, con `targetMap=koeshin_house_01` y `targetSpawn=from_koeshin`.
3. Añadir en el interior una salida con `targetMap=jo01_koeshin` y `targetSpawn=from_koeshin_house_01`.

La reserva no activa ninguna transición mientras no exista el interior. Antes de los primeros desbloqueos, ambas zonas permiten encontrar Kennen M7–8, sin condiciones. Completar las conversaciones de Yi en Koeshin o Wukong en Acantilados Blancos activa sus resonancias y sus apariciones en las rutas asignadas. Cada mapa tiene su propia tabla; las apariciones de Kennen también están registradas en su carpeta de campeón.

La distribución futura de personajes y rutas está en `docs/IONIA_PROGRESSION.md` y en `docs/diseno/jonia/plan-region.json`. Yi y Wukong ya tienen sus conversaciones activas, con la llegada de Kennen y el regreso al templo. Los otros desbloqueos siguen pendientes. Las 21 carpetas de zonas están preparadas con instrucciones de subida; subir un TMJ futuro requiere integrar después su definición y conexiones.

## Campeones

Los 21 campeones de Jonia están en `src/contenido/campeones/<id>/`: Ahri, Akali, Irelia, Ivern, Jhin, Karma, Kayn, Lee Sin, Lillia, Master Yi, Rakan, Sett, Shen, Syndra, Varus, Wukong, Xayah, Yasuo, Yone, Yunara y Zed.

Cada carpeta contiene `eco.json`, `estadisticas.json`, `habilidades.json`, `personaje.json` y sus imágenes. El selector de Showdown los carga automáticamente y muestra cuatro Ecos por página en orden alfabético. Los datos nuevos están junto a los anteriores, sin una carpeta separada para packs.

## Verificación

`npm run build` prepara los mapas y compila el juego. Después, `node scripts/check-world-maps.mjs` comprueba imágenes, tilesets, portales y puntos de llegada de los mapas activos.

## Representación y primera historia

Los mapas de Jonia usan tiled.layerOrder=authored para respetar el orden de capas de Tiled: ramas, flores y rocas decorativas quedan sobre el barranco. AbovePlayer conserva su altura superior. Los personajes sin escala declarada usan 0,52; Yi y Wukong declaran 0,60 en personaje.json, con frames de 96 px.

Kennen acompaña desde el portal hasta el templo usando el seguidor de mundo. Partidas que ya cruzaron lo encuentran al llegar a Koeshin. La conversación del templo alterna Kennen y Yi, desbloquea su resonancia y dirige al viajero a Wukong. El relato de Wukong permite volver a Yi con la primera pista; las siguientes rutas permanecen pendientes de mapa. Los antiguos duelos iniciales se conservan solo como archivo en docs/archivo/duelos.
