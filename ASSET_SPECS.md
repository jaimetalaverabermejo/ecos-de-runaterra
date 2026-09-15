# Ecos de Runaterra — Especificaciones de assets v14

## Convención principal de campeones

Desde v14 los assets específicos de un campeón viven junto a sus datos:

```text
src/contenido/campeones/<campeon-id>/
```

El cargador utiliza convenciones de nombre. Si el archivo aparece en la ruta correcta, se descubre automáticamente durante el build y no necesita un import manual.

## Estructura visual por campeón

```text
src/contenido/campeones/<campeon-id>/
├── overworld.png
├── retrato.png
├── icono.png                 # opcional
├── combate/
│   ├── frente.png
│   └── espalda.png
└── formas/
    └── <forma-id>/
        ├── overworld.png
        ├── retrato.png
        ├── icono.png
        └── combate/
            ├── frente.png
            └── espalda.png
```

No volver a crear una segunda carpeta de assets del mismo campeón bajo `public/assets/champions/`.

## Texture keys automáticas

Para la forma base:

```text
<campeon-id>-overworld
<campeon-id>-battle-front
<campeon-id>-battle-back
<campeon-id>-portrait
<campeon-id>-icon
```

Para una forma:

```text
<campeon-id>-form-<forma-id>-overworld
<campeon-id>-form-<forma-id>-battle-front
<campeon-id>-form-<forma-id>-battle-back
<campeon-id>-form-<forma-id>-portrait
<campeon-id>-form-<forma-id>-icon
```

Ejemplo:

```text
src/contenido/campeones/nidalee/overworld.png
→ nidalee-overworld

src/contenido/campeones/gnar/formas/mega-gnar/combate/frente.png
→ gnar-form-mega-gnar-battle-front
```

## Overworld de campeón

Ruta estándar:

```text
src/contenido/campeones/<campeon-id>/overworld.png
```

- PNG con transparencia real.
- Tamaño total: **144 × 192 px**.
- Cuadrícula: **3 columnas × 4 filas**.
- Frame: **48 × 48 px**.
- Fila 1: abajo.
- Fila 2: arriba.
- Fila 3: izquierda.
- Fila 4: derecha.
- Columnas: paso A / reposo / paso B.
- Pies alineados en la misma Y en los 12 frames.
- Misma escala visual y centrado entre direcciones.
- Sin antialiasing, blur ni fondo blanco.
- Trabajar a resolución final.

**No cambiar el estándar a 64×64 sin una decisión expresa.**

## Sprites de combate

Rutas estándar:

```text
src/contenido/campeones/<campeon-id>/combate/frente.png
src/contenido/campeones/<campeon-id>/combate/espalda.png
```

- PNG transparente.
- Canvas recomendado: 192 × 192 px.
- Personaje centrado horizontalmente.
- Base/pies cerca de Y=184, dejando aproximadamente 8 px inferiores.
- No cortar armas, sombreros, capas ni otras partes de la silueta.
- Pixel art nativo y sin suavizado.

## Retrato e icono

```text
src/contenido/campeones/<campeon-id>/retrato.png
src/contenido/campeones/<campeon-id>/icono.png
```

Retrato recomendado: 128 × 128 px.

`icono.png` es opcional mientras no exista una necesidad UI concreta.

## Formas

Las formas replican sólo los assets que realmente cambian:

```text
src/contenido/campeones/<campeon-id>/formas/<forma-id>/
```

Ejemplo futuro:

```text
src/contenido/campeones/gnar/formas/mega-gnar/
├── forma.json
├── overworld.png
├── retrato.png
└── combate/
    ├── frente.png
    └── espalda.png
```

Si una forma no sustituye un asset concreto, el sistema podrá reutilizar el de la forma base cuando se implemente la mecánica visual de transformación.

## Jugador

El protagonista sigue siendo una entidad independiente de los campeones/Ecos:

```text
public/assets/player/
├── overworld.png
└── portrait.png
```

Overworld del jugador: mismo estándar 144×192 / frames 48×48.

## Mundo / mapas

Los assets del mundo continúan organizados por Región → Zona:

```text
public/assets/world/regions/<region-id>/zones/<zone-id>/
├── overworld.png
├── battle-background.png
├── tiles/
├── props/
└── ambience/
```

Las coordenadas pertenecen al mapa físico. Misiones, desbloqueos y apariciones narrativas deben apoyarse en IDs lógicos (`regionId`, `zoneId`, `npcId`, flags), no en posiciones X/Y.

### Overworld de zona

Los mapas provisionales pueden seguir siendo imágenes o geometría Phaser durante el vertical slice.

Cuando se incorporen mapas de Tiled, la zona conservará su `zoneId`; así la sustitución del mapa físico no obliga a rehacer misiones ni condiciones.

### Fondo de combate de zona

Recomendación actual:

- PNG.
- 512 × 288 px.
- Sin personajes, barras, textos ni botones incrustados.
- Zona inferior relativamente limpia para UI.

## Objetos

Los iconos de objetos se mantienen separados de los campeones:

```text
public/assets/items/
├── components/
├── epic/
└── legendary/
```

Los datos de objetos están en `src/data/items/` y se descubren automáticamente. La migración de iconos a una convención equivalente podrá hacerse cuando el catálogo V1 esté completamente materializado.

## Filtro gráfico

Los sprites de campeón descubiertos automáticamente se cargan con filtro `NEAREST` para conservar el pixel art.

## Regla general

- Un campeón debe tener una única carpeta canónica.
- No duplicar el mismo asset en dos arquitecturas distintas.
- No registrar manualmente cada campeón en `BootScene`.
- Mantener los nombres de archivo definidos por la convención.
- Añadir nuevas formas dentro de `formas/<forma-id>/`.
- No cambiar tamaños de sprite porque un personaje se vea más grande o pequeño; primero ajustar ocupación del frame o escala runtime.
