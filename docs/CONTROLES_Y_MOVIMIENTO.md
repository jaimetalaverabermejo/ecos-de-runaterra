# Mando USB y movimiento del protagonista

## Configuración

Conectar el mando por USB, abrir Configurar mando en la portada o el menú de exploración y pulsar un botón físico para que el navegador lo detecte. Configurar botones solicita arriba, abajo, izquierda, derecha, confirmar/interactuar, volver/correr y menú. Puede usarse la cruceta o el stick para asignar las direcciones. No se supone que las letras de un clon Switch coincidan con los índices que transmite.

El perfil se guarda por dispositivo y tipo de mapping en el navegador, separado de las partidas. Se pueden restablecer los ajustes. Mandos con mapping estándar tienen defaults; los genéricos requieren configuración para evitar interpretar ejes desconocidos como movimiento. Lectura con navigator.getGamepads, zona muerta, acciones por pulsación, repetición de dirección, suspensión durante configuración y liberación al desconectar o perder el foco. Los botones no atendidos caducan con el frame y no pasan a otra escena.

Fuente técnica: [Using the Gamepad API, MDN](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API).

## Corrección visual

La cámara seguía el cuerpo físico mientras el dibujo redondeado del protagonista se actualizaba antes de que Arcade terminase de aplicar el movimiento. Se midió una oscilación horizontal de aproximadamente 5,6 píxeles de canvas y un retraso de hasta 2 píxeles entre el cuerpo y el sprite.

Ahora se sincroniza el dibujo tras POST_UPDATE y la cámara sigue un punto redondeado en el suelo, actualizado en el mismo momento. En el mismo recorrido la oscilación y el retraso medidos son 0. Se conserva el tamaño 52 y la animación original. El arco de salto se aplica al dibujo; la cámara sigue el suelo para no acompañar el salto vertical.

## Validación

- Pruebas automáticas de mando estándar, genérico, botones intercambiados, ejes analógicos, cruceta tipo hat, diagonales, zona muerta, pulsación/repetición, desconexión, almacenamiento y restablecimiento.
- Navegador con API de mando simulada: asistente de7 pasos, perfil tras recargar, caminar, abrir/cerrar menú, entrar por una puerta, cancelar bolsa y seleccionar un ataque de combate. Se evita filtrar el botón de menú no atendido entre escenas.
- Recorrido central real con teclado: cientos de frames medidos, desfase0 y oscilación0. El salto de desnivel conserva su arco y finaliza.
- No se ha probado el mando físico del usuario. Su detección depende de que el sistema y el navegador expongan el dispositivo.

En Windows, `Win + R` → `joy.cpl` permite comprobar si el sistema reconoce el mando. El modo PC y su combinación de botones dependen del modelo; no se inventa una combinación para mandos genéricos.
