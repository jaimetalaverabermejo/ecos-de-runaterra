# Omikayalan: distribución tras la edición del 24 de octubre

Base visual: commit 9c84c225c5a52b2930d7ffe44326b5b9522eb7c6 del autor. Se conservan todas las capas de tiles, sus posiciones, visibilidad, tilesets y la guía de elevaciones.

| Personaje | Zona | Posición inicial (px) | Recorrido |
| --- | --- | --- | --- |
| Lillia | Terraza suroeste, antes del bloqueo | 496, 1744 | Vertical hasta 496, 1776 |
| Yunara | Claro del noreste de la terraza sureste, antes del bloqueo | 2352, 1328 | Horizontal hasta 2376, 1328 |
| Lao | Terraza noroeste, opcional tras abrir el paso | 528, 464 | Horizontal hasta 552, 464 |
| Sumi | Camino junto al farol | 1808, 1520 | Se conserva |
| Ivern y Margarita | Paso de la escalera norte | Se conservan | Se conservan su escena, prueba y bloqueo |

El carillón permanece en la posición del autor, 1796, 1796. Los diálogos y el diario indican las terrazas y escaleras actuales. Ningún objetivo previo queda detrás del bloqueo que necesita resolver.

La interacción del farol pasa de 1838, 1476 a 1838, 1508 para permitir interacción y reaparición fuera de la base sólida. La zona de reserva se alinea en 1808, 1496 (96 × 80). No se desplaza el dibujo ni su colisión.

Validación: acceso con paso cerrado y abierto, patrullas completas, desplazamiento/pausa/reanudación con el método real de WorldScene, historia y combate de Ivern, curación y guardados. La comprobación de geometría compara las capas de tiles con el archivo original subido.
