# Ecos de Runaterra — Especificaciones de assets

Estas rutas y nombres se consideran estables. Si se reemplaza un archivo manteniendo exactamente el mismo nombre, los sprites actuales se cargarán sin cambiar TypeScript.

## Sprites overworld

### Garen
Ruta: `public/assets/sprites/garen-world.png`

- Formato: PNG con transparencia real.
- Tamaño total: 144 x 192 px.
- Estructura: 3 columnas x 4 filas.
- Tamaño por frame: 48 x 48 px.
- Fila 1: abajo.
- Fila 2: arriba.
- Fila 3: izquierda.
- Fila 4: derecha.
- 3 frames por dirección: paso A / reposo / paso B.
- Los pies deben descansar en la misma línea Y en los 12 frames.
- El personaje debe ocupar aproximadamente el mismo alto y ancho visual en las cuatro direcciones.
- Sin antialias, blur, sombras externas ni márgenes blancos.
- No ampliar una ilustración grande y reducirla al final: dibujar/corregir el pixel art a resolución de frame.

## Sprites de combate

### Garen espalda
Ruta: `public/assets/sprites/garen-battle-back.png`

### Teemo frente
Ruta: `public/assets/sprites/teemo-battle-front.png`

Para ambos:

- Formato: PNG con transparencia real.
- Canvas recomendado: 192 x 192 px.
- Personaje centrado horizontalmente.
- Pies/base alineados cerca de Y=184, dejando unos 8 px de margen inferior.
- No recortar espada, sombrero, capa u otras siluetas.
- Sin fondo blanco.
- Pixel art nativo, sin suavizado.

## Fondo overworld de Bandle

Ruta objetivo: `public/assets/maps/bandle-overworld.png`

- Formato: PNG.
- Tamaño exacto: 1024 x 768 px.
- Relación 4:3.
- Debe coincidir 1:1 con el mundo lógico actual; no entregar 2048 px para reducir después.
- La hierba de encuentros, portal, caminos y obstáculos deben estar ya colocados en su posición final aproximada.
- Más adelante este fondo se sustituirá por tiles de 32 x 32 en Tiled.

## Fondo de combate de Bandle

Ruta objetivo: `public/assets/battles/bandle-battle.png`

- Formato: PNG.
- Tamaño exacto: 512 x 288 px.
- Relación 16:9.
- Sin personajes, barras de vida, textos ni botones incrustados.
- Zona inferior aproximada (Y 195-288) visualmente más limpia, porque encima aparecerán mensajes y acciones.
- Plataformas/suelo visual del jugador alrededor de X 55-180, Y 140-195.
- Plataforma/suelo del rival alrededor de X 350-470, Y 90-145.
- Pixel art nativo a 512 x 288, sin reescalado posterior.

## Convención futura por campeón

Mientras la vertical slice sólo use Garen y Teemo, mantenemos nombres simples. Cuando incorporemos más campeones, pasaremos a:

`public/assets/champions/<champion-id>/overworld.png`
`public/assets/champions/<champion-id>/battle-front.png`
`public/assets/champions/<champion-id>/battle-back.png`

Así el registro de campeones podrá resolver los assets por datos en lugar de hardcodearlos por personaje.
