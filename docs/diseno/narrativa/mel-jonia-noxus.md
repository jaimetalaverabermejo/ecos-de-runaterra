# Mel Medarda: cierre de Jonia y llegada a Noxus

## Alcance narrativo

La embajada, el conflicto por las runas y la audiencia son ficción original de Ecos de Runaterra, solicitada por Jaime el 2 de noviembre de 2026. No representan sucesos canónicos de League of Legends. Se toma como base la identidad noxiana y la posición política de Mel: https://www.leagueoflegends.com/es-es/champions/mel/ . Riven conserva su arco existente con Yasuo y Yone.

1. Antes del consejo de **Shen, Zed y Akali**, Mel espera fuera de la cámara de JO20 tras superar las tres pruebas. Propone cooperar en la búsqueda de una runa que conecta lo material y lo espiritual. El protagonista niega conocerla y continúa su camino. La puerta garantiza este encuentro sin insertar a Mel en el consejo.
2. Durante el asedio de Navori, antes de entrar en el puesto de Irelia, Mel recuerda la negociación rechazada. Swain ha elegido la invasión; Mel intentó evitarla y mantiene una salida para los civiles. No descubre al portador de la runa. Las partidas que ya habían pasado el consejo reciben una presentación alternativa, sin fingir un encuentro anterior.
3. Tras derrotar a Swain y su comandante junto a Irelia, Irelia remite al jugador a Mel en el muelle sur del Islote del Reencuentro. Mel reconoce su fuerza y su capacidad de unir a las Órdenes. Ofrece un pasaje sin exigir la runa ni lealtad. Aplazarlo no desbloquea la travesía; se puede aceptar después.
4. En el Puerto Oriental, Mel recibe al jugador y señala el recorrido **Puerto → Basilich → Cruce de Caravanas → capital**. El barco permite volver a Jonia en cualquier momento. La primera salida requiere runa, defensa completada e invitación aceptada.
5. Ante el Bastión, la guardia rechaza la entrada y Mel responde por su invitado. Se registra su acceso por la fuerza demostrada en Navori y por la diplomacia ejercida con las Órdenes. Entrar de nuevo no repite el control.
6. Dentro del Bastión, Mel guía al jugador por la galería central, espera cuando se aleja y lo presenta al portavoz en la sala del consejo. La misión **Entre dos orillas** termina aquí; no se inventa todavía la siguiente misión de la corte.

## Implementación y comprobación

- Datos: `mel-transition.json` en diálogos y NPC; misión `mel-between-shores.json`.
- `MelDiplomacyService` superpone los accesos narrativos; no altera fuentes, capas, colisiones ni hashes de los mapas manuales.
- Patrullas para Mel, guardia y portavoz. Guía de Mel hasta la sala del consejo, ruta muestreada con huella de 22 × 16 px.
- Mel usa su atlas existente de 288 × 384 y escala humana 0,54. Silueta visible de 73–80 px, equivalente a 39–43 px en mundo; protagonista 74–78 px, equivalente a 40–42 px.
- `check-mel-transition.mjs`: negociación previa, advertencia, aplazamiento/aceptación, ida y vuelta, acceso único, misión, partidas antiguas, patrullas y trayecto de guía. Ejecuta el código de desplazamiento de WorldScene para verificar movimiento, pausa y reanudación.
- Puntos de prueba: «Mel ante el consejo de las Órdenes», «El pasaje de Mel» y «La invitación al Bastión».
- La revisión visual en navegador local no estuvo disponible en esta sesión: el navegador remoto no puede alcanzar el servidor de desarrollo local.
