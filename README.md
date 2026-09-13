# Ecos de Runaterra — Vertical Slice Bandle City

## v0.2

- Garen ya usa sprite pixel art en el mapa.
- Portal interno corregido: teletransporte local sin reiniciar la escena/input.
- Prado de Ecos funcional con encuentros por distancia recorrida y probabilidad.
- Teemo es el primer Eco salvaje (nivel 2–3 desde datos externos).
- Nueva `BattleScene` de precombate con Garen de espaldas y Teemo frontal.
- Transición visual simple de encuentro y entrada de ambos sprites.
- Botón táctil `Huir / Volver` para regresar al mapa.
- Ajuste visual de la cruceta para reducir parpadeos en iPad/iPhone.

Todavía no hay turnos, daño, habilidades ni Vínculo real. Ese será el siguiente hito.

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
