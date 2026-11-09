# Demacia — cierre de diseños (9 noviembre 2026)

> NOTA DE DISEÑO PARA IMPLEMENTACIÓN FUTURA. No se han implementado kits ni validado balance en el motor. Complementa `docs/diseno/demacia-respaldo-2026-11-09.md`; las entradas antiguas que dicen «pendiente» para Sona, Shyvana y Sylas quedan actualizadas por esta nota.

## Reglas compartidas
- Q/W/E CD 1 turno, salvo excepciones explícitas documentadas; R generalmente CD 3 turnos y bloqueada turno 1.
- Las potencias, porcentajes y estadísticas deben contrastarse con la fórmula de daño real, interacciones en dobles y campeones existentes antes de implementar.
- Estado **Miedo**: nuevo estado por implementar, distinto de Aturdimiento; propuesta: impide acciones ofensivas durante 1 turno, permite defensivas. Revisar definición definitiva.
- Estado **levantamiento por los aires**: reutilizar mecánica de otros campeones (p. ej. Ambessa), sin confundir con aturdimiento.

## Sona — diseño acordado
- Tipo Arcano/Espiritual. Apoyo inspirado en Blissey, pero menos vida; ataque y defensa física bajos, resistencia especial alta, poder moderado y velocidad media-baja.
- Pasiva: después de cada 3 habilidades usadas, cura automáticamente 10% de vida máxima al aliado con menos vida (a sí misma en individuales). Probar reducir a 5% si resulta excesivo.
- Q: daño Arcano moderado.
- W: cura y otorga escudo.
- E: mejora ataque y velocidad de aliado durante 2 turnos; no acumula.
- R: daño en área y aturdimiento 1 turno; CD 3, no turno 1.
- Q/W/E CD 1. Viable en individual, sobresale en dobles. Potencias y cifras finales pendientes.

## Shyvana — diseño acordado
- Tipo Primordial/Rúnico, tanto humana como dragón. Barra de furia de 0 a 100.
- Cada impacto acertado **por objetivo** con Q/W/E genera 25 furia; fallos no generan.
- Q: doble mordisco, dos golpes independientes de 85% precisión; hasta 50 furia si aciertan ambos.
- W: fuego alrededor, ataque en área; puede generar 50 furia si golpea a dos rivales.
- E: aliento de fuego, individual en humana, en área en dragón; quemadura 30% humana / 50% dragón.
- R: requiere 100 furia; **consume turno**; salto con daño moderado y Miedo 1 turno; transforma en dragón durante **3 turnos contando el de activación**, por tanto solo **2 acciones posteriores** potenciadas. Forma dragón: Q/W/E mejoradas, más supervivencia y daño. No genera furia mientras está transformada; furia vuelve a 0 al terminar. Sin CD convencional adicional: limita la furia. Q/W/E CD 1.
- Furia de W/E en dobles se cuenta por enemigo impactado. Afinar magnitud de bonificaciones, daño y stats en QA.

## Sylas — diseño acordado
- Tipo Arcano/Marcial; luchador mágico agresivo, relativamente frágil; ataque físico bajo, poder alto, velocidad media-alta, vida media, defensas moderadas; curación W sostiene su supervivencia. Referencia conceptual Gallade, **no usar stats Pokémon**.
- **Q Latigazo de cadenas:** una activación y un turno, dos golpes independientes: primero potencia 12, precisión 100%, ralentiza velocidad 15% durante 1 turno; segundo potencia 18, precisión 85%. CD 1.
- **W Matarreyes:** potencia 20 mágica, precisión 100%, cura 30% del daño infligido; si Sylas está por debajo de 50% de vida, cura 60% del daño. CD 1. La curación se calcula según daño, no según vida máxima.
- **E Fuga y Abducción:** una sola activación y un impacto de cadenas, **sin daño directo**; precisión 80%; si impacta, aplica levantamiento por los aires **garantizado (100%) durante 1 turno**. +20% evasión en turno de uso incluso si falla. Sin prioridad, CD 1. Es su habilidad de control.
- **Pasiva Ráfaga de petricita:** tras acertar Q, W o E, giro automático de cadenas con daño mágico adicional **potencia 8**, sin gastar turno. En individuales golpea al objetivo; en dobles alcanza ambos enemigos. No aplica CC, no se reactiva a sí misma. **NO se activa con R robada**. En Q, confirmar en implementación que solo se procese una vez por activación, no una vez por cada golpe.
- **R Apropiación:** roba y **ejecuta en ese mismo turno** la R del enemigo seleccionado (también seleccionable en dobles), independientemente de si el enemigo tiene su R disponible. Usa estadísticas de Sylas; CD 3 y no disponible turno 1. Requiere adaptadores específicos para ultimates especiales.
- Robo R Shyvana: salto, daño mágico, Miedo y forma dragón durante los 2 turnos siguientes a la activación; **mantiene sus Q/W/E originales sin potenciar y su ataque/poder originales**, solo recibe mejora de vida/defensa/resistencia de forma dragón. Preservar proporción de vida al volver a forma normal; comprobar también transformación inicial.
- Robo R Gnar: empujón contra muro, **sin transformación** en Mega Gnar.
- Pendiente: definir tablas de R robadas, cifras finales de estadísticas y reglas de casos límite.

## Otros campeones de Demacia
- Mantener como referencia el archivo de respaldo anterior para Fiora, Galio, Jarvan IV, Lux, Kayle, Morgana, Lucian, Xin Zhao, Quinn, Vayne y Locke, además de Garen y Poppy.
- **Locke es un campeón distinto de Sylas**; no fusionar sus fichas.
- Las estadísticas propuestas para Quinn/Lucian/Vayne/Locke en el respaldo son tentativas, no aprobadas ni implementadas.

## Próximos pasos
1. Verificar archivos originales y fórmulas del motor, evitando sobrescribir kits existentes.
2. Completar estadísticas y potencias pendientes, implementar Miedo y adaptadores de R de Sylas.
3. Implementar habilidades, pasivas, transformaciones y efectos visuales.
4. QA de individuales/dobles: impactos múltiples, furia por objetivo, duración de transformación, curaciones, escudos, evasión, CC, R robadas y enfriamientos.
5. Solo entonces hacer integración definitiva al juego y PR/commit de implementación.
