# Ecos de Runaterra — Especificaciones de assets

## Convención principal

Cada campeón tiene su propia carpeta estable:

`public/assets/champions/<champion-id>/`

Dentro, los assets se separan por función para evitar carpetas planas cuando existan ~170 campeones.

## Estructura por campeón

```text
public/assets/champions/<champion-id>/
├── overworld/
│   └── overworld.png
├── battle/
│   ├── front.png
│   └── back.png
├── ui/
│   ├── portrait.png
│   └── icon.png
├── icons/
│   ├── passive.png
│   ├── q.png
│   ├── w.png
│   ├── e.png
│   └── r.png
├── forms/<form-id>/
└── legacy/
```

`legacy/` sólo se utiliza para conservar temporalmente assets antiguos. El juego no debe apuntar ahí.

## Overworld de campeón

Ruta estándar:

`public/assets/champions/<champion-id>/overworld/overworld.png`

- Formato: PNG con transparencia real.
- Tamaño total: 144 x 192 px.
- Estructura: 3 columnas x 4 filas.
- Tamaño por frame: 48 x 48 px.
- Fila 1: abajo.
- Fila 2: arriba.
- Fila 3: izquierda.
- Fila 4: derecha.
- Columnas: paso A / reposo / paso B.
- Los pies deben descansar en la misma línea Y en los 12 frames.
- El personaje debe ocupar aproximadamente el mismo tamaño visual en las cuatro direcciones.
- Sin antialias, blur ni fondo blanco.
- Trabajar a resolución final; evitar reducir una ilustración grande al terminar.

Ejemplo actual:

`public/assets/champions/garen/overworld/overworld.png`

## Sprites de combate

Rutas estándar:

```text
public/assets/champions/<champion-id>/battle/front.png
public/assets/champions/<champion-id>/battle/back.png
```

- Formato final recomendado: PNG transparente.
- Canvas recomendado: 192 x 192 px.
- Personaje centrado horizontalmente.
- Base/pies cerca de Y=184, dejando unos 8 px inferiores.
- No cortar armas, sombreros, capas u otras partes de la silueta.
- Pixel art nativo, sin suavizado.

Actualmente Garen utiliza temporalmente `battle/back.svg` como placeholder estable hasta sustituirlo por el PNG final.

## Portraits e iconos UI

```text
public/assets/champions/<champion-id>/ui/portrait.png
public/assets/champions/<champion-id>/ui/icon.png
```

Portrait recomendado: 128 x 128 px.

## Iconos de habilidades

```text
public/assets/champions/<champion-id>/icons/passive.png
public/assets/champions/<champion-id>/icons/q.png
public/assets/champions/<champion-id>/icons/w.png
public/assets/champions/<champion-id>/icons/e.png
public/assets/champions/<champion-id>/icons/r.png
```

Recomendado: 48 x 48 px o 64 x 64 px.

## Formas / skins

```text
public/assets/champions/<champion-id>/forms/<form-id>/
```

Dentro se replica la estructura necesaria de `overworld/`, `battle/`, `ui/` e `icons/`.

## Mundo / mapas

Los mapas se organizan por Región → Zona.

```text
public/assets/world/regions/<region-id>/zones/<zone-id>/
├── overworld.png
├── battle-background.png
├── tiles/
├── props/
└── ambience/
```

Zona actual:

`public/assets/world/regions/bandle-city/zones/portal-clearing/`

### Overworld de zona

Ruta actual:

`public/assets/world/regions/bandle-city/zones/portal-clearing/overworld.png`

- PNG.
- 1024 x 768 px exactos para la vertical slice actual.
- Relación 4:3.
- Debe coincidir 1:1 con el mundo lógico.
- No generar más grande para reducir después.
- Hierba, portales, caminos y obstáculos deben estar en posiciones jugables coherentes.

### Fondo de combate de zona

Ruta futura:

`public/assets/world/regions/bandle-city/zones/portal-clearing/battle-background.png`

- PNG.
- 512 x 288 px exactos.
- Sin personajes, barras, textos ni botones incrustados.
- Zona inferior Y≈195–288 relativamente limpia para UI.
- Zona jugador aproximada X=55–180, Y=140–195.
- Zona rival aproximada X=350–470, Y=90–145.

## Objetos

Los iconos siguen la misma jerarquía que los datos:

```text
public/assets/items/
├── components/<family>/<item-id>/icon.png
├── epic/<family>/<item-id>/icon.png
└── legendary/<family>/<item-id>/icon.png
```

Familias recomendadas: `attack`, `power`, `health`, `defense`, `resistance`, `utility`.

## Regla general

No añadir nuevos assets a carpetas genéricas como `sprites/`, `maps/` o `images/`. Cada archivo nuevo debe colocarse desde el principio en la ruta final que le corresponda por dominio, región, zona, campeón, tipo de objeto o función UI.
