# Ecos de Runaterra — Estructura canónica v14

La v14 convierte el proyecto en una arquitectura de contenido **data-driven y basada en convenciones**. El objetivo es que añadir contenido no obligue a editar registros centrales ni a crear lógica específica por campeón.

## 1. Personaje narrativo y Eco jugable

Son entidades distintas aunque normalmente compartan identidad visual.

- `personaje.json`: el campeón/personaje que existe en Runaterra y puede aparecer como NPC.
- `eco.json`: la unidad jugable/vinculable inspirada en ese campeón.

Un personaje puede existir como contenido `planeado`, tener sprites y aparecer como NPC **sin que su Eco esté todavía implementado**. Para convertirlo en Eco jugable hacen falta además una definición de Eco, estadísticas y habilidades válidas.

Hablar con un personaje no vincula ni descubre automáticamente su Eco. Esa relación sólo existe cuando una condición/acción de datos la declara.

## 2. Carpeta canónica de campeón

```text
src/contenido/campeones/<campeon-id>/
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

No todos los archivos son obligatorios desde el primer día. Un personaje narrativo puede empezar con `personaje.json` y sus assets. El Eco pasa a ser jugable cuando tiene `eco.json`, `estadisticas.json` y `habilidades.json` válidos.

### Descubrimiento automático

`src/contenido/CatalogoContenido.ts` usa `import.meta.glob`, por lo que no hace falta registrar manualmente cada campeón o asset.

Ejemplos:

```text
src/contenido/campeones/nidalee/overworld.png
→ nidalee-overworld

