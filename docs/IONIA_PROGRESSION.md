# Jonia: personajes, desbloqueos y rutas

Diseño narrativo propuesto para el juego, basado en el mapa general provisional y el catálogo existente. Incluye sus 21 zonas, los 21 Ecos de Jonia y Kennen como personaje recurrente. Las localizaciones son decisiones de diseño; las maestrías son una primera propuesta de balance.

## Qué funciona ahora

Las apariciones de todas las rutas están registradas y condicionadas a la resonancia de cada Eco. Koeshin y Acantilados Blancos permiten encontrar Kennen M7–8 desde el principio. Yi y Wukong tienen NPCs, diálogos y duelos M8 activos: vencerlos habilita sus apariciones, sin regalar el Eco. Los demás eventos de desbloqueo siguen pendientes. Hay carpetas para las 21 zonas; solo JO01 y JO02 tienen mapas jugables.

## Regla de desbloqueo

Conocer al personaje y resolver su evento activa `echo:<id>-resonance`. Eso habilita sus encuentros; no concede automáticamente su Eco. La vinculación se hace después en la ruta. Las pruebas fallidas se pueden reintentar y avanzar nunca exige capturar un Eco concreto. Xayah y Rakan desbloquean sus dos resonancias en el mismo evento. Varus y Kayn, incluidas sus formas, se reservan para una visita posterior a Jonia. Yasuo y Yone quedan fuera de los encuentros iniciales y no bloquean la historia. Kennen conserva el desbloqueo de Bandle, con una excepción de respaldo: sus apariciones de JO01 y JO02 no requieren ninguna bandera, tampoco en el reparto futuro.

## Recorrido y dificultad

1. Entrada: Koeshin → Acantilados Blancos (M7–8).
2. Navori: Lhradi → Arrozales → Placidium → Estuario → We’hle → Cumbres (M8–14). La primera visita al Placidium introduce a Karma; Irelia reserva su duelo para el regreso final.
3. Bosque Eterno: Desembarco → Jardín → Omikayalan → Raíces → Refugio Vastaya (M12–17).
4. Fae’lor: Costa → Recinto, como desvío opcional con Syndra (M15–18).
5. Órdenes: Poblado → Kinkou → Barranco → Errantes → Santuario (M16–22).
6. Cierre: Islote del Reencuentro y regreso al Placidium para Irelia (M20–22).

Es un orden de visitas, no una red de portales ya implementada. Embarcaderos y atajos se concretarán al construir los mapas. Las misiones principales abren el siguiente tramo al completarse, no al capturar el Eco; las secundarias no bloquean el recorrido. El final exige superar JO20, no reunir los 21 Ecos.

## Acceso avanzado y personajes reservados

**Varus y Kayn:** no aparecen ni se desbloquean durante el primer recorrido de Jonia. Se reservan el altar del Estuario y la cámara del Barranco, sin NPCs ni combates activos. Los perfiles de retorno están registrados con M28–32 para el Estuario y M26–30 para el Barranco, como balance provisional. Exigen `story:ionia-late-return` y la resonancia individual; ningún evento concede aún estas banderas. Sus datos de combate y su disponibilidad en Showdown se conservan.

**Yasuo y Yone:** no están disponibles desde los Arrozales y las Cumbres en la primera pasada. Propongo habilitar sus rastros después de completar la prueba de Shen en JO17. Seguir los rastros de cada hermano reconoce su resonancia y habilita sus encuentros errantes. Es contenido opcional: no exige derrotarlos o capturarlos para terminar Jonia.

| Espacio avanzado | Encuentros propuestos | M |
|---|---|---|
| Arrozales: senda lateral del viento | Yasuo 15%, Yi 55%, Wukong 30% | Yasuo 24–26; acompañantes 9–11 |
| Cumbres: umbral espiritual lateral | Yone 15%, Lee Sin 50%, Yi 35% | Yone 26–28; acompañantes 12–14 |
| Camino de los Errantes: puntos de paso | Yasuo 10%, Yone 10%, Shen 40%, Akali 40% | Yasuo 24–26; Yone 26–28; acompañantes 18–20 |

