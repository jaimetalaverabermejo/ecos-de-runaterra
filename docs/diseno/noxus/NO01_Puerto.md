# NO01 — Puerto oriental

Primera propuesta para revisión en Tiled. Basada en `NO01_Puerto.tmj` de Jaime, commit `d57374d5e96078d36f896b6a428dac4aca984522`, y en las láminas regional y «Noxus · Puerto y Basilich» adjuntas al encargo del 1 de noviembre de 2026.

Fuente: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/NO01_Puerto.tmj`. Se conserva su ubicación provisional y todas sus referencias relativas. Cuadrícula de 32 px; 74 × 64 tiles.

## Composición

- Recinto del puerto, edificios, murallas, estatuas, muelles y pavimento conservados celda por celda. Todas las capas de tiles entre columnas 31–73 y filas 5–34 permanecen idénticas. Coordenadas desde cero.
- Costa, agua, puente de madera y desnivel original conservados. No se introducen barrancos altos.
- Exterior construido con los diez árboles de muestra: verdes oscuros, amarillos y rojos, agrupados en bosquetes. Rocas y decoración del archivo original.
- Tierra tomada de la muestra de Jaime: bases 80/81/115/116 de `EdR_Ground`, con bordes y esquinas 199–273. Los caminos se componen con `GroundDetails` debajo de `Paths`; los claros secos no convierten la vegetación en suelo transitable.
- Caminos de dos tiles: salida norte hacia Basilich, ramal occidental cerrado, circuito de regreso del salto y paseo sur cruzando el puente existente. Los claros y el puerto conservan espacios amplios.
- El ramal occidental tiene un derrumbe en `Vallas`, que no queda anulado por `Paths`. La salida principal está al norte. El regreso desde el salto bajo recorre el camino occidental.

`DesignNotes` contiene las reservas de conexión y se entrega oculta. No hay portales a destinos aún inexistentes, NPC ni nuevas conexiones activas en el juego. Este cambio prepara el archivo Tiled; no publica Noxus ni altera la aventura de Jonia.

Al integrar NO01 en el catálogo jugable, usar `tiled.layerOrder: "authored"` para conservar el orden del archivo. Los runtime se generan desde las fuentes; no se versionan.

## Índice de las diez piezas de la lámina regional

La lámina general es la referencia para esta numeración. Las láminas de detalle pueden agrupar dos piezas; no equivalen a un único archivo Tiled.

| ID | Mapa | Estado en este encargo |
| --- | --- | --- |
| NO01 | Puerto oriental | Primera propuesta Tiled |
| NO02 | Cruce de caravanas | Pendiente |
| NO03 | Basilich | Pendiente |
| NO04 | Suministros militares | Pendiente |
| NO05 | Capital exterior | Pendiente |
| NO06 | Bastión interior | Pendiente |
| NO07 | Camino y Memorial de Sion | Pendiente |
| NO08 | Frontera occidental | Pendiente |
| NO09 | Delverhold | Pendiente |
| NO10 | Paso de Ironspike | Pendiente |

## Comprobaciones

Se generó el runtime de NO01 con el conversor vigente antes de verificar la navegación. Se comprobaron GID, referencias de tilesets, dimensiones de capas, conservación del puerto y la costa, anchura de los 348 tiles de camino de tierra y accesibilidad de diez puntos del exterior.

Revisión adicional en el `WorldScene` real, con registro temporal exclusivo del navegador de pruebas: desplazamiento por salida norte y camino principal, cruce del puente existente, salto de bajada y bloqueo del atajo occidental. Sin errores JavaScript. Este registro de prueba no forma parte del código entregado.

Las imágenes adjuntas son renders de los tiles reales. `NO01_comparacion.png` muestra el original y la propuesta; `NO01_Puerto_preview.png` muestra el mapa completo.
