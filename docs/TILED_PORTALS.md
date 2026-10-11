# Portales y puntos de llegada de Tiled

Los objetos de `Spawns` del TMJ son la fuente principal para `targetSpawn`. Las coordenadas de `map.json` quedan como respaldo cuando el objeto no existe. Un spawn rectangular coloca al jugador en su centro; un objeto punto utiliza su posición exacta.

Los portales y spawns respetan su rotación alrededor del origen de Tiled. Un rectángulo girado 90° se extiende hacia la izquierda de su origen y cambia ancho por alto. La región de transición usa ese rectángulo, tanto al pisarlo como al interactuar.

Corrección del claro, 11 de octubre de 2026:

- El portal estaba girado 90°, pero el juego utilizaba el rectángulo sin girar. El punto de llegada también quedaba sustituido por el respaldo antiguo de `map.json`.
- La subida `f69dfcd` eliminó `clearing/overworld.png` aunque `clearing.tmj` y el catálogo del mapa seguían referenciándolo. Se recupera la imagen desde la última versión válida, sin modificar las capas que el usuario actualizó. Una imagen ausente hace fallar la compilación y deja la versión publicada anterior.
- Prueba en navegador con controles: Ciudad de Bandle → claro, llegada (608, 65), aparición y diálogo del primer Eco de Teemo, claro → ciudad, llegada (1280, 1872). La prueba parte de una partida nueva con los requisitos de la visita inicial completados. El progreso del primer Eco se conserva. Sin errores JavaScript.
- Comprobación de edición: desplazar el objeto spawn en el mapa cargado cambia la llegada resuelta, aunque `map.json` conserve otras coordenadas.
- `check-tiled-geometry.mjs` comprueba rotaciones positivas y negativas, objetos punto y anclajes de objetos tile; se ejecuta en cada compilación. Build y verificaciones del proyecto pasan.

Al subir un TMJ, conservar las imágenes y TSX que referencia. El despliegue regenera `.runtime.json` a partir del TMJ, y el cargador versiona sus URLs con el commit publicado. Confirmar el éxito de GitHub Pages antes de esperar ver los cambios en el juego.
