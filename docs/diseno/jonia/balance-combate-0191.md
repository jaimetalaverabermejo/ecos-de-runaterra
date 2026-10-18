# Pruebas de combate — 0.19.1

## Equipo de bosses

Sin modificar sus maestrías, entrenadores normales, recompensas ni capturas. Se usan las ranuras normales (una antes de maestría 10, dos hasta 19). Kennen conserva su configuración anterior.

| Boss | Equipo |
| --- | --- |
| Gnar | Cristal de rubí |
| Lee Sin | Bacteriófago, Chaleco de espinas |
| Jhin | Bacteriófago, Fervor |
| Ivern | Eco de Luden, Bacteriófago |
| Xayah | Bacteriófago, Filoveloz de Navori |
| Rakan | Eco de Luden, Bacteriófago |
| Irelia | Bacteriófago, Filoveloz de Navori |

A maestría 16, Xayah pasa de 167 a 217 de vida, 46 a 58 de ataque y 24 a 43 de velocidad. Rakan pasa de 198 a 248 de vida, 13 a 25 de ataque y 29 a 63 de poder. Es una primera corrección verificable de potencia e iniciativa, no una garantía de dificultad idéntica frente a todas las composiciones o estrategias.

## Lulu

Crecimiento salvaje conserva su efecto de tres turnos. Su enfriamiento explícito es de seis turnos desde el lanzamiento; ya no permite enlazar dos crecimientos sin un intervalo real fuera de la mejora. El mismo dato alimenta disponibilidad, IA y etiquetas de CD. Las pruebas cubren dos ciclos de aplicación y expiración con los órdenes de actualización de combates individuales y dobles.

## Clon de Wukong

Los paquetes de daño cuyo objetivo de daño es «todos los enemigos» o «todos» alcanzan al original por su valor completo y dañan también al clon. El clon puede ser destruido, pero no resta ese daño del original. Se conservan los escudos personales y las defensas normales del original.

Los golpes individuales y los rebotes dirigidos siguen usando la intercepción anterior. El daño colateral de una colisión secundaria se considera área. La protección de Margarita no cambia. Los mensajes distinguen recibir daño en área de interceptar un golpe.

## Regresión

`scripts/check-combat-playtest.mjs` usa la fábrica real de rivales, los motores reales de estadísticas, estados y cadencia, y los bloques de paquetes de daño de BattleScene y DoubleBattleScene. Comprueba estadísticas equipadas y vida inicial, dos ciclos de la R, área frente a objetivo individual, destrucción del clon, múltiples impactos y conservación de la protección de Margarita. Se ejecuta en cada build.

Las partidas y victorias anteriores se conservan. Los nuevos equipos se generan al iniciar un nuevo combate contra el boss; no se reinician misiones para forzar revancha.
