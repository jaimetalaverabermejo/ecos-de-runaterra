# Combatientes humanos y Swain

Integración del 25/10/2026. Se conservan los PNG originales entregados: los siete frentes y las vistas de combate de Swain son de 192×192; los overworld son 288×384, con doce frames de 96×96. No se amplían ni se regeneran imágenes. El retrato aportado de Swain es 192×192 y se adapta visualmente al panel existente.

## Catálogo independiente

Los datos están en `src/contenido/mundo/combatientes/catalogo.json`. `DataRegistry.battleDefinition()` resuelve tanto Ecos como combatientes; `echo()` y los catálogos de colección siguen admitiendo exclusivamente Ecos. Los combatientes no tienen apariciones salvajes, captura, ranuras de colección ni resonancias. Las habilidades se cargan en el registro de combate compartido y tienen perfiles de animación explícitos.

| Combatiente | Habilidad de ataque | Segunda habilidad | Tercera |
| --- | --- | --- | --- |
| Monje jonio | Golpe de palma | Guardia serena: escudo propio | — |
| Guardián Kinkou | Golpe preciso | Paso evasivo: defensa temporal | — |
| Miliciana de Navori | Estocada | Posición defensiva | — |
| Lancero noxiano | Estocada de lanza | Barrido de asta: daño y reducción de velocidad | — |
| Ballestero noxiano | Disparo de virote | Apuntar: aumento temporal de ataque | — |
| Escudero noxiano | Golpe de escudo | Muro de escudos: escudo propio | — |
| Comandante noxiano | Tajo de mando | Cobertura de la cohorte: escudos aliados | Orden de avance: ataque aliado temporal |

La segunda habilidad y la orden del comandante tienen tres turnos de enfriamiento. El ataque principal queda disponible sin enfriamiento. El comandante ya dispone de datos, frontal y overworld; su participación como jefe queda reservada al combate final con Swain. Los efectos son del juego, no habilidades atribuidas al canon de League of Legends.

## Encuentros activos

- De los 32 encuentros existentes, solo los ocho que tenían un único Eco pasan a ser combatientes jonios que luchan personalmente. Los otros 24 conservan sus equipos originales de dos, tres o cuatro Ecos, sus posibles sustituciones por campeones ya vinculados, sus NPC y sus diálogos. Se mantienen IDs, niveles, recompensas y victorias guardadas. Los ocho combatientes usan los overworld jonios correspondientes.
- Cuatro prácticas individuales nuevas en JO16–JO19 requieren aceptar el entrenamiento. Rechazarlo no inicia combate. Tras vencer, el instructor permanece y sigue patrullando.
- Tres enfrentamientos dobles contra soldados noxianos en el ascenso de Navori: entrada (lancero/ballestero), evacuación (escudero/ballestero), puente (escudero/lancero). Cada victoria abre su bloqueo y registra el objetivo del diario. Los bloqueos solo existen después del informe a Irelia, sin afectar a la visita anterior de Karma.
- Tras la tercera victoria, Swain, el comandante e Irelia aparecen en la cima. Irelia ofrece curación. El jugador puede hablar con Swain sin revelar que porta la runa.

## Pendiente deliberado

Swain tiene `personaje.json`, overworld, retrato y ambos sprites de combate, con la carpeta normalizada a `combate/`. No tiene `eco.json`, estadísticas, ataques ni apariciones salvajes. Su conversación no inicia duelo ni otorga `story:ionia-complete` o resonancias. El catálogo de ataques de Swain, el aliado IA de Irelia, el duelo final y el epílogo se integrarán en la siguiente fase. Riven y Mel conservan su guion pendiente de recursos/integración.

## Comprobaciones

`npm run check:combatants` comprueba daño, kits de dos/tres habilidades, enfriamientos, apoyo del comandante, exclusión de captura/colección, aceptación o rechazo, tres bloqueos físicos y progreso/reload sin victoria ficticia. Comprueba también las rutas completas y el movimiento real, pausa y reanudación de los nuevos NPC. El control de entrenadores utiliza ahora el motor de combate real.

Se midieron las siluetas de los overworld: noxianos y Swain ocupan aproximadamente 43 px a escala 0,54, frente a unos 42 px del protagonista en esta comparación de atlas. La revisión de imágenes y las pruebas no sustituyen la prueba visual dentro del navegador del juego.
