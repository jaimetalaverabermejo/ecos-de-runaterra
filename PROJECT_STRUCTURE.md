# Ecos de Runaterra — Estructura canónica v14

La v14 convierte el proyecto en una arquitectura de contenido **data-driven y basada en convenciones**. El objetivo es que añadir contenido no obligue a editar registros centrales ni a crear lógica específica por campeón.

## Principio principal

La unidad de organización de un campeón es su propia carpeta:

```text
src/contenido/campeones/<campeon-id>/
```

Todo lo que pertenece específicamente a ese campeón/Eco debe vivir ahí: datos narrativos, datos jugables, estadísticas, habilidades, reglas de aparición, sprites y formas.

Los objetos, misiones globales, tiendas y mundo siguen fuera de las carpetas de campeones.

## Campeón narrativo y Eco jugable

Son entidades distintas aunque normalmente compartan identidad visual.

- `personaje.json`: el campeón/personaje que existe en Runaterra y puede aparecer como NPC.
- `eco.json`: la unidad jugable/vinculable inspirada en ese campeón.

Hablar con un personaje no vincula ni descubre automáticamente su Eco. Esa relación sólo existe cuando una condición de datos la declara.

## Carpeta de un campeón

```text
src/contenido/campeones/garen/
├── personaje.json
├── eco.json
├── estadisticas.json
├── habilidades.json
├── apariciones.json
├── overworld.png
├── retrato.png
├── icono.png                 # opcional
├── combate/
│   ├── frente.png
│   └── espalda.png
└── formas/
    └── <forma-id>/
        ├── forma.json
        ├── overworld.png
        ├── retrato.png
        ├── icono.png
        └── combate/
            ├── frente.png
            └── espalda.png
```

No todos los archivos son obligatorios desde el primer día. Se puede crear una carpeta de campeón y añadir progresivamente sus assets y datos.

## Descubrimiento automático

`src/contenido/CatalogoContenido.ts` utiliza `import.meta.glob`.

Por tanto, el código no necesita una nueva línea de registro cada vez que se añade un campeón.

Ejemplo:

```text
src/contenido/campeones/nidalee/overworld.png
```

se reconoce automáticamente como el overworld de `nidalee` y genera la texture key:

```text
nidalee-overworld
```

Del mismo modo:

```text
src/contenido/campeones/gnar/formas/mega-gnar/overworld.png
```

se reconoce como el overworld de la forma `mega-gnar` de Gnar.

Añadir un asset no convierte por sí solo al Eco en jugable. Para tener una definición jugable completa son necesarios `eco.json`, `estadisticas.json` y `habilidades.json` válidos.

## Nomenclatura de datos de campeón

### personaje.json

Datos narrativos y de afiliación.

```json
{
  "id": "garen",
  "nombre": "Garen",
  "regionPrincipalId": "demacia",
  "afiliaciones": ["demacia"],
  "estadoContenido": "jugable"
}
```

### eco.json

Datos generales de la unidad jugable.

Incluye roles, tier manual, dificultad de vínculo, rendimiento de experiencia, IDs de Pasiva/Q/W/E/R y formas.

El tier `C/B/A/S/S+` es manual y no determina automáticamente stats ni dificultad de vínculo.

### estadisticas.json

Utiliza nombres legibles en castellano:

- vida
- ataque
- poder
- defensa
- resistencia
- velocidad

Contiene bloque `base` y bloque `crecimiento`.

### habilidades.json

Contiene Pasiva + Q + W + E + R y sus efectos data-driven.

El formato de contenido está en castellano; `CatalogoContenido` traduce esos datos al vocabulario interno del motor.

### apariciones.json

Declara **dónde puede aparecer un Eco y bajo qué condiciones lógicas**.

Ejemplo conceptual:

```json
{
  "id": "garen-ruta-petricitas",
  "regionId": "demacia",
  "zonaId": "ruta-petricitas",
  "peso": 20,
  "maestriaMinima": 8,
  "maestriaMaxima": 12,
  "condiciones": [
    { "tipo": "npc-hablado", "npcId": "garen-demacia" }
  ]
}
```

