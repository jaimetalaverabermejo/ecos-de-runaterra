# Jonia: conexiones tras la edición del 31 de octubre

Base: `993bc4a` («cambios mapas jonia»). Se conservan los identificadores de zonas y el arte del autor. Esta entrega cambia navegación, llegadas y barcos; la adaptación narrativa completa queda para la siguiente revisión.

## Recorrido terrestre

- Principal: Koeshin ↔ Acantilados Blancos ↔ Lhradi ↔ Arrozales ↔ Navori ↔ Estuario ↔ Cumbres ↔ Weh’le. El puerto también conecta con el apéndice occidental de Acantilados. Se retira el antiguo Navori–Cumbres.
- Bosque: Desembarco ↔ Jardín ↔ Omikayalan ↔ Raíces ↔ Refugio. Omikayalan y Refugio tienen además una conexión directa por sus nuevas bocas oeste/este.
- Fae’lor: Costa ↔ Recinto. Ninguna salida terrestre comunica esta isla con las Órdenes. No se añaden encuentros ni historias en estos dos mapas.
- Órdenes: Poblado ↔ Kinkou ↔ Errantes. Errantes ↔ Barranco es un ramal de ida y vuelta; Errantes ↔ Santuario es el otro. Barranco tiene una única conexión exterior y Santuario carece de salida norte.
- Reencuentro: solo barco. No hay transición directa con Santuario.

## Barcos

`src/data/world/regions/ionia/ferries.json` contiene las cinco llegadas, posiciones de los barcos y accesos a los menús: Weh’le, Desembarco, Costa de Fae’lor, playa del Poblado y Reencuentro. Todos ofrecen el resto de destinos disponibles; se omite el propio puerto. La navegación requiere interacción explícita y permite cancelar.

Se mantienen las condiciones existentes: carta para entrar en las Órdenes y Runa del Espíritu para visitar Reencuentro. Salir de Reencuentro ya no exige el aviso de asedio; todos los destinos de regreso siguen siendo accesibles. Se conserva la compatibilidad de las antiguas opciones de los dos tripulantes.

## Reparaciones delimitadas

- JO02: completar las dos filas del camino de la boca occidental, aprovechando el apéndice existente.
- JO11: cuatro tiles de camino y dos tiles de salto lateral retirados en el hueco de dos columnas que separaba el nuevo acceso oeste del sendero interior. El paso funciona en ambos sentidos.
- JO18: el portal del autor estaba en el borde oriental, lejos del camino; se coloca en el extremo del sendero pintado (x=1440, y=2016), sin prolongar ni rediseñar el terreno.
- Reubicar mínimamente dos animales de Estuario, Kennen del Poblado y el corredor de aproximación de Maki para evitar colisiones con la edición del terreno. Se conservan movimiento y comportamiento.
- El santuario completo del Refugio vuelve a curar y guardar checkpoint mediante su zona existente: el autor había retirado la interacción del antiguo farol.
- Actualizar los recursos de Agua del Poblado y activar los dos mapas de Fae’lor.
- Las llegadas de Tiled y las definiciones JSON coinciden. Los alias anteriores se mantienen como respaldo seguro. Una partida guardada dentro de un obstáculo nuevo en un exterior jonio recupera la llegada segura de la zona.
- Se retiran los vigías de las salidas inexistentes del Santuario y Reencuentro; el aviso de la confianza de Zed se traslada al nuevo acceso a Santuario desde Errantes.
- Se retira la antigua recolocación por coordenada Y de Omikayalan, que desplazaba incorrectamente las nuevas llegadas occidentales. El bloqueo físico de la historia de Ivern se conserva.

## Revisión narrativa posterior

No se reescriben conversaciones, objetivos, secuencias o misiones (salvo los menús de transporte). La secuencia mecánica conserva confianza de Akali para Kinkou, confianza de Shen para Errantes y confianza de Zed para Santuario. Hay que revisar después las indicaciones de dirección, el antiguo atajo de Cumbres, el nuevo bucle del bosque y la utilidad narrativa de Fae’lor. El atlas ilustrado todavía representa el trazado anterior.

## Validación

`node scripts/check-ionia-topology.mjs` comprueba los 21 exteriores, exactamente 18 enlaces terrestres bidireccionales, las cinco llegadas de barco, accesibilidad con el cuerpo del jugador, coincidencia Tiled/JSON y ausencia de rebotes. Está incluido en prebuild. `check-ferries.mjs` comprueba menús, requisitos, cancelación, destinos inválidos, ida/vuelta entre todos los puertos y alias antiguos. Se mantienen las demás comprobaciones del proyecto. Se actualizan los hashes y las referencias de las pruebas a los mapas manuales de esta subida, sin desactivar las comprobaciones de geometría.

Revisión en navegador local: llegada a la playa y menú completo de las Órdenes; circuito Órdenes → Fae’lor → Reencuentro → Órdenes; transiciones automáticas de ida y vuelta Weh’le–Acantilados, Omikayalan–Refugio, Costa–Recinto y Errantes–Barranco. Sin errores de página. Se inspeccionaron capturas de los embarques y del menú.
