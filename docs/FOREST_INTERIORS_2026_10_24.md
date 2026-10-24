# Interiores de la nueva isla

Siete interiores conectados: refugio de Paso de las Cumbres, casa del desembarco, templo de Sendero de Raíces y cuatro edificios del Refugio Vastaya. Casas pequeñas de 12×10 tiles; herborista de 16×12; taller de 18×14; posada de 20×16; templo de 24×20.

La instancia posterior a Margarita de Yunara vive en el templo. La instancia de misión continúa en Omikayalan. Siete habitantes adicionales tienen patrullas interiores. Los exteriores conservan sus capas de tiles, tilesets y elevaciones: se añaden portales y puntos de regreso.

El catálogo `docs/diseno/jonia/interiores/islas-bosque.json` conserva plantilla, entrada, fachada y regreso de cada edificio. Los edificios de JO10 y JO11 no existen; no se añaden casas en ellos.

Validación: accesibilidad con cuerpo completo, entradas/salidas, ausencia de bucles de aparición, registro de contenidos, patrullas, desplazamiento/pausa/reanudación mediante los métodos reales del motor y compilación.

## Corrección de fachadas y puertas

Las dos filas inferiores de cada fachada se dibujan ahora en Obstacles, con una base sólida explícita. Los tejados permanecen en AbovePlayer. Cada colisión declara el punto de regreso para recuperar partidas antiguas que estuvieran dentro del edificio.

Las puertas de interacción muestran «Pulsa A para entrar» dentro del rango de entrada. El aviso se oculta al alejarse, conversar, comenzar una escena o cambiar de mapa; conserva prioridad para un NPC más cercano. Se aplica a todas las puertas de interacción, también a las anteriores de Jonia.

Xayah y Rakan usan escala de overworld 0,56 en todas sus fases, frente al 0,70 anterior: reducción del 20 %. Alturas visibles del frame frontal: Xayah 43,7 px, Rakan 42,6 px y protagonista 40,6 px. No cambia la escala de combate.
