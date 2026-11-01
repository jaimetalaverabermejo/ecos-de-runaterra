# Noxus — diez mapas Tiled

Primera versión regional construida con los recursos de NO01 y las láminas de referencia de Jaime. Abrir `public/assets/world/regions/Noxus/Noxus.world` en Tiled para ver las diez piezas, o editar cada `.tmj` por separado. Todos usan cuadrícula de 32 px y el orden de capas del archivo.

NO01 se ha trasladado desde su carpeta provisional de Jonia. Sus capas de tiles se conservan idénticas a la revisión manual `806156c`; solo se han añadido reservas de llegada y conexiones con Basilich y el atajo vigilado. Las rutas relativas de los tilesets mantienen su profundidad.

| Mapa | Tamaño (tiles) | Composición |
| --- | --- | --- |
| [NO01_Puerto](mapas/NO01_Puerto.jpg) | 74 × 64 | Puerto manual de Jaime, dos muelles, acceso norte y atajo vigilado. |
| [NO02_Cruce_Caravanas](mapas/NO02_Cruce_Caravanas.jpg) | 88 × 68 | Posada, mercado de tránsito, almacén, corral, río y puente hacia la capital. |
| [NO03_Basilich](mapas/NO03_Basilich.jpg) | 88 × 78 | Ciudad amurallada en la costa, plaza, viviendas, gobierno elevado y mirador. |
| [NO04_Suministros](mapas/NO04_Suministros.jpg) | 88 × 76 | Recinto militar, almacenes, intendencia, patio de instrucción, granja y puente. |
| [NO05_Capital_Exterior](mapas/NO05_Capital_Exterior.jpg) | 112 × 100 | Capital con cuarenta edificios, distritos, mercados, jardines y el Bastión aprobado en el centro. |
| [NO06_Bastion_Interior](mapas/NO06_Bastion_Interior.jpg) | 82 × 84 | Patios del recinto interior, guardia, oficinas, armería y escalinata del Bastión. |
| [NO07_Memorial_Sion](mapas/NO07_Memorial_Sion.jpg) | 100 × 76 | Camino del litoral, casas de cuidadores, puente al islote, templo y estatua de Sion. |
| [NO08_Frontera_Occidental](mapas/NO08_Frontera_Occidental.jpg) | 96 × 76 | Muralla fronteriza, control del paso, río, puente, extracción y miradores. |
| [NO09_Delverhold](mapas/NO09_Delverhold.jpg) | 88 × 76 | Guarnición, comandancia, barracones, forja, cantera y puente hacia la frontera. |
| [NO10_Ironspike](mapas/NO10_Ironspike.jpg) | 88 × 88 | Paso de montaña, cuatro escaleras entre terrazas, cantera, bocamina, puente y puesto de guardia. |

## Uso y alcance

Las fuentes incluyen spawns y portales bidireccionales entre las diez piezas. El atajo puerto–Caravanas queda condicionado por `noxus:atajo-puerto-abierto`. Los accesos de edificios se reservan en DesignNotes para una fase de interiores; no apuntan a mapas inexistentes. NO06 representa el recinto interior de la fortaleza, no una sala interior del edificio. No se han añadido NPC sin movimiento ni cambiado las historias, encuentros, regiones desbloqueadas o partidas guardadas.

Los runtime se generan con `node scripts/prepare-tiled-maps.mjs`; no se versionan. Para una futura integración jugable, registrar los IDs del manifiesto en el catálogo de mapas y usar `tiled.layerOrder: "authored"`. En este encargo las fuentes se suben al repositorio y se revisan en un WorldScene de pruebas; la aventura publicada no recibe una nueva región ni un despliegue.

## Validación

Ejecutar `node scripts/prepare-tiled-maps.mjs` antes de `python scripts/check-noxus-maps.py`. El comprobador valida referencias, GID, dimensiones, destinos, llegadas, accesibilidad de entradas y puntos de interés, pasos y el hash de las capas de NO01. Las copas, bases de edificios, murallas y pretiles conservan sus colisiones. Revisar también los renders y el juego: la conectividad por tiles no sustituye la inspección visual.

![Vista de las diez piezas](mapas/Noxus_diez_mapas.jpg)
