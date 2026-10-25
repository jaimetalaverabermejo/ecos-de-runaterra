# Reglas permanentes de Ecos de Runaterra

- Campeones y aldeanos se mueven siempre: patrulla o movimiento ambiental sobre suelo transitable. Un NPC estático requiere una excepción solicitada expresamente por el usuario y documentada en el campo `excepcionMovimientoAutorizada` de sus datos. Una pausa al conversar es temporal.
- El vendedor recurrente de Runaterra, incluida Jonia, es siempre el mercader nutria de Bandle (`otter-merchant`), con el mismo puesto exterior. Hablar con él abre la tienda directamente: no sustituirlo por un comerciante regional ni trasladar la venta a un interior. Reutilizar su atlas y puesto; una decoración regional distinta requiere petición expresa.
- Probar desplazamiento real, pausa al conversar y reanudación; declarar un comportamiento sin comprobar desplazamiento no basta.
- Comparar altura visible con el protagonista. No reutilizar la escala yordle para humanos; medir el contenido visible del sprite y comprobarlo en pantalla.
- Las historias de campeones tienen lore verificado, conflicto, objetivos con sentido repartidos por la zona, diario y desenlace. Distinguir las escenas inventadas para este juego del canon.
- Las animaciones cuerpo a cuerpo mantienen espacio entre siluetas, anticipación legible e impacto visible. No hacer atravesar sprites ni presentar una figura geométrica como un recurso final de puño o flecha.

- Las escenas de presente se representan dentro del overworld, con cámara y diálogos normales, movimientos de NPC y efectos locales. Reservar StoryScene y el tratamiento separado para recuerdos explícitos; no añadir franjas negras a los acontecimientos presentes.

- Para exteriores nuevos de Jonia, seguir `docs/IONIA_EXTERIOR_STYLE.md` y las referencias corregidas de JO08–JO13: cuerpo y pie de barranco repetidos, remates de unión en GroundDetails, escaleras frontales con tres filas centrales iguales y dos remates, pasos laterales con tiles girados y puentes/embarcaderos orientados según el paso y la orilla. Conservar los mapas corregidos por Jaime y comprobar accesos y colisiones tras los cambios visuales.

- Los caminos de Jonia tienen siempre dos tiles de ancho, alineados con la entrada y salida de las escaleras. Solo los tres tramos centrales de la escalera frontal llevan roca en Obstacles debajo de Paths; los remates de entrada y salida descansan sobre suelo sin roca. Completar la pared a ambos lados de los escalones, sin franjas vacías. Los pasos laterales atraviesan una pared continua. Conservar la paleta oscura propia de JO18; unificar la estructura no significa sustituir su material por roca clara. Para crear o corregir mapas, aplicar la skill `runaterra-crear-mapas`, validada por Jaime.
