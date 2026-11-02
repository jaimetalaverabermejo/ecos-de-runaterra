# Noxus: bosques, relieve y claros de hierba

Revisión sobre las fuentes manuales de Jaime `0189c57`. Se interviene solo en NO02, el exterior de NO04, el continente de NO07 y NO08. Puerto, Basilich, capital, interior del Bastión, Delverhold e Ironspike conservan íntegramente sus archivos Tiled.

| Mapa | Claros nuevos | Criterio |
| --- | ---: | --- |
| Puerto | 0 | Sin apariciones |
| Caravanas | 5 | Loma, sotos y claros conectados al cruce; bosque delimita las rutas |
| Basilich | 0 | Sin apariciones |
| Suministros | 2 | Noroeste y ribera próxima al puente; nada dentro del recinto |
| Capital | Manuales | Conservar la hierba, jardines y agua colocados por Jaime |
| Interior del Bastión | 0 | Sin intervención |
| Memorial | 3 | Solo en el continente; la isla no recibe hierba ni árboles nuevos |
| Frontera | 5 | Claros junto a los caminos, terraza y lindes de descenso |
| Delverhold | Manuales | Conservar la revisión de Jaime |
| Ironspike | 3 | Revisión posterior autorizada con nuevas referencias: ribera, cantera y linde oriental del desfiladero |

## Construcción y recorridos

- Usar la capa `TallGrass` y resolver el tileset `EdR_tall_grass` de cada mapa. Mezclar las variantes verdes y alguna amarilla; no pintarla sobre caminos, agua, edificios, roca o vallas. Mantener todos los tiles de hierba alcanzables desde la red de pasos.
- Diseñar claros dentro del bosque y darles una entrada concreta. Aumentar los árboles en los espacios ajenos a caminos y actividades, conservando corrales, cultivos, accesos a edificios, puentes, destinos y huecos de llegada.
- Mantener hierba normal bajo los árboles y mezclar los colores individualmente. Los nuevos grupos que cierran el paso tienen colisión bajo la masa de la copa, además del tronco. No dejar pasos accidentales entre cierres de bosque ni bloquear los claros de hierba.
- Usar frentes de roca bajos y con silueta escalonada, aprendidos del Basilich manual. Conservar cuerpo, pie, esquinas y transiciones completas; rellenar por debajo los encuentros interiores para evitar grietas verdes. Las escaleras frontales mantienen dos columnas, tres filas centrales iguales y remates sin roca.
- Separar un acantilado de tres filas de una linde de salto de un tile: el salto del motor no atraviesa un acantilado completo. En Frontera hay dos lindes hacia abajo y un camino bidireccional lateral para volver a la cota superior.
- En el Memorial, la desembocadura se prolonga hasta el mar. Verificar continuidad del agua real, sin un cierre de roca, conservando el puente y el paso hacia la península sur. Densificar el bosque meridional para cerrar los límites sin quitar los puntos de interés.

## Agua y sombras

Usar el Suministros manual `0189c57` como referencia principal. Sus esquinas combinan remates y tramos rectos diferentes: no repetir el remate superior en todo el borde ni sustituir una esquina por agua vacía. Resolver los vecinos de la orilla y conservar las reflexiones horizontales del tile.

El acantilado puede proyectarse sobre una celda cuyo Ground ya es agua. No confundir esa roca con agua libre ni borrarla al corregir la sombra. La orilla sólida incluye las caras y pies de roca de Obstacles. Corregir la sombra del agua desde ese contorno físico. En esta revisión se ajustan las aguas de Caravanas, Memorial y Frontera; se conserva la referencia de Suministros.

## Integración de apariciones

El WorldScene detecta la capa `TallGrass`; las fuentes y claros quedan preparados. Esta entrega no activa Noxus en la aventura ni inventa poblaciones de campeones. Al integrar la región, configurar una tabla de apariciones de Noxus explícita y desactivar encuentros en Puerto y Basilich. No dejar que el valor por defecto del motor use una tabla de Bandle por omisión.

## Validación

Regenerar runtime antes de comprobar la geometría. Ejecutar `scripts/check-noxus-maps.py` y `scripts/check-noxus-nature.py`. El segundo verifica hashes de los archivos protegidos, el recinto de Suministros, la isla del Memorial, los claros alcanzables, ausencia de hierba sobre pasos/agua y la desembocadura. Se comprueban también aproximaciones y llegadas de los saltos.

En WorldScene se recorren la hierba de los cuatro mapas, las dos escaleras nuevas, un salto hacia abajo, el bloqueo en sentido contrario y la ruta lateral de regreso. Se repasan los puentes y retornos existentes.

Los comprobadores históricos de urbanismo no equivalen a una aprobación de todos los retoques manuales nuevos: en la capital `0189c57` se observa una esquina de calle en (103, 71) y el antiguo circuito rectangular del Bastión ya no representa los estanques y paseos actuales. Quedan fuera de este encargo y se conservan sin modificar. El índice externo sí actualiza las posiciones de tres entradas movidas para no probar objetivos dentro de sus fachadas antiguas.

## Referencia posterior de Ironspike

Con las tres referencias nuevas se autoriza reconstruir NO10 como garganta de 152 × 64 tiles. La protección anterior de Ironspike queda sustituida por el recorrido validado de tres puentes y ocho escaleras. `check-noxus-ironspike.py` protege íntegramente los nueve mapas restantes respecto a `3fd1d35`. Se añaden tres claros de hierba pequeños en la ribera, cantera y salida oriental; no se activa la tabla de apariciones.
