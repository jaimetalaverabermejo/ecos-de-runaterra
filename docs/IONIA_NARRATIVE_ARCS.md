# Historias de Navori · revisión 2

Diseño aprobado el 11 de octubre de 2026. Las escenas y los habitantes de estas misiones son ficción original de Ecos de Runaterra. La caracterización parte de las presentaciones oficiales de [Sett](https://www.leagueoflegends.com/es-es/news/dev/champion-insights-sett/), [Jhin](https://www.leagueoflegends.com/es-es/champions/jhin/) y [Karma](https://www.leagueoflegends.com/es-es/champions/karma/).

## Sett — El precio de un nombre

En Lhradi, un recaudador ha cambiado el nombre de un apostador por el del aprendiz Lian para retenerle el salario. Sett no conoce la estafa y pide pruebas, sin dar por culpable a nadie. Lian explica que trabajó en los arrozales para comprar medicina a su madre Suyin. Ella conserva el registro firmado del encargado. Al compararlo con la cuenta raspada del mercado, el jugador demuestra que Lian no pudo contraer aquella deuda. El recaudador confiesa y se celebra una restitución pública en la arena.

El final es una escena, no un duelo. Sett admite que su reputación intimidaba también a quienes necesitaban reclamar. Lian recupera la decisión de regresar al foso o dejarlo. Ambos y Suyin permanecen disponibles con diálogos posteriores.

Suyin entrega después una carta para Meilin en Placidium. Su hermano Ren salvó a Lian durante una evacuación. La carta introduce el conflicto de Karma; llevarla es opcional y no bloquea ninguna historia.

Recorrido: Sett → Lian → Suyin en la casa noroeste de JO04 → cuenta del mercado de JO03 → recaudador → Sett. Completar activa `echo:sett-resonance` sin entregar un Eco automáticamente.

## Jhin — La cuarta escena

Qiao, un intermediario ficticio de Navori, pagó un transporte de armas entre refugiados. Orin, Hesh y Elan descubrieron el contenido y conservaron copias. Aya, tramoyista de Lhradi, guarda el inventario completo. Qiao contrata a Jhin para silenciarlos; Jhin transforma el encargo en una composición de cuatro actos.

1. **Orin, Lhradi:** Aya introduce el asesinato. El programa del teatro tiene cuatro pétalos y un trazo; la anotación del contable señala a Hesh.
2. **Hesh, arrozales:** Nara relata el segundo asesinato y entrega un resguardo. La misma firma presenta dos trazos. El barquero Elan huyó a We’hle.
3. **Elan, We’hle:** el registro del Estuario identifica su embarcadero y a Qiao. El jugador habla con Elan y cree poder escoltarlo. Una línea de apuntado, un disparo lejano y una caída breve muestran su muerte, sin sangre y sin enseñar a Jhin. La música se interrumpe. La milicia atiende la escena. El proyectil queda incrustado en la madera junto al farol y lleva grabado `IV · AYA · LHRADI · ABAJO EL TELÓN`. Es un proyectil, no un casquillo aparecido junto a la víctima: el casquillo habría quedado con el tirador.
4. **Aya, regreso a Lhradi:** el jugador vuelve con la inscripción, avisa a Aya y ve que la milicia la protege. Entra por el taller del este y combate para detener a Jhin (M13). La victoria conduce a una escena de detención y traslado bajo custodia. Aya conserva su epílogo; la compañía recuerda a las tres víctimas y deja vacío el cuarto lugar.

Recorrido: JO03 → JO04 → JO05 → JO06 → JO07 → regreso JO03. Ningún crimen depende de un temporizador real. Perder el combate permite reintentar; las pruebas permanecen. La resonancia se activa después de la detención, sin que Jhin entregue voluntariamente su Eco.

## Karma — Los nombres que faltan

Meilin mantiene un memorial del que se ha borrado el nombre de su hermano Ren. Durante una evacuación, él abrió un canal para sacar barcas con familias; la corriente destruyó un puente y mató al padre de Tao. Ren volvió por otras personas y no regresó. Suyin sobrevivió con Lian. Karma sostuvo la puerta mientras se evacuaba el pueblo, pero después dejó que el silencio separara las memorias de las familias.

El jugador escucha a Meilin, Suyin y Tao. Los dos testimonios de los arrozales pueden reunirse en cualquier orden. Lee el hueco raspado en el memorial y la inscripción de la cima, y vuelve a Karma.

**Flashback no jugable:** quince planos de doce segundos, 180 segundos en reproducción automática. Blanco y negro real aplicado a mapas y personajes, tres espacios y escenas de vida cotidiana, evacuación, pérdida y desacuerdo posterior. Los actores caminan; hay cambios de encuadre, ambiente y silencios. A/Enter o toque avanza, el botón visible Omitir/S salta y conserva la progresión.

De vuelta al presente, el jugador escoge entre acompañar la ceremonia con flores o leer juntos los nombres. En ambas versiones el arroz se reparte y Ren vuelve a la piedra. El memorial y los diálogos posteriores muestran el cambio. No hay combate obligatorio ni una resolución mágica del duelo de Tao. La misión activa la resonancia de Karma y orienta hacia Estuario/We’hle.

## Implementación y partidas existentes

- `src/data/quests/`: objetivos y revisión de las tres misiones.
- `src/contenido/mundo/dialogos/ionia-navori.json`: conversaciones y variantes posteriores.
- `src/contenido/mundo/npcs/ionia-navori.json`: identidades persistentes y patrullas.
- `src/data/stories/` y `StoryScene`: escenas sobre los mapas/sprites del juego, controles móviles, música y efectos.
- JO06 y JO07 registrados, accesos bidireccionales, mapa regional y encuentros condicionales existentes. JO08–JO21 siguen pendientes; Varus no aparece en su altar reservado.
- Una investigación antigua activa se reinicia en su conversación inicial al cargar, porque sus objetos no representan los nuevos hechos. Se conservan equipos, objetos, dinero, capturas y resonancias. Las misiones ya completadas se conservan completadas y no vuelven a otorgar recompensas.
- La altura visible de Jhin y Karma se ajusta a una escala 0,60, próxima al protagonista. Se conserva el tamaño del protagonista y la escala 0,64 de Sett.
- Las pruebas alcanzadas fuera de orden quedan registradas. Los objetos aún no introducidos no aparecen como pistas brillantes inaccesibles.

Validación: compilación, `check-ionia-stories.mjs`, accesibilidad de las siete zonas, desplazamiento real/pausa/reanudación de NPC y escenas en navegador.


## Lee Sin — Lo que no ves · isla principal

Escenario original de Ecos de Runaterra. Base de caracterización verificada en la ficha oficial de Riot: https://www.leagueoflegends.com/es-es/champions/leesin/ (consulta 15/10/2026). Lee Sin es un artista marcial jonio, ciego y protector de su hogar, vinculado al espíritu del dragón. La crecida, Jun, Nima y los habitantes de We’hle son ficción del juego; no se presentan como hechos canónicos. El campamento y la lección no atribuyen a Lee Sin afiliación Kinkou.

Dai introduce la llegada de los peregrinos desde Estuario y ofrece una recuperación opcional en una orilla lateral. En el patio alto de We’hle, Lee Sin pide reconstruir la salida de Jun. Min, en la plaza del muelle, aporta el sonido de su campana; Ara, al norte, aporta la venda y el rumbo. Los testimonios pueden reunirse en cualquier orden. Las huellas del descanso de Cumbres revelan que alguien arrastra un pie y que otro caminante vuelve por él.

Jun permanece con Nima junto al descanso de la casa de Cumbres. Reunidas las tres pistas, ofrece el encuentro para despejar una resonancia inquieta (Kennen M11). Ambos caminan despacio, sin poses estáticas de heridos. Tras el combate, la conversación de victoria los traslada al patio del puerto. Lee Sin distingue la ayuda prestada de la falta de aviso al grupo, ofrece una lección y queda disponible para un duelo reintentable M13.

La prueba tiene ritmo determinista por turnos: impulso (Q), guardia (W), barrido (E) y pausa. El cartel escrito permanece entre las siluetas y anuncia la misma acción que resolverá la IA; si el recurso o el enfriamiento impiden una técnica, anuncia pausa y realmente espera. El ritmo usa los turnos reales del enemigo, conserva enfriamientos y se aplica exclusivamente a este duelo. No modifica encuentros salvajes ni Showdown, ni exige capturar un Eco con una habilidad concreta.

Completar concede 140 de oro una vez y activa la resonancia de Lee Sin, sin regalar su captura. Lee Sin puede aparecer en Estuario y Cumbres; Kennen mantiene respaldo cuando faltan las resonancias locales. El paquete de Dai concede 75 de oro una vez. La capitana Ema explica que el viaje al Bosque Eterno queda para la siguiente versión. El atajo se desbloquea leyendo el poste del mirador; no depende de la misión de Lee Sin y nunca abre la cima reservada del Plácidum.

Pruebas: `scripts/check-ionia-island.mjs` ejecuta las acciones reales de los diálogos, guardado/recarga entre fases, desenlaces y recompensas únicas; comprueba todos los objetivos desde el punto de llegada, las rutas de patrulla completas y el movimiento real de las 35 instancias, incluida su pausa y reanudación. `check-ionia-access.cjs` incluye los ocho exteriores.
