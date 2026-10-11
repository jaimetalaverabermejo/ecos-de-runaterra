# Biblioteca de interiores de Jonia

10 plantillas genéricas y 6 mapas especiales hechos en Tiled: vivienda humilde, familiar, dos dormitorios, agricultor, pescador, taller, herborista, hospedería, residencia y alojamiento de monjes; templo de Koeshin, tienda, tres salas del teatro y santuario del Placidium.

Los PNG están en la carpeta común `public/assets/world/tiles/`, y los TSX en `public/assets/world/Tilesets/`. No se duplican los tiles en cada casa. Los TMJ están en `public/assets/world/regions/Jonia/Interiors/Plantillas/` y `Especiales/`.

Todos usan32×32, ortogonal, margen0 y separación0. El catálogo incluye tamaños, muebles, entrada, salida exterior por defecto y dos puntos accesibles de patrulla. Capas: Ground, Decoration, Structures, Obstacles, AbovePlayer, Spawns, Portals, Interactions, NpcSpawns, AuthoringNotes y Collisions. Muros: tiles de Obstacles. Muebles: rectángulos Collisions a sus pies. AuthoringNotes son notas de edición.

El preparador genera sus runtime JSON y conserva las propiedades de los tiles de los TSX. El comprobador de interiores, ejecutado en prebuild, verifica rutas, accesos, conexiones, contadores y cuerpos de patrulla.

## Despliegue siguiente

Esta biblioteca no sustituye automáticamente los 21 interiores actuales de Jonia ni modifica misiones, personajes o banderas. Los destinos exteriores son ejemplos válidos que se adaptarán a cada edificio. Las salas del teatro se conectan por ID de biblioteca; al integrarlas hay que conservar el ID del taller narrativo existente. NpcSpawns define un puesto y una patrulla, no un habitante estático.

La residencia incluye la escalera compacta aprobada. Su conexión a otra planta se indica como nota, sin portal ficticio. Los especiales usan el pack base; utilería teatral, máscaras y efectos ceremoniales requieren futura ampliación. La tienda y el santuario reservan espacios para servicios, que se asignarán al instanciar.

Galería y ZIP: `assets/world/regions/Jonia/Interiors/index.html` en el servidor del juego. El ZIP conserva la estructura de carpetas para abrir los TMJ en Tiled. Vista de conjunto: `interiores-contacto.png`.
