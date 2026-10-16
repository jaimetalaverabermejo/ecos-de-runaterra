# Bosque Eterno · 0.17.0-test.1

## Recorrido jugable

- JO04: Yasuo en el extremo sudeste, tras el puente pequeño, junto al árbol. La conversación abre un errante único M30; no se cuenta como un Eco normal de la tabla.
- JO09: descarga de Syndra al acercarse desde el desembarco; ayuda a Nao antes de seguir el rastro.
- JO10: bosque interior plano. Sigue las huellas de llegada y busca a Ahri en el sauce ancestral del noroeste, frente al lago. La escena de control con Syndra tiene lugar entre sus raíces. Lillia conserva otro claro al nordeste.
- JO11: examina la roca del paso norte, consulta a Yunara en el puente sur, busca el carillón junto al estanque central, afínalo con Yunara y vuelve a la roca. La prueba de Ivern M15 empieza con Margarita invocada.
- JO12: prepara materiales al sur del santuario y acompaña a Syndra ante Nao en el patio. Ahri acompaña; Yunara recibe al grupo tras la prueba de Ivern.
- JO13: Xayah responde a ambas historias. Con dos Ecos sanos, prueba doble M16+M16. Después se ofrecen dos entrenamientos dobles opcionales.

Todas las resonancias requieren su historia. Ninguna entrega un Eco gratis. Las apariciones mezclan Yi, Wukong, Karma y Lee Sin ya conocidos; Kennen evita tablas vacías. Tras resolver los arcos, los campeones locales suman el 75 % del peso con las cuatro resonancias anteriores disponibles.

## Balance

Sett y Jhin pasan de las tablas inactivas de la ciudad a Arrozales y Estuario, solo después de su resonancia.

Transición revisada: Montañas de los Portales con salvajes M5, equipo de ruta M5+M5 y Kennen M7 (conserva su R como técnica de jefe; los Ecos capturados la desbloquean al M8). Koeshin y Acantilados: salvajes M5–6, vinculadores M6–7 y M6–8 respectivamente, reservando el M8 para un especialista individual.

Primera isla: salvajes M5–8, equipos de ruta M6–10, Jhin y Lee Sin M13. Bosque: salvajes M8–11, vinculadores M9–13; un especialista opcional M14 solo tras la prueba doble. La mayoría de vinculadores llevan 3–4 Ecos; los equipos pequeños suben ligeramente el nivel. El límite global continúa en M50. El objetivo futuro de salida de Jonia sigue siendo M18–19, sin imponer un tope regional ni rebajar equipos existentes.

El coeficiente de experiencia de vinculadores se afina de 0,105 a 0,100 para compensar el aumento de nivel inicial y conservar la progresión posterior. La experiencia en Jonia depende del nivel del rival vencido y del tipo de encuentro. La simulación de `scripts/check-ionia-progression.mjs` termina la primera isla en M11 y el bosque en M15 en una ruta normal y M16 completando todos los entrenamientos y muchos más encuentros salvajes. El modelo da toda la experiencia al mismo Eco activo; las reservas reciben el 70 % habitual. Son objetivos de balance, no niveles forzados: entrenar indefinidamente puede superarlos.

## Errante

Yasuo tiene una probabilidad independiente exacta del 1 % por encuentro elegible en arrozales, estuario, cumbres y las cinco rutas del bosque. Intenta huir en su turno; la velocidad, prioridad y estados de control normales permiten actuar antes o retenerlo. Cuando queda retenido, espera en vez de atacar a un equipo inferior.

El mismo identificador y la vida persisten al huir cualquiera de los bandos, caer el equipo o recargar el guardado. No persisten estados ni contadores de combate. Solo un KO permite recuperarlo al descansar en un santuario; un Yasuo dañado que sigue en pie no recupera su vida al curar al equipo. Capturarlo retira el errante definitivamente. Vencerlo no da experiencia para evitar explotar la recuperación del mismo ente.

