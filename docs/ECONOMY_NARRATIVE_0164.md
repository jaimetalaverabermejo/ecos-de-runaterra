# Economía y continuidad · 0.16.4-test.1

## Tienda y precios

El mismo mercader exterior de Bandle y Lhradi vende únicamente los nueve componentes con sprite existente. Las dos tiendas comparten catálogo y precio, con paginación de seis tarjetas. Los precios son una referencia estable inspirada en LoL, no una sincronización automática de sus parches. Los atributos se adaptan al combate por turnos de este juego.

| Componente | Oro |
|---|---:|
| Tomo amplificador | 400 |
| Cristal de zafiro | 300 |
| Espada larga | 350 |
| Daga | 250 |
| Cristal de rubí | 400 |
| Armadura de tela | 300 |
| Manto anulamagia | 400 |
| Capa de agilidad | 600 |
| Mota brillante | 250 |

Armadura, manto y mota tenían sprites cargados pero faltaban sus datos. Se incorporan sin arte nuevo. Cota del guardián y Fago usan composiciones de los iconos de sus componentes y marco épico; un PNG dedicado podrá sustituirlas sin cambiar sus IDs. La Vara explosiva sale de la tienda y se fabrica con una fórmula adaptada al juego.

## Objetos intermedios

| Objeto | Receta | Ensamblaje | Total desde tienda | Cómo se obtiene el plano |
|---|---|---:|---:|---|
| Capítulo perdido | 2 Tomos + Zafiro | 100 | 1200 | Corki, en Bandle |
| Fervor | Daga + Capa de agilidad | 350 | 1200 | Portal de Kennen / llegada a Jonia |
| Cota del guardián | 2 Armaduras de tela | 400 | 1000 | Pergamino junto al sendero de JO02 Acantilados Blancos |
| Fago | Espada larga + Rubí | 350 | 1100 | Resolución de Sett |
| Vara explosiva | 2 Tomos | 50 | 850 | Memorial de Karma |

Al empezar Jonia se tiene una segunda receta, y al resolver Sett hay cuatro alternativas entre magia, físico/velocidad, tanque y luchador. Karma añade una quinta. Las recetas están paginadas y las conocidas se muestran primero. Una fabricación fallida no consume componentes ni oro. Las ranuras siguen siendo 1, 2 desde maestría 10 y 3 desde 20.

Eco de Luden queda reservado como primer legendario a enseñar por Ahri o Syndra cuando se implemente ese tramo; no se desbloquea ahora. Filoveloz de Navori permanece igualmente cerrado. Wukong todavía no tiene una misión desplegada que entregue un plano: la obtención actual está distribuida entre Kennen, exploración, Sett y Karma.

## Economía temprana y partidas anteriores

- Corki aporta una subvención de 600 oro una sola vez al empezar su prueba, además del zafiro que ya entregaba. Los dos tomos y el ensamblaje cuestan 900; el resto procede de combates, rescate del mercader y exploración.
- Seis bolsas nuevas en Bandle: 1600 oro entre aldea, bosque, valle y montañas. Siete bolsas en JO01–JO07: 2600 oro. Total de exploración añadido: 4200, repartido en 13 recogidas únicas, sin repetir al cargar.
- Se conservan el oro ahorrado, los objetos y las recetas anteriores. La subvención de Corki y los planos por hitos se conceden una sola vez también a las partidas ya avanzadas; no se recalculan las recompensas de combate ni se multiplican los saldos.

## Liberación de ecos y movimiento

La acción que abre una resonancia guarda `echo:<id>-release-pending`, incluso cuando procede de una misión completada dentro de una cinemática. WorldScene reproduce el efecto existente y marca `release-seen` cuando finaliza. Una interrupción conserva la cola, y una liberación mostrada no vuelve a reproducirse. Las partidas que ya terminaron Sett/Jhin/Karma sin el efecto lo recuperan al regresar a una zona del campeón. Jhin conserva un origen visual aun cuando su detención lo retire como NPC.

Las conversaciones que refrescan el mundo y los retornos de cinemáticas conservan posición actual, orientación, objetivo de movimiento, índice de patrulla y pausa restante por ID de NPC. La captura corresponde al mismo mapa y al mismo objeto de partida; no se aplica a otra región o perfil. Los NPC cuya presencia cambia por la historia siguen obedeciendo sus condiciones. Se omite el fundido al reconstruir el mismo mundo desde esta captura.

## Diario

Al abrir desde el menú se entra en **En curso**. Se prioriza la región actual, después las entregables; las completadas pasan a su archivo. **Disponibles** solo incluye misiones accesibles de regiones desbloqueadas. Hay paginación para que ninguna misión quede oculta tras las primeras cuatro.

Sett, Jhin y Karma son **Historias de campeón**, una categoría narrativa distinta de los encargos. No se convierten en requisitos artificiales de la trama principal. El detalle destaca el siguiente objetivo sin volver a mostrar el último paso de Corki como misión pendiente.

## Verificación

`check-economy-narrative.mjs` comprueba catálogo/sprites, costes, fabricación atómica, subvención y migración idempotentes, cola de efectos al completar misiones indirectamente, selección del diario, captura real de continuidad, IDs y cantidades de las bolsas. La build ejecuta además las comprobaciones existentes de accesibilidad, diálogos/cinemáticas, interiores, mandos, movimiento y combate. No se ha realizado una sesión visual de juego en móvil en este entorno.

Referencia de precio del Tomo y clasificación de intermedios: notas oficiales de Riot 14.1 y 10.23. Los costes/recetas/atributos de este documento son decisiones de diseño del RPG.
