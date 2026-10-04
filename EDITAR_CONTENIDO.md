# Guía para editar contenido

Todas las rutas parten de la raíz del repositorio en la rama main. Este es el índice para localizar el contenido vigente. docs/archivo conserva material histórico: no se carga ni se publica como recursos del juego. docs/diseno contiene planes pendientes, no contenido activo.

## Dónde editar cada cosa

| Contenido | Carpeta o archivo exacto |
|---|---|
| Campeones: datos e imágenes | src/contenido/campeones/<id>/ |
| Mapas de Jonia: archivos Tiled | public/assets/world/regions/Jonia/Zones/<carpeta>/ |
| Mapas de Bandle: archivos Tiled | public/assets/world/regions/bandle-city/zones/ |
| Definiciones y conexiones lógicas de mapas | src/data/world/regions/<region>/zones/<zona>/map.json |
| Tiles: imágenes comunes | public/assets/world/tiles/ |
| Tilesets: definiciones Tiled | public/assets/world/Tilesets/ |
| Plantillas de objetos y zonas Tiled | public/assets/world/templates/pickups/ y public/assets/world/templates/zones/ |
| NPCs: posición, condiciones y servicios | src/contenido/mundo/npcs/ |
| Diálogos | src/contenido/mundo/dialogos/ |
| Duelos y recompensas de personajes | src/contenido/mundo/duelos/ |
| Personajes ambientales e imágenes | src/contenido/mundo/actores/ |
| Misiones | src/data/quests/ |
| Objetos: estadísticas y efectos | src/data/items/ |
| Objetos: imágenes | public/assets/items/ |
| Recetas activas | src/data/recipes/crafting.json |
| Tienda activa | src/data/shops/bandle-workshop.json |
| Jugador: imágenes | public/assets/player/overworld.png y portrait.png |
| Tipos y afinidades | src/contenido/catalogos/tipos-v1.json |
| Catálogo global de Ecos | src/data/echoes/catalog.json |
| Progresión de maestría | src/data/progression/mastery.json |
| Definiciones de estadísticas | src/data/stats/definitions.json |
| Regiones del mundo | src/data/world/runeterra/regions.json |
| Posiciones en menú regional | src/data/world/regions/<region>/region-map.json |
| Mapa general de Jonia: imagen | public/assets/world/regions/Jonia/Jonia mapa general.png |
| Mapa general de Bandle: imagen | public/assets/world/regions/bandle-city/menu-map.png |
| Plan de Jonia y sus 21 rutas | docs/diseno/jonia/plan-region.json |
| Diseños pendientes de Bandle | docs/diseno/bandle/ |
| Catálogos pendientes de objetos y recetas | docs/diseno/catalogos/ |
| Interfaz: imágenes cargadas | public/assets/ui960/ y public/assets/ui960_addon/ |
| Atlas de combate y sus frames | src/ui/battle/v3/assets.ts y masterAtlas1.ts–masterAtlas6.ts |
| Panel de detalle de habilidad | src/ui/battle/v2/assets.ts y atlas1.ts–atlas2.ts |
| Código y reglas del juego | src/scenes/, src/systems/, src/ui/ |

## Campeones

Dentro de cada carpeta: personaje.json contiene identidad y presentación narrativa; eco.json define el Eco y su kit; estadisticas.json contiene estadísticas; habilidades.json contiene Q/W/E/R y efectos; apariciones.json controla rutas, maestrías, pesos y condiciones. Cambiar el plan de diseño no cambia las apariciones activas: estas se editan en el campeón.

Imágenes: overworld.png, retrato.png y combate/frente.png, combate/espalda.png. Formas en formas/<id>/ con forma.json y sus imágenes. Invocaciones en invocaciones/<id>/. Respeta las dimensiones de las hojas y los nombres existentes para que se descubran automáticamente. Ver docs/ASSET_SPECS.md.

| Campeón (ID) | Carpeta exacta |
|---|---|
| ahri | src/contenido/campeones/ahri/ |
| akali | src/contenido/campeones/akali/ |
| corki | src/contenido/campeones/corki/ |
| garen | src/contenido/campeones/garen/ |
| gnar | src/contenido/campeones/gnar/ |
| irelia | src/contenido/campeones/irelia/ |
| ivern | src/contenido/campeones/ivern/ |
| jhin | src/contenido/campeones/jhin/ |
| karma | src/contenido/campeones/karma/ |
| kayn | src/contenido/campeones/kayn/ |
| kennen | src/contenido/campeones/kennen/ |
| kled | src/contenido/campeones/kled/ |
| lee-sin | src/contenido/campeones/lee-sin/ |
| lillia | src/contenido/campeones/lillia/ |
| lulu | src/contenido/campeones/lulu/ |
| master-yi | src/contenido/campeones/master-yi/ |
| miss-fortune | src/contenido/campeones/miss-fortune/ |
| poppy | src/contenido/campeones/poppy/ |
| rakan | src/contenido/campeones/rakan/ |
| rumble | src/contenido/campeones/rumble/ |
| sett | src/contenido/campeones/sett/ |
| shen | src/contenido/campeones/shen/ |
| syndra | src/contenido/campeones/syndra/ |
| teemo | src/contenido/campeones/teemo/ |
| tristana | src/contenido/campeones/tristana/ |
| varus | src/contenido/campeones/varus/ |
| veigar | src/contenido/campeones/veigar/ |
| wukong | src/contenido/campeones/wukong/ |
| xayah | src/contenido/campeones/xayah/ |
| yasuo | src/contenido/campeones/yasuo/ |
| yone | src/contenido/campeones/yone/ |
| yunara | src/contenido/campeones/yunara/ |
| zed | src/contenido/campeones/zed/ |

