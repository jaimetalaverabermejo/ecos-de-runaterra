# Ecos de Runaterra — Especificaciones de assets

## Convención principal

Cada campeón tiene su propia carpeta estable:

`public/assets/champions/<champion-id>/`

Ejemplos actuales:

`public/assets/champions/garen/`
`public/assets/champions/teemo/`

La idea es que el nombre de carpeta coincida siempre con el `id` del campeón en los datos. Así podremos escalar a ~170 campeones sin mezclar miles de archivos en una sola carpeta.

## Estructura recomendada por campeón

```text
public/assets/champions/<champion-id>/
├── overworld.png
├── battle-front.png
├── battle-back.png
├── portrait.png
├── icons/
└── forms/
```

No todos los archivos son obligatorios desde el principio. Sólo se añaden cuando el campeón los necesita.

## Garen — overworld

Ruta definitiva: `public/assets/champions/garen/overworld.png`

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
- Sin antialias, blur, sombras externas ni fondo blanco.
- Dibujar/corregir el pixel art a resolución de frame; evitar reducir una ilustración grande al final.

## Sprites de combate

### Garen espalda
Ruta definitiva: `public/assets/champions/garen/battle-back.png`

### Garen frente
Ruta futura: `public/assets/champions/garen/battle-front.png`

### Teemo frente
Ruta definitiva: `public/assets/champions/teemo/battle-front.png`

### Teemo espalda
Ruta futura: `public/assets/champions/teemo/battle-back.png`

Para los sprites de combate:

- Formato: PNG con transparencia real.
- Canvas recomendado: 192 x 192 px.
- Personaje centrado horizontalmente.
- Pies/base cerca de Y=184, dejando unos 8 px de margen inferior.
- No recortar espada, sombrero, capa u otras siluetas.
- Sin fondo blanco.
- Pixel art nativo, sin suavizado.

## Portraits

Ruta: `public/assets/champions/<champion-id>/portrait.png`

- PNG transparente o con fondo diseñado.
- Recomendado: 128 x 128 px.
- Uso futuro: equipo, inventario, Vínculo, selección de campeón y diálogos.

## Iconos de habilidades

Ruta recomendada:

`public/assets/champions/<champion-id>/icons/<skill-id>.png`

- PNG.
- Recomendado: 48 x 48 px o 64 x 64 px.
- Mantener el `skill-id` igual al id del JSON de la habilidad.

## Formas / skins

Ruta futura:

`public/assets/champions/<champion-id>/forms/<form-id>/`

Dentro se podrán repetir `overworld.png`, `battle-front.png`, `battle-back.png`, etc.

## Fondo overworld de Bandle

Ruta objetivo: `public/assets/maps/bandle-overworld.png`

- Formato: PNG.
- Tamaño exacto: 1024 x 768 px.
- Relación 4:3.
- Debe coincidir 1:1 con el mundo lógico actual.
- No entregar una imagen mayor para reducirla después.
- La hierba de encuentros, portal, caminos y obstáculos deben aparecer ya en su posición final aproximada.
- Más adelante se sustituirá por tiles de 32 x 32 en Tiled.

## Fondo de combate de Bandle

Ruta objetivo: `public/assets/battles/bandle-battle.png`

- Formato: PNG.
- Tamaño exacto: 512 x 288 px.
- Relación 16:9.
- Sin personajes, barras, textos ni botones incrustados.
- Zona inferior aproximada Y=195-288 relativamente limpia para mensajes y acciones.
- Zona del jugador: aproximadamente X=55-180, Y=140-195.
- Zona rival: aproximadamente X=350-470, Y=90-145.
- Pixel art nativo a 512 x 288, sin reescalado posterior.

## Estado actual de la v4.1.1

La estructura por campeón ya existe en el repositorio, pero el overworld de Garen sigue usando temporalmente el asset embebido conocido como estable para evitar otra regresión mientras se prepara el PNG definitivo.

En cuanto exista `public/assets/champions/garen/overworld.png` con las especificaciones anteriores, cambiaremos el loader a esa ruta y desde ese momento bastará con sustituir el archivo para actualizar el arte sin tocar código.
