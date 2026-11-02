# Edificios sustituidos por santuarios

La revisión manual de Jaime `bb4c49d` sustituye estos edificios por santuarios de Soraka. No reservar interiores, puertas, habitantes ni objetivos futuros para estas entradas eliminadas.

| Mapa | Edificio retirado | Antigua huella en tiles | Uso actual |
| --- | --- | --- | --- |
| NO05 Capital exterior | Casas de la plaza | x=32, y=75, 7 × 4 | Santuario de Soraka de la plaza occidental |
| NO09 Delverhold | Alojamiento del capitán | x=36, y=17, 7 × 4 | Santuario de Soraka de la guarnición |

Los dos edificios eran módulos `casa_doble`. Se retiran sus puntos de `DesignNotes` y sus entradas de `manifest.maps[].landmarks`; `retiredBuildings` conserva este registro histórico. El resto de edificios y el interior existente del Bastión siguen disponibles para la planificación.

Las posiciones vigentes de curación y reserva proceden de los objetos `Interactions` y `Zones` movidos por Jaime. Se reflejan en `manifest.json` y `src/data/world/regions/noxus/sanctuaries.json`. Los puntos de recuperación antiguos se recolocan al cargar la partida y antes de recuperar una derrota, conservando el resto del progreso.

Las piezas residuales del atlas del santuario en sus ubicaciones anteriores se eliminan para evitar fragmentos visuales y bloqueos transparentes. Se conserva el santuario completo en cada ubicación manual nueva.