Los perfiles avanzados sustituyen el reparto inicial de esas zonas cuando se active `story:ionia-wanderers-awakened`; cada hermano exige además su resonancia. Sus eventos de rastros y el hito de Shen siguen pendientes. Al preparar los mapas, los espacios laterales podrán separarse en subzonas para conservar también el reparto inicial del camino principal.

Yasuo y Yone salvajes tienen un 70% de probabilidad de intentar huir en su turno y un multiplicador de vinculación de 0,75. Enraizar, atrapar, aturdir y otros controles que impiden actuar bloquean la huida mientras duren. El vinculador puede usarse antes de la respuesta enemiga: es posible arriesgarlo de primeras. La huida termina el encuentro sin experiencia ni recompensa. Este comportamiento no se aplica a duelos de entrenadores.

## Encuentro con cada personaje

| Personaje | Zona y lugar | Evento de desbloqueo | M evento | Papel |
|---|---|---|---|---|
| Master Yi | JO01 · Koeshin y Senda del Portal: Templo reservado al este de Koeshin | Entrenamiento de control y duelo introductorio | 8 | principal |
| Wukong | JO02 · Acantilados Blancos: Mirador de la terraza oriental | Recorrer la ruta de puentes y vencer su desafío de movilidad | 8 | secundario |
| Sett | JO03 · Poblado de Lhradi: Arena del poblado | Ayudar a organizar la arena y ganar un duelo limpio | 10 | secundario |
| Jhin | JO03 · Poblado de Lhradi: Teatro y taller de máscaras | Investigar cuatro pistas de resonancia y resolver el duelo del escenario | 11 | secundario |
| Yasuo | JO04 · Camino de los Arrozales: Rastros en los Arrozales y encuentros móviles en el Camino de los Errantes | Después de la prueba de Shen en JO17, seguir sus rastros para reconocer su resonancia; aparece como Eco errante, sin NPC fijo ni captura obligatoria. | 20 | errante-avanzado-opcional |
| Karma | JO05 · Placidium de Navori: Santuario central | Restaurar tres focos de equilibrio y superar su prueba | 12 | principal |
| Irelia | JO05 · Placidium de Navori: Patio del Placidium, en la visita final | Volver tras la prueba del santuario JO20 y ganar el duelo de cierre | 22 | principal-final |
| Varus | JO06 · Senda del Estuario: Altar de la orilla | Reservado para una visita posterior a Jonia; sin personaje, combate, desbloqueo ni apariciones durante el primer recorrido. | Por definir | reserva-late-game |
| Lee Sin | JO07 · Puerto de We’hle: Patio de peregrinos del puerto | Ayudar a los peregrinos y completar la prueba de percepción | 13 | principal |
| Yone | JO08 · Paso de las Cumbres: Rastros en las Cumbres y encuentros móviles en el Camino de los Errantes | Después de la prueba de Shen en JO17, seguir sus rastros para reconocer su resonancia; aparece como Eco errante, sin NPC fijo ni captura obligatoria. | 21 | errante-avanzado-opcional |
| Ahri | JO09 · Desembarco del Bosque: Refugio junto al desembarco | Recuperar fragmentos de memoria y superar el encuentro del refugio | 14 | principal |
| Lillia | JO10 · Jardín del Olvido: Claro de los sueños | Liberar tres sueños atrapados y completar una prueba onírica | 15 | secundario |
| Ivern | JO11 · Omikayalan: Corazón de Omikayalan | Liberar criaturas y restaurar el árbol; desbloqueo sin duelo obligatorio | 16 | principal |
| Yunara | JO12 · Sendero de las Raíces: Santuario de las raíces | Reconectar tres reliquias y superar el duelo del santuario | 16 | secundario |
| Xayah | JO13 · Refugio Vastaya: Refugio Vastaya | Defender el refugio y superar un duelo doble con Xayah y Rakan | 17 | principal |
| Rakan | JO13 · Refugio Vastaya: Refugio Vastaya | El mismo evento de Xayah desbloquea ambas resonancias a la vez | 17 | principal |
| Syndra | JO15 · Recinto de Fae’lor: Cámara del sello de Fae’lor | Reequilibrar las anclas y vencer su manifestación | 18 | secundario |
| Akali | JO16 · Poblado de las Órdenes: Patio del poblado de las órdenes | Resolver un contrato de infiltración y superar su desafío | 18 | principal |
| Shen | JO17 · Templo Kinkou: Cámara de equilibrio del templo | Resolver dos lados de la prueba y vencer el duelo del equilibrio | 19 | principal |
| Zed | JO18 · Barranco de la Sombra: Dojo del barranco | Completar la ruta de sombras y vencer al maestro del dojo | 20 | principal |
| Kayn | JO18 · Barranco de la Sombra: Cámara de la guadaña | Reservado para una visita posterior a Jonia; sin personaje, combate, desbloqueo ni apariciones durante el primer recorrido. | Por definir | reserva-late-game |
| Kennen | JO17 · Templo Kinkou: Patio del templo, como personaje recurrente | Su resonancia se desbloquea en Bandle; aquí ofrece un desafío repetible | 19 | ya-desbloqueado-en-bandle |

