# Jonia: las Órdenes y la Runa del Espíritu

Estado: base jugable de JO16–JO21, 25 de octubre de 2026. Esta revisión sustituye el final antiguo de un duelo contra Irelia. Irelia será la aliada del jugador frente a Swain.

## Acuerdos y adaptación

Las nueve runas y sus regiones se conservan en `docs/diseno/jonia/runas.json`. Jonia custodia Espíritu. Bandle no entrega una runa durante su primer recorrido; Espacio/Bardo queda como posible cierre, sin compromiso de implementación.

Shen protege el equilibrio material/espiritual; Zed quiere disponer de fuerza para defender Jonia; Akali antepone la ayuda concreta a las personas. La runa agrava la ruptura, pero no sustituye todos sus antecedentes. El desenlace es un pacto de defensa, no una reconciliación total. Akali actúa por cuenta propia, no como subordinada actual de Shen.

Bases de caracterización revisadas en Riot:
- https://www.leagueoflegends.com/es-es/champions/shen/
- https://www.leagueoflegends.com/es-es/champions/zed/
- https://www.leagueoflegends.com/es-es/champions/akali/
- https://www.leagueoflegends.com/es-es/champions/swain/
- https://www.leagueoflegends.com/es-es/champions/ryze/

La ubicación, el dominio de cada runa, la carta, los habitantes, las tres pruebas, la custodia y esta expedición son ficción original del juego. La progresión completa combina episodios del universo en una cronología adaptada. La adaptación aprobada incorpora el kit demoníaco de Swain a esta cronología del juego; no se atribuye su poder a una alianza con Mordekaiser. La expansión hacia Noxus queda para un capítulo posterior.

## Recorrido activo

1. **Refugio Vastaya.** Después del duelo doble, Xayah cuenta los avistamientos de barcos y mediciones de los santuarios. Entrega una carta a Shen. La misma conversación está disponible para partidas que ya habían terminado el bosque. Ni la carta ni la runa se duplican al volver a hablar por las condiciones de sus NPC y opciones.
2. **Desembarco del Bosque → Poblado de las Órdenes.** Una nueva travesía con interacción explícita requiere la carta. La ruta de regreso a We’hle se conserva.
3. **Akali.** En la Casa de acuerdos, explica el bloqueo de los avisos. El jugador escucha al mensajero Bao en la hospedería y lee con la encargada el parte del patio de contratos. Solo entonces se ofrece el duelo individual M18 del patio oriental. Perder no concede confianza y permite reintentar.
4. **Shen.** En el Templo Kinkou, el jugador escucha a Luo en la casa occidental y a Mei en la oriental. La tala para alojar refugiados ha dañado un lugar espiritual; expulsar a los refugiados tampoco resuelve el daño. Shen abre una solución conjunta antes de su prueba individual M19, dentro de la Cámara del equilibrio. Kennen reaparece en el patio.
5. **Zed.** El explorador del barranco revela que Noxus busca a dos custodios posibles: Shen y Zed. Zed escucha el informe en su dojo y ofrece la prueba individual M20. El camino del norte se abre tras vencerlo. La cámara de Kayn permanece reservada, sin desbloquear su resonancia.
6. **Camino de los Errantes.** Ruta poblada, alojamiento y noticias de movimientos militares. La secundaria de Riven usará este tramo como presentación y las Cumbres como destino, sin bloquear la historia principal.
7. **Santuario del Espíritu.** Los tres comparecen en la cámara. El NPC de entrega solo existe con las tres confianzas y desaparece tras la entrega. El protagonista obtiene la runa por su independencia de las órdenes, su conducta durante la investigación y sus tres victorias. Noxus desconoce esta transferencia. Portarla no da una habilidad ofensiva ni cambia estadísticas.
8. **Islote del Reencuentro.** Una mensajera confirma el desembarco y nombra al general Swain. Los Kinkou asegurarán pasos espirituales; los seguidores de Zed compartirán rutas; Akali ayudará a los evacuados. Se inicia el diario de defensa y se habilita la barca de regreso a We’hle, desde donde se toma el atajo de Cumbres a Navori.
9. **Posada de Navori.** Irelia tiene un puesto de socorro y explica el plan de ascenso. No se lucha contra ella. La victoria regional todavía no se concede: depende del combate real con el nuevo pack.

## Exteriores e interiores

Se activan JO16 Poblado, JO17 Kinkou, JO18 Barranco, JO19 Errantes, JO20 Santuario del Espíritu y JO21 Reencuentro. Se conserva el terreno, los desniveles y las edificaciones existentes. Las puertas tienen retorno propio, los techos permanecen por encima del jugador y las bases poseen colisión. Los interiores se instancian desde los recursos jonios ya aprobados: siete en el poblado, tres en el templo y uno en cada exterior restante; catorce en total.

El manifiesto `docs/diseno/jonia/interiores/ordenes.json` relaciona cada puerta, plantilla e interior. Todos los NPC nuevos patrullan; se comprueban sus recorridos completos y el movimiento real del motor, incluida pausa y reanudación al hablar. Cada exterior dispone de un farol de Soraka y acceso local a la Reserva.

JO14 y JO15 (Fae’lor) no se abren en este recorrido. Syndra ya tiene historia en el bosque. Fae’lor, Kayn y Varus quedan para el retorno posterior. Las tablas de encuentros nuevas mantienen a Kennen como respaldo, de forma que no es necesario capturar un campeón determinado.