src/contenido/campeones/gnar/formas/mega-gnar/overworld.png
→ gnar-form-mega-gnar-overworld
```

Los assets base y de formas se cargan automáticamente desde `BootScene`.

### Formas

Las formas se descubren desde:

```text
src/contenido/campeones/<campeon-id>/formas/<forma-id>/
```

`forma.json` puede declarar nombre, estado de contenido, activación, overrides de estadísticas y kit alternativo.

Una forma `planeado` puede existir sólo como contenido/asset visual. Una forma marcada `jugable` o `completo` exige que el Eco base tenga definición jugable.

La transformación dinámica durante el combate se implementará cuando corresponda; el catálogo y los assets ya están preparados.

## 3. Apariciones de Ecos

Cada campeón puede declarar apariciones en:

```text
src/contenido/campeones/<campeon-id>/apariciones.json
```

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

Desde v14.3, si una zona tiene definiciones lógicas de aparición, éstas son la fuente autoritativa de los encuentros. La tabla antigua sólo funciona como fallback en zonas que aún no hayan migrado.

Esto permite que un Eco entre o salga del sorteo de encuentros según el estado de la partida sin modificar el mapa ni `WorldScene`.

## 4. NPC data-driven

Los NPC se descubren automáticamente desde:

```text
src/contenido/mundo/npcs/**/*.json
```

Un NPC puede declarar:

- `id` estable;
- mapa y posición física actual;
- orientación;
- personaje asociado mediante `campeonId`;
- forma visual opcional mediante `formaId`;
- escala de overworld;
- diálogo;
- servicio de misión, tienda o santuario;
- condiciones para existir/aparecer;
- acciones al hablar;
- comportamiento preparado como estático, patrulla o aleatorio.

`campeonId` referencia al **personaje narrativo**, no exige que exista un Eco jugable. Si además se indica `formaId`, el juego busca automáticamente la textura de esa forma. Por ejemplo:

```json
{
  "campeonId": "gnar",
  "formaId": "mega-gnar"
}
```

usa la texture key:

```text
gnar-form-mega-gnar-overworld
```

La identidad narrativa es el `npcId`, no sus coordenadas. Por eso un personaje podrá cambiar de ubicación sin romper las misiones que lo referencian.

Los comportamientos `patrulla` y `aleatorio` están **preparados en datos**, pero el movimiento físico todavía no está implementado. Los NPC actuales siguen estáticos.

## 5. Diálogos data-driven

Los diálogos se descubren automáticamente desde:

```text
src/contenido/mundo/dialogos/**/*.json
```

Los textos de la primera misión ya no viven dentro de `WorldScene`.

La estructura soporta nodos y opciones, además de preparar condiciones y acciones por nodo/opción. La ejecución dinámica de acciones dentro de cada opción se desarrollará cuando se necesite; v14.3 ya utiliza el catálogo para resolver los diálogos y las acciones genéricas de NPC/misión.

## 6. Condiciones lógicas

Las condiciones reutilizables incluyen:

- bandera/evento de mundo;
- NPC hablado;
- estado de misión;
- Eco desconocido/visto/vinculado;
- objeto poseído;
- región desbloqueada;
- zona desbloqueada;
- Maestría mínima;
- `todas`, `alguna` y `no`.

El save conserva `flags` y `spokenNpcIds` dentro de `worldProgress`.

No utilizar coordenadas X/Y como requisito narrativo.

## 7. Acciones genéricas de mundo

`WorldActionService` permite ejecutar acciones declaradas por datos:

- activar/desactivar una bandera;
- desbloquear una región;
- desbloquear una zona;
- cambiar el estado conocido de un Eco;
- entregar un objeto;
- entregar o modificar oro.

Ejemplo estructural de v14.3:

```text
hablar con Garen
→ acción: activar flag
→ la condición de apariciones de Garen pasa a cumplirse
→ el Eco de Garen entra en el sorteo del Claro del Portal
```

La relación completa está en datos, no en un `if (garen)` dentro del motor.

## 8. Misiones y pasos

Las misiones se descubren desde:

```text
src/data/quests/**
```

Categorías:

- `main`: principal;
- `side`: secundaria.

Una misión puede usar el modelo antiguo de objetivos o el modelo v14.3 de `steps`.

Cada paso contiene sus propios objetivos. Al completar un paso se activa el siguiente; el Diario muestra `PASO X/Y`.

Tipos de objetivo preparados:

- vincular Eco;
- derrotar Eco;
- hablar con NPC;
- visitar zona;
- obtener/usar referencia de objeto;
- interactuar con entidad lógica.

Los eventos ya emitidos por el juego incluyen hablar con NPC, visitar zona, vincular Eco y derrotar Eco.

Las misiones también pueden declarar prerrequisitos, acciones al inicio, acciones al completar y los IDs de sus diálogos.

## 9. Mundo lógico frente a mapa físico

La lógica narrativa debe pensar en:

```text
regionId
zoneId
npcId
questId
championId
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

Por tanto, una misión puede pedir `hablar con garen-demacia` aunque ese NPC aparezca en ubicaciones diferentes según el estado del mundo.

Esta separación permite construir narrativa y progresión antes de tener los mapas finales de Tiled.

## 10. Objetos, recetas y tiendas

Los objetos siguen en:

```text
src/data/items/
├── components/
├── epic/
├── legendary/
├── consumables/
└── key/
```

`DataRegistry` descubre automáticamente objetos, recetas y tiendas. El catálogo estructural V1 está planteado para 66 objetos: 9 componentes, 32 épicos y 25 legendarios.

## 11. Datos autodetectados

`DataRegistry` / los catálogos de contenido descubren automáticamente:

- personajes y Ecos;
- habilidades;
- formas;
- assets de campeón;
- apariciones de Ecos;
- NPC;
- diálogos;
- objetos;
- recetas;
- misiones;
- tiendas;
- regiones;
- mapas regionales;
- mapas de zona;
- tablas de encuentros.

`DataRegistry.validate()` comprueba IDs duplicados y referencias rotas entre estos dominios antes de arrancar el juego, respetando la separación personaje narrativo / Eco jugable.

## 12. Regla de nuevas incorporaciones

1. Elegir un ID estable en minúsculas y con guiones cuando sea necesario.
2. Crear la carpeta final desde el principio.
3. Seguir la nomenclatura acordada para que el contenido se descubra automáticamente.
4. No añadir imports manuales a un registro central si el dominio ya usa auto-descubrimiento.
5. No introducir condiciones narrativas basadas en coordenadas.
6. No codificar excepciones `if champion === ...` salvo casos estrictamente excepcionales y temporales.
7. No inventar datos jugables para activar un NPC: `personaje.json + overworld.png` es suficiente para la capa narrativa.

## v14.5 — Movimiento y escala visual

`personaje.json` puede declarar `visual` con `escalaOverworld`, `offsetY`, `anchoHitbox` y `altoHitbox`. `forma.json` puede sobrescribir esos valores. El NPC conserva `escalaOverworld` como override opcional.

Los comportamientos `estatico`, `patrulla` y `aleatorio` se ejecutan en el mundo. Los NPC cambian orientación/frame al caminar y se detienen al aproximarse el jugador para facilitar la interacción.

Las ayudas permanentes del tipo “A / HABLAR” se eliminan del mundo; los controles se enseñarán puntualmente mediante tutorial.