## Reservas y apariciones de las 21 zonas

Esta tabla describe el primer recorrido antes de los perfiles errantes avanzados. Varus y Kayn están excluidos. Los porcentajes indican el reparto con todas las resonancias de esa fila desbloqueadas. Si faltan resonancias, se renormalizan las disponibles; por ejemplo, Kennen es el 100% en JO01 antes de desbloquear a Yi. Estos repartos ya están registrados; solo se usan en mapas jugables y con sus condiciones cumplidas. En la primera visita a JO05 se usaría M10–12; tras el final, un perfil de revisita M20–22 para Irelia y Karma, sin subir todas las rutas antiguas.

| Zona | M ruta | Espacio que preparar | Apariciones posteriores |
|---|---|---|---|
| JO01 · Koeshin y Senda del Portal | 7–8 | Templo de entrenamiento, santuario y primera casa | Master Yi 70%, Kennen 30% |
| JO02 · Acantilados Blancos | 7–8 | Mirador de Wukong, terraza de práctica y cala de recompensa | Wukong 50%, Master Yi 30%, Kennen 20% |
| JO03 · Poblado de Lhradi | 8–10 | Arena de Sett y teatro con taller de máscaras de Jhin | Sett 40%, Jhin 35%, Master Yi 25% |
| JO04 · Camino de los Arrozales | 9–11 | Campos con patrullas y rastros del viento reservados para el tramo avanzado | Master Yi 65%, Wukong 35% |
| JO05 · Placidium de Navori | 10–12 | Santuario de Karma, patio de Irelia y puerta del regreso final | Karma 45%, Master Yi 35%, Irelia 20% |
| JO06 · Senda del Estuario | 10–12 | Orilla de resonancias de Karma; altar sellado reservado para una visita tardía | Karma 50%, Master Yi 30%, Wukong 20% |
| JO07 · Puerto de We’hle | 11–13 | Patio de peregrinos de Lee Sin y embarcadero | Lee Sin 60%, Karma 25%, Master Yi 15% |
| JO08 · Paso de las Cumbres | 12–14 | Paso de peregrinos y umbral espiritual reservado para el tramo avanzado | Lee Sin 60%, Karma 25%, Master Yi 15% |
| JO09 · Desembarco del Bosque | 12–14 | Refugio de Ahri y senda de las memorias | Ahri 50%, Lee Sin 30%, Karma 20% |
| JO10 · Jardín del Olvido | 13–15 | Claro de Lillia y jardín de sueños | Lillia 60%, Ahri 25%, Karma 15% |
| JO11 · Omikayalan | 14–16 | Corazón del bosque de Ivern y árbol de descanso | Ivern 55%, Lillia 30%, Ahri 15% |
| JO12 · Sendero de las Raíces | 14–16 | Santuario ancestral de Yunara y ruta de raíces | Yunara 55%, Ivern 30%, Lillia 15% |
| JO13 · Refugio Vastaya | 15–17 | Refugio de Xayah y Rakan y claro para duelo doble | Xayah 40%, Rakan 40%, Ahri 20% |
| JO14 · Costa de Fae’lor | 15–17 | Playa de acceso, campamento y pista del sello | Xayah 30%, Rakan 30%, Ahri 40% |
| JO15 · Recinto de Fae’lor | 16–18 | Cámara de Syndra, anclas del sello y salida de seguridad | Syndra 60%, Yunara 25%, Ahri 15% |
| JO16 · Poblado de las Órdenes | 16–18 | Patio de Akali, tablón de contratos y alojamiento | Akali 60%, Lee Sin 25%, Wukong 15% |
| JO17 · Templo Kinkou | 17–19 | Patio de Shen, cámara de equilibrio y regreso de Kennen | Shen 55%, Kennen 25%, Akali 20% |
| JO18 · Barranco de la Sombra | 18–20 | Dojo de Zed; cámara de la guadaña sellada sin evento activo | Zed 60%, Shen 25%, Akali 15% |
| JO19 · Camino de los Errantes | 18–20 | Camino de las órdenes y rutas de patrulla; apariciones errantes solo tras avanzar | Shen 50%, Akali 30%, Zed 20% |
| JO20 · Santuario de la Prueba | 20–22 | Prueba de equilibrio y acceso al cierre regional | Karma 40%, Shen 35%, Yunara 25% |
| JO21 · Islote del Reencuentro | 20–22 | Escena de reunión, santuario final y barco de retorno | Ahri 30%, Ivern 25%, Xayah 25%, Rakan 20% |

