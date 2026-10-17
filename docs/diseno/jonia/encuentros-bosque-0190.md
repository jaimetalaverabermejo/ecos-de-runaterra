# Encuentros del bosque — 0.19.0

## Distribución

| Encuentro | Lugar | Intención |
| --- | --- | --- |
| Xayah y Rakan | Islote del lago nuevo del suroeste de JO13, unidos al camino de llegada por una pasarela de dos tiles | Descanso íntimo juntos, hombros cercanos y orientados uno al otro; excepción explícita de Jaime a la regla de patrullas |
| Lillia | Claro del sector sur de Omikayalan (1040,1984) | Primera lectura del sueño; orienta hacia Yunara |
| Yunara | Orilla noreste del estanque occidental, bajo el muro de roca (912,1072) | Reconoce el latido y afina el instrumento |
| Carillón | Orilla noreste del lago del sureste (1808,1808) | Búsqueda separada; señal visible solo tras recibir el encargo |
| Ahri, Syndra y Nao | Claro del litoral de JO09; ramal oeste del camino antes de la primera escalera | Cierre tranquilo, separado del muelle y de sus viajeros |

Las tres etapas de la búsqueda quedan separadas por más de 700 px entre sí. Las rutas se comprueban con el paso de Margarita cerrado: ningún requisito queda al otro lado de su propio bloqueo.

## Continuidad de las escenas

- Ivern ya existe cerca de la escalera antes de tocar el carillón. Al escucharlo, ese mismo NPC se acerca andando hasta el lado izquierdo del paso, visible sobre el panel de diálogo.
- Margarita utiliza un único sprite de overworld desde el principio: quieta y de espaldas, centrada 16 px más a la derecha y con 64 px visibles de ancho. Al llamarla Ivern, se gira mediante sus frames direccionales y baja por la escalera para apartarse. No se superponen arte de combate y overworld.
- La última línea conduce al duelo con Ivern. La primera conversación elegible con la pareja del refugio también conduce directamente al combate doble. Se conservan las comprobaciones de Ecos disponibles y los reintentos tras descansar.
- Ahri ofrece tela y cintas a Syndra después de escuchar a Nao. Syndra elige cómo presentarse y sostiene las piezas con la misma concentración practicada con las esferas. La transición revela el atuendo de campeona de abajo arriba, sobre el mismo NPC y sin apagar su silueta. El traje no concede ni limita su poder: representa una elección propia.
- Esta relación y el atuendo se escriben como ficción original del juego, no como biografía canónica.

## Persistencia y correcciones

- `story:syndra-attire` conserva el aspecto de campeona al recargar. Las partidas que ya habían terminado la misión reciben una conversación opcional de atuendo sin repetir la misión ni sus recompensas.
- Se cancela el antiguo acompañamiento de Lillia; ya no termina amontonada junto a Yunara.
- Las interacciones resueltas dejan de generar un memorial genérico. Este era el origen de la placa gris y las letras «REN» tras recoger objetos.
- Las posiciones antiguas que coincidan con el nuevo lago de JO13 se recuperan sobre terreno transitable, conservando equipo, oro y misiones.

## Verificación

Compilación y comprobaciones de historias/geometría. Pruebas en Phaser con WebGL: conversación inicial de la pareja hasta DoubleBattleScene, carillón hasta BattleScene con desplazamiento real de Ivern y una sola Margarita, reparación sin residuo, cierre de Syndra y cambio de atuendo, variante de partida completada sin premio duplicado y recuperación de una posición dentro del nuevo lago.
