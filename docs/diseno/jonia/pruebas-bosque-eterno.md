# Bosque Eterno · 0.17.0-test.1

## Recorrido jugable

- JO04: Yasuo en el extremo sudeste, tras el puente pequeño, junto al árbol. La conversación abre un errante único M30; no se cuenta como un Eco normal de la tabla.
- JO09: descarga de Syndra al acercarse desde el desembarco; ayuda a Nao antes de seguir el rastro.
- JO10: huellas junto al sendero central, conversación con Ahri en el claro norte y petición de Lillia.
- JO11: controla la energía con Syndra en el claro central. Examina la roca del paso norte, consulta a Yunara en el puente sur, busca el carillón junto al estanque central, afínalo con Yunara y vuelve a la roca. La prueba de Ivern M15 empieza con Margarita invocada.
- JO12: prepara materiales al sur del santuario y acompaña a Syndra ante Nao en el patio. Ahri acompaña; Yunara recibe al grupo tras la prueba de Ivern.
- JO13: Xayah responde a ambas historias. Con dos Ecos sanos, prueba doble M16+M16. Después se ofrecen dos entrenamientos dobles opcionales.

Todas las resonancias requieren su historia. Ninguna entrega un Eco gratis. Las apariciones mezclan Yi, Wukong, Karma y Lee Sin ya conocidos; Kennen evita tablas vacías. Tras resolver los arcos, los campeones locales suman el 75 % del peso con las cuatro resonancias anteriores disponibles.

## Balance

Sett y Jhin pasan de las tablas inactivas de la ciudad a Arrozales y Estuario, solo después de su resonancia.

Primera isla: salvajes M4–8, equipos de ruta M4–10, Jhin y Lee Sin M13. Bosque: salvajes M8–11, vinculadores M9–13; un especialista opcional M14 solo tras la prueba doble. La mayoría de vinculadores llevan 3–4 Ecos; los equipos pequeños suben ligeramente el nivel. El límite global continúa en M50. El objetivo futuro de salida de Jonia sigue siendo M18–19, sin imponer un tope regional ni rebajar equipos existentes.

La experiencia en Jonia depende del nivel del rival vencido y del tipo de encuentro. La simulación de `scripts/check-ionia-progression.mjs` termina la primera isla en M11 y el bosque en M15 en una ruta normal y M16 completando todos los entrenamientos y muchos más encuentros salvajes. El modelo da toda la experiencia al mismo Eco activo; las reservas reciben el 70 % habitual. Son objetivos de balance, no niveles forzados: entrenar indefinidamente puede superarlos.

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