## Mapas

Edita y guarda el .tmj en Tiled. Los .runtime.json son generados automáticamente; no los edites ni los subas. map.json registra el mapa, tilesets y llegadas; los objetos Portals del TMJ contienen targetMap/targetSpawn, y Spawns contiene los puntos de llegada. Ambos extremos deben existir. Los NPCs usan su catálogo y puntos NpcSpawns cuando se declaran.

Los nombres de carpetas visuales y los IDs de juego no siempre coinciden: utiliza esta tabla.

| ID del juego | TMJ que debes editar | Definición lógica |
|---|---|---|
| bandle_house_02 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_02.tmj | src/data/world/regions/bandle-city/zones/bandle-house-02/map.json |
| bandle_house_03 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_03.tmj | src/data/world/regions/bandle-city/zones/bandle-house-03/map.json |
| bandle_house_04 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_04.tmj | src/data/world/regions/bandle-city/zones/bandle-house-04/map.json |
| bandle_house_05 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_05.tmj | src/data/world/regions/bandle-city/zones/bandle-house-05/map.json |
| bandle_house_06 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_06.tmj | src/data/world/regions/bandle-city/zones/bandle-house-06/map.json |
| bandle_house_07 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_07.tmj | src/data/world/regions/bandle-city/zones/bandle-house-07/map.json |
| bandle_house_08 | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/bandle_house_08.tmj | src/data/world/regions/bandle-city/zones/bandle-house-08/map.json |
| bandle_village | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_village.tmj | src/data/world/regions/bandle-city/zones/bandle_village/map.json |
| clearing | public/assets/world/regions/bandle-city/zones/clearing/clearing.tmj | src/data/world/regions/bandle-city/zones/clearing/map.json |
| angar_corki | public/assets/world/regions/bandle-city/zones/Angar_corki/angar_corki.tmj | src/data/world/regions/bandle-city/zones/corki-hangar/map.json |
| dark_forest | public/assets/world/regions/bandle-city/zones/Dark_forest/Dark_forest.tmj | src/data/world/regions/bandle-city/zones/dark-forest/map.json |
| gnar_cave | public/assets/world/regions/bandle-city/zones/Gnar_valley/Gnar_cave/Gnar_cave.tmj | src/data/world/regions/bandle-city/zones/gnar-cave/map.json |
| gnar_valley | public/assets/world/regions/bandle-city/zones/Gnar_valley/Gnar_valley.tmj | src/data/world/regions/bandle-city/zones/gnar-valley/map.json |
| portal_mountains | public/assets/world/regions/bandle-city/zones/Portal_mountains/portal_mountains.tmj | src/data/world/regions/bandle-city/zones/portal_mountains/map.json |
| three-house | public/assets/world/regions/bandle-city/zones/bandle_village/bandle_houses/three-house.tmj | src/data/world/regions/bandle-city/zones/three-house/map.json |
| jo01_koeshin | public/assets/world/regions/Jonia/Zones/JO01_Koeshin/JO01_Koeshin.tmj | src/data/world/regions/ionia/zones/jo01_koeshin/map.json |
| jo02_white_cliffs | public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos.tmj | src/data/world/regions/ionia/zones/jo02_white_cliffs/map.json |

### Las 21 zonas de Jonia

JO01 y JO02 ya funcionan. Las demás carpetas están preparadas para subir los mapas: subir el TMJ no lo registra automáticamente. Después se añade su map.json, preparación y conexiones. Cada README indica espacios reservados y archivo esperado.