## Soldados y entrenamiento jonio

El pack está integrado mediante `docs/diseno/jonia/encuentros-combatientes.json`. Los combatientes humanos no son Ecos, no se capturan, no se registran en la colección y no activan resonancias. No se representarán soldados con sprites de campeones para cubrir recursos que aún falten.

Tres arquetipos jonios: monje (palma y guardia), guardián Kinkou (golpe preciso y paso evasivo) y miliciana (estocada y posición defensiva). De los 32 encuentros existentes, ocho que originalmente tenían un solo Eco pasan a ser combates directos contra humanos. Los 24 encuentros con equipos de dos, tres o cuatro Ecos conservan sus equipos, NPC y diálogos originales. Se conservan identificadores, niveles, número de oponentes y victorias de partidas anteriores. Se añaden cuatro prácticas opcionales con aceptación explícita en JO16–JO19, sin bloquear la historia. No todos los NPC con ese aspecto inician combate.

## Riven: guion de la secundaria

**Entrada si ya conoces a Yasuo:** Riven pregunta por un espadachín errante. El protagonista puede describir el encuentro de los Arrozales y lo que Yasuo dijo sobre su pérdida. Riven reconoce al hombre y admite que está vinculada a la muerte de su maestro. No presupone que el jugador haya capturado su Eco.

**Entrada si no conoces a Yasuo:** Riven habla de un viajero visto en los Arrozales, al otro lado del pequeño puente del sudeste. El diario conserva ese objetivo hasta `story:yasuo-met`; no hace falta ganar un encuentro aleatorio M30.

**Tras Yasuo:** se conversa sobre su hermano. Riven investiga testimonios de una figura enmascarada en el umbral espiritual de las Cumbres. Explica que quiere acompañar al jugador a comprobarlo, no que conozca ya toda la historia de Yone.

**Ruta:** Riven acompaña durante un tramo de Cumbres. Un combate de ruta enseña aliado controlado por IA: el jugador elige su Eco y Riven ocupa el segundo puesto. La victoria abre el encuentro narrativo de Yone. No se utiliza este combate para obligar a derrotar a Yone.

**Desenlace:** Yone conserva su identidad y su relación con Yasuo; Riven no obtiene un perdón automático por haber ayudado. La secundaria puede terminarse después del asedio. La historia principal no exige completarla ni capturar a ninguno de los hermanos.

Implementación reservada hasta disponer del personaje/recursos de Riven y del soporte de aliados IA; los dos estados de entrada y los identificadores se conservan en el contrato de integración.

## Mel, asedio y Swain: guion de continuación

**Mel, antes del ataque definitivo:** propone una custodia noxiana de la runa a cambio de retirar la expedición. Se dirige a los líderes que cree custodios y no descubre al portador. Defiende que un acuerdo puede evitar muertes, pero su propuesta sigue exigiendo entregar algo que no le pertenece. Su conversación muestra una voz política distinta de la militar. No participa en el combate final por defecto y no sustituye al comandante.

**Ascenso:** tres enfrentamientos obligatorios diferenciados: bloqueo de la entrada (lancero + ballestero), corredor de evacuación (legionario + ballestero) y acceso a cima (legionario + lancero). Un rescate lateral puede ofrecer un cuarto encuentro opcional. No exigir capturas. Un descanso seguro precede al jefe; perder no obliga a repetir toda la subida.

**Final:** un Eco del jugador + Irelia controlada por IA contra Swain + comandante. El comandante tiene ataque, escudo compartido y potenciación del siguiente ataque aliado, con ventanas de vulnerabilidad. Swain utiliza el kit de control, drenaje y resistencia aprobado para esta cronología adaptada. La derrota de la expedición prepara su retorno posterior.

**Epílogo:** Irelia conserva el protagonismo de la defensa. Se mantiene el pacto entre las órdenes y el secreto del portador. Los documentos recuperados revelan que la búsqueda comprende otras regiones. El protagonista decide viajar a Noxus para entender y frenar ese plan. Solo la victoria real activa `story:ionia-complete`, la resonancia de Irelia y la escena de salida. No se entrega otra runa en este epílogo.

## Qué queda pendiente de integrar

Las tres patrullas del ascenso ya tienen combate doble, colisiones exclusivas de la invasión, apertura por victoria y progreso del diario. Swain, el comandante e Irelia aparecen en la cima tras despejarlas. Swain dispone de personaje narrativo, arte y catálogo completo de Eco; Mel y Riven también tienen estadísticas y habilidades. El duelo final, las apariciones salvajes y las resonancias siguen reservados a la continuación de la historia. Su conversación no concede victoria regional. El combate final y el acompañamiento de Riven siguen pendientes del soporte del segundo combatiente aliado IA y de su integración narrativa. Los recursos de Mel y Riven ya están incorporados al catálogo. No hay desbloqueo de Noxus todavía. El diario de defensa y el puesto de Irelia ya están preparados para esa integración.

Pruebas: `npm run build`, `npm run check:combatants`, `node scripts/check-ionia-orders.mjs`. Los puntos de prueba «Las Órdenes», «Custodia de la primera runa» y «El aviso del Plácidum» permiten revisar las fases sin alterar una aventura existente.
