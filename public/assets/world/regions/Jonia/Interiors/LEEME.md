# Biblioteca de interiores de Jonia

10 plantillas genéricas y 6 mapas especiales hechos en Tiled: vivienda humilde, familiar, dos dormitorios, agricultor, pescador, taller, herborista, hospedería, residencia y alojamiento de monjes; templo de Koeshin, tienda, tres salas del teatro y santuario del Placidium.

Los PNG están en la carpeta común `public/assets/world/tiles/`, y los TSX en `public/assets/world/Tilesets/`. No se duplican los tiles en cada casa. Los TMJ están en `public/assets/world/regions/Jonia/Interiors/Plantillas/` y `Especiales/`.

Todos usan32×32, ortogonal, margen0 y separación0. El catálogo incluye tamaños, muebles, entrada, salida exterior por defecto y dos puntos accesibles de patrulla. Capas: Ground, Decoration, Structures, Obstacles, AbovePlayer, Spawns, Portals, Interactions, NpcSpawns, AuthoringNotes y Collisions. Muros: tiles de Obstacles. Muebles: rectángulos Collisions a sus pies. AuthoringNotes son notas de edición.

El preparador genera sus runtime JSON y conserva las propiedades de los tiles de los TSX. El comprobador de interiores, ejecutado en prebuild, verifica rutas, accesos, conexiones, contadores y cuerpos de patrulla.

## Despliegue en JO01–JO05

Las correcciones del usuario en `1e68126` se usan como base de las 21 casas exteriores. Hay 23 instancias jugables: los 21 IDs existentes y dos nuevas salas del teatro. `despliegue.json` documenta todas las asignaciones, puertas y fachadas. El taller narrativo conserva `jo03_lhradi_house_04`; la puerta exterior lleva a `jo03_lhradi_theatre_sala`, conectada a las bambalinas y al taller.

Las capas de tiles y su orden se conservan idénticas a la plantilla corregida. Spawns, destinos, colisiones exteriores y recorridos se validan por instancia. Los habitantes mantienen IDs, condiciones, diálogos y servicios; se mueven sobre suelo libre. `check-ionia-deployment.mjs` verifica las fachadas, puertas, retornos, patrullas y conservación del arte. Las posiciones antiguas dentro de una pared se recolocan de forma segura al cargar la partida.

La residencia incluye la escalera compacta corregida por el usuario; su conexión a otra planta sigue indicada como nota. La tienda conserva el mercader y el banco de fabricación, y se mantienen las historias y servicios existentes. La utilería específica y nuevas plantas pueden ampliarse sobre esta base.

Galería y ZIP: `assets/world/regions/Jonia/Interiors/index.html` en el servidor del juego. El ZIP conserva la estructura de carpetas para abrir los TMJ en Tiled. Vista de conjunto: `interiores-contacto.png`.
