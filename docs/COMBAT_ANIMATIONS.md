# Animaciones de combate

El juego usa perfiles explícitos para las 146 habilidades activas y perfiles de activación para sus 33 definiciones pasivas. Los 32 campeones tienen además un perfil de ataque básico. Las pasivas sin efectos jugables siguen sin inventar mecánicas; los eventos de curación, escudo, marcas y recursos proporcionan su feedback cuando se activan.

## Recursos y familias

`src/ui/combat/skill-animation-profiles.json` asigna familia y estilo de arma por ID. `CombatAnimationProfiles.ts` añade paletas, variantes, receptor de apoyo y perfiles de básicos. `CombatAnimationPlayer.ts` produce efectos gráficos y movimientos usando los sprites existentes: no introduce imágenes remotas ni cambia el balance. Esta versión reutiliza las poses actuales; no añade sprites corporales dibujados para cada ataque.

| Familia | Efecto |
|---|---|
| P1–P3 | Proyectil material, disparo, orbe mágico |
| P4–P6 | Haz/conos, contacto con puño/bastón/martillo, cortes |
| P7–P9 | Desplazamientos, saltos/caídas, barridos/giro |
| P10–P14 | Bombas/hongos, caída vertical, campos, vínculos, salvas |
| S1–S5 | Curación, protección, potenciación, invocación, transformación |

Los perfiles de variantes de Kayn, Mantra, Mega Gnar y reactivaciones de Lee Sin son independientes. Ahri representa el retorno cuando el motor consume el daño diferido. Xayah E usa trayectoria inversa; Jhin R anima una secuencia en individual y un disparo por paquete real en dobles. Mantra y otras acciones previas también tienen presentación propia. Las salvas pueden usar varios proyectiles decorativos para un solo impacto resuelto; no añaden daño.

## Integración y limpieza

Ambas escenas usan el mismo reproductor. Un ataque de área comparte preparación y reparte efectos entre receptores únicos. En individual, un apoyo dirigido a aliados se muestra sobre el propio actor; en dobles utiliza los receptores aliados de la resolución. Las animaciones terminan su fase de ataque en el contacto final para que la aplicación de daño coincida con el impacto. La vuelta a la posición inicial y disipación duran después hasta 160 ms y pueden cancelarse al salir de la escena. La recuperación no sobrescribe la escala de una forma nueva.

`CombatStatusVisuals.ts` dibuja efectos persistentes a partir de los estados vigentes: escudos, raíces, control, sueño, enamoramiento, veneno, quemadura, marcas explosivas y trampas. Desaparecen al retirarse el estado, destruirse el personaje o cerrarse la escena. Los indicadores existentes conservan contadores y duraciones.

Los sonidos de impacto son sintéticos y breves; respetan volumen y silencio de Phaser y solo funcionan si el navegador ha activado el contexto de audio. La preferencia del sistema de movimiento reducido evita desplazamientos amplios, saltos e invisibilidad del atacante. Los cambios de vida, cooldowns, probabilidades, objetivos y condiciones siguen siendo responsabilidad del motor existente.

## Validación y ampliación

`npm run check:animations` comprueba que todas las definiciones tengan perfil, dueño y ranura correctos, familias válidas y básicos para todos los campeones. La compilación ejecuta esta comprobación automáticamente. Al añadir un movimiento hay que añadir su perfil al JSON.

La revisión en navegador recorre todas las habilidades activas y todos los básicos, comprueba retorno a las anclas, cancelación, limpieza y preservación de escala. Los escenarios de integración incluyen orbe/retorno de Ahri, Mantra, escudos propios y aliados, Gnar, ataques de área dobles y los cuatro paquetes de Jhin. También se revisan capturas de disparos, contacto, cortes, impactos verticales y protección.

Para feedback visual, probar primero Teemo, Sett, Garen, Ahri, Karma, Jhin y Gnar en Showdown; esperar los turnos necesarios para que estén disponibles las definitivas. Comprobar también al menos un combate doble.