No se deben utilizar coordenadas para desbloquear contenido narrativo.

## Condiciones lógicas de mundo

La v14 incorpora condiciones reutilizables para:

- bandera/evento del mundo;
- haber hablado con un NPC concreto;
- estado de una misión;
- Eco desconocido/visto/vinculado;
- objeto poseído;
- región desbloqueada;
- zona desbloqueada;
- Maestría mínima;
- combinaciones `todas`, `alguna` y `no`.

El save conserva `flags` y `spokenNpcIds` en `worldProgress`.

Esto permite que un NPC cambie de mapa o posición sin romper misiones. Su identidad estable es el `npcId`, no sus coordenadas.

## Formas

Las formas se descubren automáticamente desde:

```text
src/contenido/campeones/<campeon-id>/formas/<forma-id>/
```

`forma.json` puede preparar:

- nombre y estado de contenido;
- regla de activación;
- override de estadísticas base;
- override de crecimiento;
- pasiva alternativa;
- Q/W/E/R alternativos.

La v14 prepara los datos y assets. La mecánica de transformación en combate se implementará cuando corresponda.

## Catálogo global de Ecos

El roster general continúa en:

```text
src/data/echoes/catalog.json
```

Este archivo permite que el Registro de Ecos conozca todo el roster aunque muchos campeones todavía no tengan carpeta jugable completa.

## Objetos

Los objetos siguen organizados por tier/familia bajo:

```text
src/data/items/
├── components/
├── epic/
├── legendary/
├── consumables/
└── key/
```

`DataRegistry` descubre automáticamente todos los JSON bajo `src/data/items/**`.

Añadir un nuevo JSON de objeto correctamente formado ya no requiere añadir un import manual a `DataRegistry.ts`.

Las recetas se descubren automáticamente desde:

```text
src/data/recipes/**
```

La economía admite valor base y override de precio de venta. La regla global de venta podrá aplicar un porcentaje inferior al precio de compra.

## Misiones

Las misiones se descubren automáticamente desde:

```text
src/data/quests/**
```

Categorías:

- `main`: principal
- `side`: secundaria

Pueden declarar `prerequisites` con las mismas condiciones lógicas del mundo.

Los objetivos deben referenciar IDs estables (`npcId`, `zoneId`, `championId`, etc.), nunca posiciones X/Y.

## Tiendas

Las tiendas se descubren automáticamente desde:

```text
src/data/shops/**
```

No es necesario registrarlas manualmente en `DataRegistry.ts`.

## Mundo lógico frente a mapa físico

La lógica debe pensar en:

```text
regionId
zoneId
npcId
questId
flags
```

El mapa físico puede pensar en:

```text
x
y
collisions
spawn
transitions
```

Una misión puede exigir `npc-hablado: garen-demacia` aunque Garen aparezca en lugares diferentes según el estado del mundo.

Esta separación permite construir ahora narrativa, encuentros y progresión sin disponer de Tiled, y sustituir más adelante los mapas provisionales sin rehacer la lógica.

## Datos de mundo autodetectados

`DataRegistry` descubre automáticamente:

- objetos;
- recetas;
- misiones;
- tiendas;
- regiones;
- mapas regionales;
- mapas de zona;
- tablas de encuentros.

Los campeones, habilidades, formas, apariciones y assets de campeón se descubren mediante `CatalogoContenido`.

## Regla de nuevas incorporaciones

1. Elegir un `id` estable en minúsculas y con guiones cuando sean necesarios.
2. Crear la carpeta final desde el principio.
3. Usar los nombres de archivo definidos por esta convención.
4. No añadir imports manuales a un registro central si el dominio ya usa auto-descubrimiento.
5. No introducir condiciones narrativas basadas en coordenadas.
6. No codificar excepciones `if champion === ...` salvo casos estrictamente excepcionales y temporales.
