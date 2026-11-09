# Ecos de Runaterra — Demacia: respaldo de diseño (9 noviembre 2026)

> Respaldo de conversación, **no** prueba de implementación. Algunos kits siguen pendientes de verificación con archivos originales. No sobrescribir habilidades existentes sin revisar.

## Reglas generales
- Q/W/E: enfriamiento de un turno. R normalmente tres; no utilizable en turno uno.
- Clasificar habilidades ofensivas como cuerpo a cuerpo o larga distancia; no crear categoría separada de proyectiles.
- Validar valores y efectos en combates dobles antes de implementar.

## Campeones
- **Garen:** creado previamente; verificar ficha existente.
- **Poppy:** ya implementada en Bandle por ser yordle; origen Demacia. No rediseñar.
- **Fiora:** diseño avanzado; verificar cifras y kit final.
- **Galio:** Primordial/Rúnico, arquetipo Regirock; estadísticas de diseño Vida 145, Ataque 13, Poder 12, Defensa 9, Resistencia 28, Velocidad 6. Verificar habilidades finales.
- **Jarvan IV:** arquetipo Escavalier; pasiva con daño extra en primer golpe, interacción bandera E + Q, R Cataclismo. Estadísticas pendientes.
- **Lux:** arquetipo Xatu, tipo Arcano con R Celestial. Pasiva Iluminación: marca no acumulable que aumenta un 20% el daño del siguiente ataque ofensivo recibido y se consume; R también la consume. Q Arcano: daño ligero y aturdimiento 1 turno. W Arcano: escudo propio o aliado. E Arcano: daño moderado en área. R Celestial: daño fuerte en área. Estadísticas/potencias por afinar.
- **Kayle:** pasiva: cada Q acertada añade +7% daño ofensivo, máximo 3 cargas durante combate. Q evoluciona a área y quemadura. W evoluciona para curar aliado. E aumenta daño con vida faltante del enemigo. R invulnerabilidad 1 turno a ella o aliado y daño en área. Base: Vida 85, Ataque 9, Poder 24, Defensa 7, Resistencia 10, Velocidad 15. Curva de nivel pendiente.
- **Morgana:** Sombrío/Celestial. Q Sombrío: aturdimiento. W Sombrío: charco en área, primer pulso potencia 10 y precisión 100%; segundo pulso siguiente turno potencia 18, precisión 60%, o 100% si el objetivo está aturdido/inmovilizado; no apila charcos. E Celestial: escudo negro bloquea una habilidad completa a un objetivo. R Sombrío: inmoviliza ambos enemigos y da escudo pequeño al equipo. Pasiva por verificar.
- **Lucian:** Marcial/Espiritual. Pasiva: tras habilidad, siguiente ataque ofensivo tiene segundo disparo al 50% de daño. Q Marcial: área. W Espiritual: ataque individual prioritario. E Marcial: +40% evasión y +20% velocidad 1 turno. R Espiritual: cinco disparos potencia 12, 80% precisión individual; redirige restantes si cae el objetivo; pierde la siguiente acción.
- **Xin Zhao:** Marcial puro. Pasiva: cura 8% vida máxima por cada tres impactos acertados. Q tres impactos potencia 12, precisión individual 75%; levanta si acierta los tres. W área potencia 22; cada enemigo golpeado cuenta para la pasiva. E prioridad +1, potencia 18, reduce velocidad 10%. R área potencia 30 e inmunidad a ataques de larga distancia 1 turno.
- **Quinn:** NO CERRADA. Valor se representa con habilidades/animaciones, sin entidad separada ni transformación inicial. Propuesta no validada: Marcial puro, pasiva Acoso con marcas de Valor y daño adicional al consumirlas.
- **Vayne y Sona:** pendientes.
- **Shyvana y Sylas:** reservados para el final por complejidad.

## Próxima sesión
Retomar Quinn. Verificar contra originales Fiora, Galio, Jarvan y los kits ya implementados. No dar por subidos al juego estos diseños hasta comprobar el repositorio.


## Ampliación de la sesión del 9 de noviembre — Quinn, Vayne y Locke

> Estado: **diseño conversacional**, no implementación ni balance validado. Las potencias y estadísticas indicadas como propuestas requieren contrastarse con las fichas reales del motor. Esta sección actualiza las notas anteriores: Quinn ya tiene kit conceptual; Vayne ya no está pendiente. Sona sigue pendiente. No confundir Locke con Sylas.

### Quinn — kit conceptual acordado
- Tipo Marcial puro. Valor aparece en animaciones y habilidades, sin unidad ni transformación independiente.
- Pasiva **Acoso**: Valor marca un enemigo; el siguiente impacto de Quinn consume la marca para +25% de daño.
- Q **Asalto cegador**: daño moderado, reduce precisión enemiga 1 turno. CD 1 turno.
- W **Sentidos aguzados**: +30% evasión y +15% ataque durante 2 turnos, sin acumulación; si evade un ataque, marca al atacante. CD 1 turno (revisar solapamiento/duración en motor).
- E **Acoso y derribo**: prioridad +1, daño ligero, reduce velocidad y aplica marca. CD 1 turno.
- R **Tras las líneas enemigas**: ataque aéreo en área de Valor, daño fuerte, aplica marca a cada objetivo. CD 3 turnos, no turno 1.
- Perfil: muy rápida, ofensiva física, frágil. Cifras antiguas basadas en escala Pokémon NO aprobadas.

