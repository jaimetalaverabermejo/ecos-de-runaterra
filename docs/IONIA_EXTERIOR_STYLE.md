# Exteriores de Jonia: referencia de Jaime

Revisión local del 25/10/2026. Afecta exclusivamente a los seis nuevos exteriores JO16–JO21. Los mapas ya corregidos de JO01–JO13 se usan como referencia y se conservan.

## Patrones comprobados en los archivos Tiled

- **Escalera frontal completa:** conjunto de JO08, columnas 12–13, filas 15–19. Remate superior formado por el remate inferior girado 180°, tres filas centrales idénticas y remate inferior. En el tileset compartido `Jonia_decoracion`, las filas centrales utilizan los tiles locales 62/63 y los remates 58/59. Se conserva la anchura de dos tiles.
- **Paso lateral:** JO11, columna 27, filas 16–17, para una orientación, y columna 62, filas 46–47, para la contraria; también JO13, columna 55, filas 44–45. Se usa el remate rotado 90° y se orientan sus dos mitades. No se dibuja una escalera vertical larga junto a un camino que cruza de lado.
- **Barrancos:** conservar la paleta de cada zona; JO18 mantiene roca oscura. Dentro de cada material se repiten cuerpo y pie, sin alternarlos al azar. JO08, JO11, JO12 y JO13 repiten mayoritariamente la misma pieza de cuerpo y pie: GID 2300 y 2306 en sus atlas compartidos (`Bloque_marfil_32`, locales 19 y 25). Los remates superiores y las siluetas de las curvas sí cambian. La alternancia aleatoria entre todas las texturas intermedias desaparece.
- **Transiciones de roca:** las piezas de las uniones se colocan en `GroundDetails`, independientes de la colisión del barranco. Los cuatro remates comunes son los locales 3, 5, 15 y 17 del mismo atlas. Se han extraído ejemplos de JO08, JO09, JO11, JO12 y JO13 y se han contrastado los vecindarios de roca antes de colocarlos.
- **Caminos:** siempre dos tiles de ancho. Los tramos de llegada y salida coinciden con las dos columnas de la escalera; las curvas se reajustan para no ensancharse a tres tiles. Las plazas de piedra se conservan como plazas, no se estrechan como caminos. Las entradas a las casas y los pasos mantienen su conexión.
- **Puentes y embarcaderos:** hay que rotar tanto el conjunto como cada tile mediante las transformaciones de Tiled. Un puente cruza entre dos orillas; un embarcadero sale de la orilla hacia el agua. No se orientan horizontalmente por defecto.

Los GID de este documento describen estos mapas concretos. Al usar otro conjunto de tilesets, se debe resolver `firstgid + índice local`, conservando los bits de giro, no copiar un número global a ciegas.

## Cambios aplicados

- JO16: barrancos, remates, tres escaleras frontales y dos laterales, encuentros de caminos.
- JO17: barrancos, dos escaleras frontales y dos laterales; acceso horizontal a la casa del estanque con un solo tablero, sin paneles superpuestos.
- JO18: paredes y transiciones conservan la paleta oscura propia del barranco; se conservan las rocas decorativas independientes. Tres escaleras frontales y dos laterales; el puente principal sigue horizontal porque cruza el río de oeste a este.
- JO19: barrancos, tres escaleras frontales y un paso lateral.
- JO20: barrancos, tres escaleras frontales y dos laterales; embarcadero orientado desde la orilla sur hacia el estanque.
- JO21: barrancos, dos escaleras frontales y un lateral; embarcadero vertical desde el camino hasta el agua. Las dos salidas en barco son interacciones explícitas en el embarcadero, sin una transición automática que corte su acceso. Llegadas y retorno de la casa se conservan.

Las escaleras frontales tienen roca real en Obstacles bajo las tres filas centrales de Paths. Los remates superior e inferior quedan sobre suelo, sin roca debajo. La pared llega hasta ambos laterales de las tres filas centrales, sin dejar una franja vacía junto a los escalones. Los pasos laterales cruzan una pared continua, con roca también antes y después del hueco en la dirección de la pared. El motor permite cruzar la roca por el paso superpuesto. Dos escaleras consecutivas de JO20 se han alineado en la misma pareja de columnas.

Totales: 16 escaleras frontales, 10 pasos laterales y 333 remates de roca. El manifiesto `docs/diseno/jonia/patrones-exteriores.json` registra ubicaciones y patrones para futuras revisiones.

## Validación

`node scripts/check-ionia-exterior-style.mjs` comprueba el ensamblaje contra la escalera real de JO08, los giros laterales, la repetición del cuerpo/pie y los embarcaderos. `node scripts/check-ionia-orders.mjs` comprueba pasos, puertas, retornos, puntos de descanso, patrullas y progresión. `node scripts/check-world-maps.mjs` valida todos los destinos y tilesets. Se regeneran los runtime y el plano general antes de compilar.

La comparación visual se ha realizado renderizando los tiles originales de Tiled. Sigue pendiente la revisión dentro del navegador del juego. No se han publicado estos cambios en GitHub.

## Aplicación de la skill validada

Revisados JO16–JO21 con `runaterra-crear-mapas`: 16 escaleras frontales, 10 laterales, caminos, plazas, puentes y accesos de los 14 interiores. Cerradas discontinuidades cortas que quedaban entre los laterales de las escaleras y las paredes existentes; retirados tres remates obsoletos de los accesos. JO21 ya cumplía los criterios y conserva su geometría. Se conserva la roca oscura de JO18 y los mapas de referencia de Jaime.
