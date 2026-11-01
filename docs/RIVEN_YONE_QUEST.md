# Donde calla el viento

La secundaria está activa desde el Camino de los Errantes (JO19), junto al ascenso de entrada desde Kinkou. No modifica los tiles de Jaime ni exige una captura.

- Sin `story:yasuo-met` ni `echo:yasuo-resonance`, Riven orienta hacia el hombre del árbol de los Arrozales sin nombrarlo. El diario pide regresar después de escucharlo.
- Si ese encuentro ya está hecho, Riven reconoce el relato y propone investigar las Cumbres. Las partidas anteriores conservan su avance y no repiten la liberación.
- Riven espera junto al refugio de JO08. Acompaña hasta el claro occidental y se detiene para un combate opcional con confirmación explícita.
- La patrulla enfrenta un Eco del jugador y Riven IA contra un lancero y un ballestero. Solo la victoria abre la siguiente fase; perder permite reintentar. La aliada no se incorpora al equipo ni recibe experiencia.
- Riven continúa junto al jugador hasta la escalera occidental. La figura enmascarada solo aparece al completar esta aproximación después de la misión y la patrulla.
- Un recuerdo en gris explica el duelo de los hermanos y el azakana; el presente permanece en el overworld. La resolución revela el nombre, completa la misión y libera la resonancia sin regalar una captura.
- Yone es un errante único de maestría 30 con un 1 % por encuentro elegible en JO08/JO19. Se guarda su Vida, descansar no borra el desgaste, un KO puede recuperarse en santuario y vincularlo impide duplicados. Yasuo conserva su propia probabilidad y sus rutas.
- Recompensa: 150 de oro una sola vez. Tras el desenlace, Riven regresa a JO19. La historia puede completarse antes o después del asedio y no bloquea la campaña.

Se han retirado las antiguas tablas de aparición de Yone que dependían del hito provisional de Shen; ninguna tabla ordinaria puede saltarse la secundaria.

Las conversaciones, la patrulla y esta expedición son una adaptación original. Se conservan la responsabilidad de Riven, la muerte de Yone a manos de su hermano y su retorno ligado al azakana; Riven no lo resucita ni obtiene un perdón automático.

Referencias de Riot: https://www.leagueoflegends.com/es-es/champions/yone/ y https://www.leagueoflegends.com/es-es/champions/riven/ .

Validación: `node scripts/check-riven-yone.mjs`, `node scripts/check-noxus-champion-kits.mjs`, `node scripts/check-forest-stories.mjs` y compilación. El test específico ejecuta las fases con y sin encuentro previo, las dos llegadas del acompañamiento, aceptar/posponer el duelo, entrada con un solo Eco, guardado/reintento, recompensa única, apariciones bloqueadas, Vida/KO/vinculación y el movimiento/pausa/reanudación real de los NPC.