## Preparación de los mapas actuales

- **JO01, Yi:** reservar el templo del este, rectángulo existente `(1472, 320, 352, 224)`. Separar patio de interacción, lugar del duelo y retorno; la ruta principal y el portal permanecen libres.
- **JO02, Wukong:** reservar el mirador oriental, rectángulo existente `(1760, 1120, 160, 128)`. Su desafío usa puentes y terrazas; no es necesario cerrar el camino para encontrarlo.
- Las reservas se guardan en `DesignNotes` con personaje, evento y bandera previstos. Los NPCs actuales usan puntos de `NpcSpawns`: Yi en (1632, 576) y Wukong en (1808, 1200).
- La primera casa de Koeshin conserva su reserva de entrada y salida.

## Orden de implementación

Yi y Wukong ya están activos. El siguiente paso es construir JO03 con sus eventos y JO04 como ruta transitable con la reserva errante todavía inactiva. Cada tramo posterior requiere su TMJ, espacios de interacción, NPC, diálogo, evento y tabla condicionada antes de activarlo. Los rastros y el hito avanzado de JO17 están pendientes; las apariciones y el comportamiento huidizo ya están implementados; Varus y Kayn quedan fuera de esta fase. Para los duelos, la bandera de resonancia se concede en la victoria; para eventos pacíficos, al completar sus objetivos.

Antes de retirar la tabla provisional, comprobar una partida nueva, una partida sin misiones opcionales y una partida con eventos completados. Debe quedar al menos un Eco disponible por ruta, y la prueba del personaje se desarrolla en un espacio sin encuentros aleatorios. La tabla final de JO05 necesita un perfil de revisita condicionado al cierre regional.

El esquema editable está en `docs/diseno/jonia/plan-region.json`, fuera de los catálogos de ejecución. Los mapas futuros no se registran como jugables hasta que existan.
