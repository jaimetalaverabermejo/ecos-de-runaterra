# Atlas de navegación

El menú abre la región actual. El visor de Jonia contiene un mapa general de cinco islas y tres láminas de detalle. Bandle conserva su ilustración y usa el mismo visor y marcador.

`src/data/MapAtlas.ts` define la jerarquía, imágenes, zonas y coordenadas normalizadas de los embarques. `parent` permite volver de zona/isla a región y de región a Runaterra; no se infiere el nivel a partir del nombre del archivo. La entrada mundial ofrece las regiones que tienen láminas, y reserva las demás para futuras incorporaciones.

Las ilustraciones se cargan en BootScene desde `public/assets/world/atlas`. Son las cuatro imágenes aprobadas, convertidas a WebP sin cambiar su composición. Las líneas doradas representan conexiones entre zonas, no el trazado exacto de cada camino. La posición actual indica la zona que contiene al jugador, no su casilla exacta.

Las conexiones terrestres proceden de `IONIA_LAND_ROUTES`, la misma topología comprobada contra los portales Tiled. Los embarques y los destinos disponibles proceden de `ferries.json` y `FerryService.destination`; los destinos marítimos pendientes aparecen en gris. Las conexiones terrestres describen la geografía; las condiciones narrativas se siguen resolviendo al acercarse al paso en el mundo.

La selección dorada es independiente de la ubicación actual turquesa, que tiene halo pulsante, flecha y rótulo. `currentAtlasZone` resuelve exteriores, interiores y alias de Bandle. Consultar otra región no inventa una ubicación. «Mi ubicación» vuelve al detalle que contiene al jugador. No hay viaje rápido: ninguna acción del atlas modifica el save.

## Añadir una lámina

1. Registrar un `AtlasView` con su padre, región, textura e imagen.
2. Añadir sus puntos con identificadores reales de zona y coordenadas entre 0 y 1.
3. Añadir un punto `child` en su padre. Si varios puntos abren la misma lámina, especificar `zones` para distinguir a qué isla pertenece la ubicación actual.
4. Registrar coordenadas de `harbors` junto a la costa ilustrada y cargar la textura en BootScene.
5. Mantener las rutas y condiciones en los sistemas del mundo, no en el dibujo.

Controles: puntero sobre zona/lista/puerto; dirección para seleccionar; A/Intro para abrir detalle; B/Escape para subir nivel. Desde Runaterra se vuelve al menú. El visor conserva la proporción original de cada imagen.

Validación: `node scripts/check-atlas.mjs`, `node scripts/check-gamepad.mjs`, `npm run build`. El chequeo del atlas forma parte de prebuild y valida cobertura única de las 21 zonas, asignación a cinco islas, jerarquía, interiores, alias y assets.
