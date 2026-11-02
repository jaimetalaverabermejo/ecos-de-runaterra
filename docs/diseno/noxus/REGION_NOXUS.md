# Noxus — diez mapas Tiled

Segunda versión regional, revisada para distinguir calles y parcelas, suavizar las murallas y convertir el Bastión en un interior real. Construida con los recursos de NO01 y las láminas de referencia de Jaime. Abrir `public/assets/world/regions/Noxus/Noxus.world` en Tiled para ver las diez piezas, o editar cada `.tmj` por separado. Todos usan cuadrícula de 32 px y el orden de capas del archivo.

NO01 se ha trasladado desde su carpeta provisional de Jonia. Sus capas de tiles se conservan idénticas a la revisión manual `806156c`; solo se han añadido reservas de llegada y conexiones con Basilich y el atajo vigilado. Las rutas relativas de los tilesets mantienen su profundidad.

| Mapa | Tamaño (tiles) | Composición |
| --- | --- | --- |
| [NO01_Puerto](mapas/NO01_Puerto.jpg) | 74 × 64 | Puerto manual de Jaime conservado. |
| [NO02_Cruce_Caravanas](mapas/NO02_Cruce_Caravanas.jpg) | 88 × 68 | Cruce rural con plaza de tierra, posada, mercado, corral y puente. |
| [NO03_Basilich](mapas/NO03_Basilich.jpg) | 88 × 78 | Muralla escalonada, costa más rocosa, calles de adoquín, plaza y gobierno elevado. |
| [NO04_Suministros](mapas/NO04_Suministros.jpg) | 88 × 76 | Muralla escalonada, calles y patios diferenciados, almacenes y carga militar. |
| [NO05_Capital_Exterior](mapas/NO05_Capital_Exterior.jpg) | 112 × 100 | Doble línea defensiva, murallas con retranqueos, calles, parcelas, plazas y Bastión centrado. |
| [NO06_Bastion_Interior](mapas/NO06_Bastion_Interior.jpg) | 112 × 96 | Interior de 112 × 96 tiles: vestíbulo, galería, consejo, sala de guerra, biblioteca, archivo, armería y aposentos. |
| [NO07_Memorial_Sion](mapas/NO07_Memorial_Sion.jpg) | 100 × 76 | Islote más redondo, senderos de tierra, hierba, templo y pedestal de Sion. |
| [NO08_Frontera_Occidental](mapas/NO08_Frontera_Occidental.jpg) | 132 × 52 | Frontera de 132 × 52 tiles, con muralla quebrada y avance horizontal por el valle. |
| [NO09_Delverhold](mapas/NO09_Delverhold.jpg) | 88 × 76 | Guarnición con muralla escalonada, calles, intendencia y más dependencias. |
| [NO10_Ironspike](mapas/NO10_Ironspike.jpg) | 152 × 54 | Paso de 152 × 54 tiles: recorrido horizontal, dos terrazas, tres cruces del río, cantera y bocamina. |

## Uso y alcance

Las fuentes incluyen spawns y portales bidireccionales entre las diez piezas. El atajo puerto–Caravanas queda condicionado por `noxus:atajo-puerto-abierto`. NO06 representa ahora el interior real del edificio del Bastión, con dependencias conectadas y retorno a la capital; la segunda muralla está en NO05. Los demás accesos de edificios se reservan en DesignNotes para una fase de interiores. No se han añadido NPC sin movimiento ni cambiado las historias, encuentros, regiones desbloqueadas o partidas guardadas.

Los runtime se generan con `node scripts/prepare-tiled-maps.mjs`; no se versionan. Para una futura integración jugable, registrar los IDs del manifiesto en el catálogo de mapas y usar `tiled.layerOrder: "authored"`. En este encargo las fuentes se suben al repositorio y se revisan en un WorldScene de pruebas; la aventura publicada no recibe una nueva región ni un despliegue.

## Validación

Esta revisión supera la comprobación de navegación de los diez mapas y la orientación de las esquinas interiores de los caminos. En WorldScene se han renderizado las diez piezas y probado dos puentes, la escalera de Ironspike y los viajes de ida y vuelta Puerto–Basilich y Capital–Bastión interior, sin errores de JavaScript. NO01 conserva su hash de tiles validado.

Ejecutar `node scripts/prepare-tiled-maps.mjs` antes de `python scripts/check-noxus-maps.py`. El comprobador valida referencias, GID, dimensiones, destinos, llegadas, accesibilidad de entradas y puntos de interés, pasos y el hash de las capas de NO01. Las copas, bases de edificios, murallas y pretiles conservan sus colisiones. Revisar también los renders y el juego: la conectividad por tiles no sustituye la inspección visual.

![Vista de las diez piezas](mapas/Noxus_diez_mapas.jpg)
