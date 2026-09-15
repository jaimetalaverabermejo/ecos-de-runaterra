# Ecos de Runaterra

RPG web 2D en pixel art inspirado en Pokémon GBA/NDS y League of Legends, desarrollado con Phaser + TypeScript.

## Estado actual — v15.0 TEST

La versión de prueba v15 amplía el sistema de Ecos jugables y el motor de combate:

- Ecos de prueba activos: Teemo, Poppy, Lulu, Tristana y Gnar, preparados a Maestría 8.
- Combate basado en habilidades Q/W/E/R y estados genéricos.
- Nuevos conceptos de motor: evasión, transformación, destierro, carga explosiva, recursos y formas temporales.
- Gnar puede acumular Furia y transformarse temporalmente en Mega Gnar, con estadísticas, habilidades y sprites propios.
- Los assets y datos de cada campeón se descubren automáticamente desde `src/contenido/campeones/<id>/`.
- El equipo de prueba v15 se aplica una sola vez y conserva los Ecos anteriores en reserva sin reiniciar inventario, oro, misiones ni progreso del mundo.

Esta sigue siendo una versión de desarrollo: el balance, algunas pasivas secundarias y varias mecánicas avanzadas continuarán ajustándose durante las pruebas.

## Ejecutar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

GitHub Pages se publica automáticamente desde `main` mediante GitHub Actions.
