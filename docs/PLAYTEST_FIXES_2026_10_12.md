# Correcciones de la prueba desde el inicio

- El taller muestra exclusivamente recetas desbloqueadas. Una selección antigua bloqueada se reemplaza por una descubierta; el recetario vacío no revela objetos ni permite fabricar.
- Los menús usan los mismos controles y acciones de puntero con mando. La cruceta sigue la disposición de pantalla; los controles deshabilitados se omiten y el foco se conserva al redibujar una página.
- Ordenar Ecos, reserva, ficha, afinidades, build, puntos de habilidad, bolsa y páginas, diario, tienda/taller, configuración de mando y constructor del Showdown quedan accesibles.
- Las ventanas modales aíslan el foco. B vuelve o cancela cuando está permitido. Los combates 1v1 y por equipos incluyen información de habilidades y selección de objetivos/cambios. Los cambios forzosos siguen siendo obligatorios.
- Se conservan las mejoras de calibración para usar joystick y cruceta en el mismo mando.
- Los hallazgos de oro, objetos y recetas siempre aceptan interacción aunque el mapa omita `requiresInteract`. Cobran una sola vez y desaparecen junto a su colisión; el guardado evita que reaparezcan.
- La puerta de Veigar permanece sin sellos hasta intentar abrirla. Ese intento revela tres sellos y guarda el inicio de las pruebas. La runa, el guardián y la llama/hint quedan condicionados a ese inicio, manteniendo los requisitos de progresión de cada prueba.
- Se retiran circunferencias genéricas de impacto/explosión y marcas de suelo de salto/caída. Los impactos usan destellos y sus gráficos temporales se limpian. Los efectos propios de estados y habilidades conservan su función.

## Validación

Compilación TypeScript/Vite y controles existentes de economía, progresión, historias, mando, animaciones, mapas, interiores y movimiento de NPC.

Pruebas de navegador con mando estándar simulado: intercambio y persistencia del orden; recetario con una receta y vacío; accesibilidad por cruceta de los controles de doce pantallas; modal de afinidad; aumento de rango; equipar/desequipar; inicio de pruebas de Veigar antes/después de la puerta; bolsa de oro real y persistencia tras recargar; información 1v1; selector de objetivos y cancelación 2v2; limpieza del efecto de dardo.

La prueba usa muestras simuladas de la API Gamepad; no sustituye la comprobación del mando físico del jugador.