### Vayne — kit conceptual acordado
- Tipo Marcial/Tecnológico. Ataque físico alto, gran velocidad, vida/defensas bajas; cazadora de tanques.
- Pasiva **Proyectiles de Plata**: cada impacto ofensivo acertado aplica una marca al enemigo; al tercer impacto sobre ese mismo objetivo consume tres y causa daño adicional del 10% de la vida máxima del objetivo. Fallos no cuentan; marcas por enemigo; tope contra jefes por definir.
- Q **Voltereta**: Marcial, larga distancia, potencia propuesta 25, precisión 100%, +25% evasión 1 turno. CD 1 turno. Cuenta para pasiva.
- W **Ataque básico**: Tecnológico, larga distancia, potencia propuesta 20, precisión 100%, **CD 0 excepcional y expresamente acordado**, sustituye autoataques que no existen en el juego. Cuenta para pasiva.
- E **Condena**: Tecnológico, larga distancia, potencia propuesta 20, precisión 95%, 30% de aturdir 1 turno, cuenta para pasiva. CD 1 turno.
- R **Hora final**: activación consume turno; **dos turnos posteriores de efecto** con +25% ataque ambos. Primer turno invisible durante TODO el turno, incluso si ataca (no seleccionable por ataques directos; sí recibe áreas). Segundo turno sin invisibilidad y +30% evasión. CD 3 turnos **empieza tras finalizar** el efecto, nunca en turno 1. Evitar contar cooldown desde activación.
- No añadir pasiva Cazadora nocturna: fue propuesta y descartada a favor de Proyectiles de Plata.
- Balance: Quinn más rápida; Lucian más daño inmediato; Vayne mejor contra tanques.

### Locke — kit conceptual acordado y números propuestos
- Nombre indicado explícitamente por usuario: **Locke**, no Sylas. Tipo propuesto Arcano/Sombrío. Asesino mágico muy frágil, ataque especial altísimo, velocidad alta pero inferior a Quinn/Vayne.
- Pasiva: **mecánica de marcas** central. Cada impacto de Q aplica 1 marca hasta 3 por enemigo; E consume marcas. No mantener propuesta anterior de +10/20% de daño universal.
- Q **Clavos rituales**: tres golpes independientes, **75% precisión cada uno** (probabilidad de acertar los tres ~42,2%); cada golpe aplica 1 marca y reduce velocidad enemiga 10% durante 1 turno, hasta -30%. Propuesta de potencia **9 por golpe** (27 si todos aciertan, antes de modificadores), tipo Arcano, larga distancia; CD 1 turno. Determinar duración de marcas y acumulación de ralentización entre turnos en QA.
- W **Ignición de alma**: defensa con prioridad +1, durante ese turno recibe daño y **al final recupera 60% del daño recibido** (propuesta); si cae antes de recuperarse, no revive ni se cura. No se acordó autodaño al activar; se prefirió absorción/recuperación. CD 1 turno. Determinar si curación se limita a vida máxima y cómo interactúa con escudos.
- E **Afán ceniciento**: Sombrío, ataque a objetivo, **potencia base propuesta 30**, +20% de daño de la propia E por cada marca consumida, hasta +60% (potencia equivalente 48 con 3); puede detonar 1, 2 o 3 marcas, consume las existentes. CD 1 turno. Precisión propuesta 100%, pendiente validación.
- R **Purgatorio**: Sombrío, área, **potencia propuesta 38**, ralentiza 20% 1 turno y ejecuta objetivos que queden por debajo de **15% de vida máxima tras recibir el daño**. **No detona ni consume marcas; las conserva para la E posterior**. CD 3 turnos, no disponible turno 1. Precisión propuesta 95%, pendiente validación. Revisar ejecución simultánea en dobles y protección contra ejecuciones de jefes.
- La fragilidad extrema es la contrapartida explícita del daño alto; W no debe permitir supervivencia automática.

### Propuesta de estadísticas base comparables — NO APROBADAS NI CONTRASTADAS
Valores tentativos en la escala que aparece en la ficha de Kayle (Vida 85, Ataque 9, Poder 24, Defensa 7, Resistencia 10, Velocidad 15) y Galio (Vida 145, Ataque 13, Poder 12, Defensa 9, Resistencia 28, Velocidad 6). **No equivalen a estadísticas Pokémon** y requieren contrastarse con el código real, fórmula de daño y campeones existentes.

| Campeón | Vida | Ataque | Poder | Defensa | Resistencia | Velocidad | Estado |
|---|---:|---:|---:|---:|---:|---:|---|
| Quinn | 82 | 25 | 5 | 7 | 7 | 27 | Propuesta |
| Lucian | 88 | 27 | 8 | 8 | 8 | 23 | Propuesta |
| Vayne | 78 | 26 | 5 | 6 | 6 | 25 | Propuesta |
| Locke | 75 | 9 | 29 | 5 | 6 | 22 | Propuesta |

**Comprobaciones antes de implementar:** revisar datos reales de campeones y fórmulas; comprobar que Quinn > Vayne > Lucian > Locke en velocidad según lo acordado (Locke solo confirmado por debajo de Quinn y Vayne); verificar impacto de la W de Vayne sin CD, acumulación y caducidad de marcas, reducción de velocidad en dobles, protección de invisibilidad frente a ataques en área, W de Locke con prioridad y curación al final del turno, y R con ejecución en área. No modificar código de combate ni marcar estos números como finales sin QA.

### Pendientes de Demacia
- **Sona**: pendiente según respaldo anterior, revisar si se diseñó en otro hilo antes de afirmar que falta.
- **Shyvana y Sylas**: reservados para el final.
- Validar Fiora, Galio, Jarvan IV y fichas existentes; revisar cifras propuestas y completar balance regional.