Caso comprobado: jugador M12, Yasuo M30 casi sin vida, multiplicador de estado 1,5: 0,249 % con Vinculador 1 y 1,991 % con Vinculador 3. No se entrega ninguna mejora del artefacto en estas historias.

## Narrativa y canon

Las escenas, Nao, el carillón y la colaboración entre personajes son ficción original del juego. La joven Syndra es contemporánea del protagonista en esta adaptación; Ahri acompaña la regulación emocional, no inventa ni concede las esferas. El relato de Yasuo conserva su culpa por la muerte de su hermano; el flashback completo queda para Yone. Lillia y Yunara no tienen jefes independientes. Margarita ya existe: se la despierta.

Referencias oficiales del trasfondo contrastado: [Yasuo](https://www.leagueoflegends.com/es-es/champions/yasuo/), [Ahri](https://www.leagueoflegends.com/es-es/champions/ahri/), [Syndra](https://www.leagueoflegends.com/es-es/champions/syndra/), [Ivern](https://www.leagueoflegends.com/es-es/champions/ivern/), [Lillia](https://www.leagueoflegends.com/es-es/champions/lillia/), [Xayah](https://www.leagueoflegends.com/es-es/champions/xayah/) y [Rakan](https://www.leagueoflegends.com/es-es/champions/rakan/).

## Verificación

- Compilación y controles completos de geometría, actores, historias, interiores, vendedores y entrenadores.
- Historias completas con serialización entre pasos, reintentos y recompensas únicas; victoria doble ejecutada mediante el método real de la escena.
- Métodos reales de movimiento: desplazamiento, pausa y reanudación de las 50 apariciones de NPC del nuevo contenido.
- Método real de salida de combate: fuga de Yasuo, huida del jugador y derrota conservan la vida del errante.
- Invocación de Margarita mediante el motor de producción: vida, intercepción y ataque al acabar turno.
- Navegador con Phaser: escena inicial, mapas y personajes, escala humana frente al protagonista y combate con Margarita visible; sin errores de ejecución.
- Compatibilidad: posiciones antiguas al norte de la nueva roca se recuperan en el lado sur, sin tocar maestría, dinero ni misiones.

JO14 y las siguientes zonas continúan sin desplegarse. Esta actualización termina en el Refugio Vastaya.

## Jardín interior · 0.17.2-test.1

Revisada la subida del autor `5023c76` (JO04, JO10, JO12 y JO13). Registrados Agua_32 y Jonia_Arboles_Tiled_32 en los mapas que los utilizan; la validación comprueba también atlas pintados pero ausentes de la configuración.

JO10 conserva dimensiones, portales, puntos de llegada, ambos lagos y todas las piezas del sauce ancestral colocadas por el autor. Se eliminan acantilados, escaleras, vallas y guías de elevación. Arboledas irregulares delimitan senderos de dos tiles, un circuito hacia el sauce, otro hacia Lillia y un desvío de entrenamiento al sudoeste. Las huellas de Syndra quedan junto al sendero de llegada.

Ahri y Syndra se encuentran ante las raíces, al norte del lago del noroeste. El plano general de su escena utiliza escala 1 para mostrar el sauce; las demás escenas conservan la escala 2. Ahri tiene fases excluyentes antes/después de su conversación para evitar dos copias en el mismo lugar. Ivern y Margarita continúan en JO11. Las misiones mantienen sus identificadores y progresos.

Comprobado en Phaser: atlas visible; Ahri camina, pausa al conversar y reanuda; hablar con Syndra inicia la escena del sauce; el hueco entre raíces es accesible; ambas conexiones de JO10 funcionan en ida y vuelta. Sin errores ni advertencias de ejecución. La recuperación de una posición antigua dentro de un tronco conserva oro y maestría; los guardados ya migrados solo se recolocan si una colisión los bloquea.
