# Demacia en Showdown

Fiora, Galio, Jarvan IV, Lux, Kayle, Morgana, Lucian, Xin Zhao, Quinn, Vayne, Locke, Sona, Shyvana y Sylas tienen fichas de combate y sprites. Showdown los incluye en individuales y dobles. Garen y Poppy siguen usando sus fichas existentes.

## Valores de prueba

- Los valores pendientes de potencia, crecimiento y afinidad se han completado para el prototipo jugable. Las bases de Galio y Kayle salen del respaldo. Las de Lucian, Quinn, Vayne y Locke conservan los valores provisionales de las notas.
- Kayle amplía W a un aliado desde M12 y obtiene Q en área con Quemadura desde M16. Iluminación se aplica con Q y E de Lux. La cura de Sona prioriza al compañero activo con menos porcentaje de Vida y usa a Sona como alternativa cuando combate sola.
- Miedo impide acciones ofensivas durante el siguiente turno de la víctima. Permite acciones defensivas. Cataclismo restringe los objetivos de ambos combatientes desde la activación hasta el cierre de la siguiente ronda. Los ataques a distancia de Demacia llevan alcance explícito. Para habilidades anteriores, Xin Zhao usa la familia de animación como criterio provisional.
- Vayne aplica daño de Vida máxima con un tope provisional de 150% de su Ataque. La política definitiva para jefes sigue pendiente. Locke R protege de la ejecución a los duelos individuales identificados como jefes. El saldo de W registra daño efectivo de ataques y de efectos periódicos procesados por el motor de ronda. La cobertura de otras fuentes de daño requiere QA.
- Sifón de alma cura el 25% del daño efectivo del segundo pulso de W a rivales controlados, con un tope conjunto del 6% de Vida máxima. Cuenta el Aturdimiento o la Inmovilización que el rival haya tenido durante la ronda del segundo pulso, aunque se agoten al actuar antes del cierre.
- Sylas toma los efectos declarativos de la R del objetivo. Shyvana y Gnar tienen selección específica. La forma prestada conserva las habilidades y el Ataque/Poder de Sylas. Gnar usa la R de Mega Gnar sin transformación, con una animación de empujón contra el muro. Apropiación exige un rival con otra definitiva y excluye a Sylas del selector. Las definitivas que dependen de lógica exclusiva de su campeón, como invocaciones, recasts o acumulaciones, requieren una adaptación específica.

## Pruebas

`npm run check:champion-kits` cubre registro, preparación de definitivas y resolución real de habilidades con los renderizadores simulados. Incluye la furia de Shyvana en individuales y dobles, Miedo, Escudo negro contra dos impactos, evasión de Sylas al fallar, forma prestada, redirección de Lucian, invisibilidad de Vayne y selección aliada con área enemiga de Kayle. El balance y el aspecto de los sprites requieren partidas de prueba.