| Carpeta exacta | TMJ esperado |
|---|---|
| public/assets/world/regions/Jonia/Zones/JO01_Koeshin/ | JO01_Koeshin.tmj |
| public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/ | JO02_Acantilados_Blancos.tmj |
| public/assets/world/regions/Jonia/Zones/JO03_Lhradi/ | JO03_Lhradi.tmj |
| public/assets/world/regions/Jonia/Zones/JO04_Camino_Arrozales/ | JO04_Camino_Arrozales.tmj |
| public/assets/world/regions/Jonia/Zones/JO05_Placidium_Navori/ | JO05_Placidium_Navori.tmj |
| public/assets/world/regions/Jonia/Zones/JO06_Senda_Estuario/ | JO06_Senda_Estuario.tmj |
| public/assets/world/regions/Jonia/Zones/JO07_Puerto_Wehle/ | JO07_Puerto_Wehle.tmj |
| public/assets/world/regions/Jonia/Zones/JO08_Paso_Cumbres/ | JO08_Paso_Cumbres.tmj |
| public/assets/world/regions/Jonia/Zones/JO09_Desembarco_Bosque/ | JO09_Desembarco_Bosque.tmj |
| public/assets/world/regions/Jonia/Zones/JO10_Jardin_Olvido/ | JO10_Jardin_Olvido.tmj |
| public/assets/world/regions/Jonia/Zones/JO11_Omikayalan/ | JO11_Omikayalan.tmj |
| public/assets/world/regions/Jonia/Zones/JO12_Sendero_Raices/ | JO12_Sendero_Raices.tmj |
| public/assets/world/regions/Jonia/Zones/JO13_Refugio_Vastaya/ | JO13_Refugio_Vastaya.tmj |
| public/assets/world/regions/Jonia/Zones/JO14_Costa_Faelor/ | JO14_Costa_Faelor.tmj |
| public/assets/world/regions/Jonia/Zones/JO15_Recinto_Faelor/ | JO15_Recinto_Faelor.tmj |
| public/assets/world/regions/Jonia/Zones/JO16_Poblado_Ordenes/ | JO16_Poblado_Ordenes.tmj |
| public/assets/world/regions/Jonia/Zones/JO17_Templo_Kinkou/ | JO17_Templo_Kinkou.tmj |
| public/assets/world/regions/Jonia/Zones/JO18_Barranco_Sombra/ | JO18_Barranco_Sombra.tmj |
| public/assets/world/regions/Jonia/Zones/JO19_Camino_Errantes/ | JO19_Camino_Errantes.tmj |
| public/assets/world/regions/Jonia/Zones/JO20_Santuario_Prueba/ | JO20_Santuario_Prueba.tmj |
| public/assets/world/regions/Jonia/Zones/JO21_Islote_Reencuentro/ | JO21_Islote_Reencuentro.tmj |

## Tiles y tilesets

Los PNG comunes van en public/assets/world/tiles y los TSX en public/assets/world/Tilesets (respeta estas mayúsculas: el servidor distingue Tilesets y tiles). Cambiar un PNG afecta a todos los mapas que lo comparten. Mantén tamaño, cuadrícula de 32 px y orden de los tiles para sustituir arte sin desplazar los GID.

Los TSX deben apuntar a ../tiles/<imagen>.png. Al abrir el mapa comprueba si el tileset está enlazado externamente o incrustado: un tileset incrustado se edita desde ese TMJ y no cambia por modificar un TSX aparte. Si añades tilesets a un mapa hay que actualizar map.json para cargar sus imágenes. Conservamos Hierba.png y bandle_06_arboles_32.png como reservas de autoría.

## Interfaz y archivos de archivo

La UI actual usa PNG de ui960/ui960_addon y atlas incrustados de combate. Reemplazar un PNG suelto archivado no modifica el atlas. Para cambiar combate se necesita regenerar el atlas y sus frames. Dos botones idénticos pueden compartir un PNG: los alias de textura se conservan para que funcionen todos los menús.

Los originales sin carga directa, cuatro imágenes antiguas de campeones, tres tilesets rotos y prototipos están en docs/archivo. Los parches históricos de escenas siguen activos y no se han eliminado; su integración interna requiere una refactorización separada.

## Comprobación tras editar

`npm run build` prepara los mapas y compila. `node scripts/check-world-maps.mjs` comprueba recursos y portales; `node scripts/check-ionia-plan.mjs` comprueba el plan y las apariciones; `node scripts/check-wild-escape.mjs` comprueba la huida. No cambies IDs de campeones, mapas ni banderas para corregir una etiqueta visible: pueden estar guardados en las partidas.

## Primera historia de Jonia

NPCs y seguidor de Kennen: src/contenido/mundo/npcs/ionia-first-routes.json; conversaciones de Kennen, Yi y Wukong: src/contenido/mundo/dialogos/ionia-first-routes.json. El diálogo admite siguienteNodoId para cambiar de interlocutor sin mostrar opciones y actualizarMundoAlCerrar para aplicar cambios de personajes al terminar. La escala del NPC se ajusta en personaje.json → visual.escalaOverworld. Los mapas de Jonia respetan el orden de capas del TMJ mediante tiled.layerOrder=authored en map.json.
