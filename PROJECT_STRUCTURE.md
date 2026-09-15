# Ecos de Runaterra — Estructura canónica v14.3

La familia v14 convierte el proyecto en una arquitectura de contenido **data-driven y basada en convenciones**. Añadir contenido no debe obligar a editar registros centrales ni a crear lógica específica por campeón.

## 1. Campeones y Ecos

La unidad de organización de un campeón es su propia carpeta:

```text
src/contenido/campeones/<campeon-id>/
```

Todo lo específico de ese campeón/Eco vive ahí:

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

`personaje.json` representa al campeón/personaje narrativo. `eco.json` representa la unidad jugable/vinculable. Son entidades distintas aunque puedan compartir identidad visual.

`CatalogoContenido.ts` usa `import.meta.glob`, por lo que un archivo como:

```text
src/contenido/campeones/nidalee/overworld.png
```

se descubre automáticamente como `nidalee-overworld`.

El overworld mantiene el estándar 144×192 px, cuadrícula 3×4 y frames de 48×48 px.

## 2. Formas

Las formas se descubren desde:

```text
src/contenido/campeones/<campeon-id>/formas/<forma-id>/
```

`forma.json` puede preparar reglas de activación, estadísticas, crecimiento, pasiva y Q/W/E/R alternativos. La arquitectura admite estas variantes aunque la transformación en combate se implemente después.

## 3. Apariciones de Ecos

Cada campeón puede declarar en `apariciones.json` dónde puede aparecer su Eco y bajo qué condiciones lógicas.

Ejemplo:

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
- campeón asociado mediante `campeonId`;
- escala de overworld;
- diálogo;
- servicio de misión, tienda o santuario;
- condiciones para existir/aparecer;
- acciones al hablar;
- comportamiento preparado como estático, patrulla o aleatorio.

La identidad narrativa es el `npcId`, no sus coordenadas. Por eso un personaje podrá cambiar de ubicación sin romper las misiones que lo referencian.

Los comportamientos `patrulla` y `aleatorio` están **preparados en datos**, pero el movimiento físico todavía no está implementado. En v14.3 los NPC existentes siguen estáticos.

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

- campeones/Ecos;
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

`DataRegistry.validate()` comprueba IDs duplicados y referencias rotas entre estos dominios antes de arrancar el juego.

## 12. Regla de nuevas incorporaciones

1. Elegir un ID estable en minúsculas y con guiones cuando sea necesario.
2. Crear la carpeta final desde el principio.
3. Seguir la nomenclatura acordada para que el contenido se descubra automáticamente.
4. No añadir imports manuales si el dominio ya tiene autodescubrimiento.
5. No basar narrativa en coordenadas.
6. No introducir `if champion === ...` salvo excepciones estrictamente temporales.
7. Preferir `condiciones + acciones + eventos` frente a lógica específica de una misión o personaje.
