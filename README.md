# Ecos de Runaterra — Step 1 (iPad ready)

Primer greybox técnico de la vertical slice de Bandle City.

## Incluye

- Phaser 4 + TypeScript + Vite.
- Resolución lógica 512x288 y pixel art.
- Movimiento cardinal con WASD/flechas en escritorio.
- Cruceta táctil automática en iPhone/iPad/dispositivos táctiles.
- `InputManager` desacoplado de `WorldScene`, preparado para añadir gamepad después.
- Cámara con seguimiento.
- Mapa externo en JSON.
- Colisiones declaradas en datos.
- Dos portales/transiciones con persistencia local.
- Zona de encuentros ya declarada, todavía sin lanzar combates.
- Definiciones externas para Garen, Teemo, habilidades, objetos y encuentros.
- Separación entre `ChampionDefinition` y `ChampionInstance`.
- `SaveGame` versionado en `localStorage`.
- Ajustes móviles: bloqueo de scroll/zoom accidental, safe areas y viewport de iOS.

## Ejecutar en ordenador

```bash
npm install
npm run dev
```

## Probar desde iPad/iPhone

La ruta recomendada es **GitHub Pages** para jugar y **StackBlitz** para editar desde el navegador.

El repositorio incluye un workflow de GitHub Actions que compila y publica automáticamente el contenido de `dist/` en GitHub Pages cada vez que cambia la rama `main`. Consulta `IPAD_SETUP.md` para los pasos exactos.

No hace falta instalar Node.js en el iPad.

## Build estático para hosting

```bash
npm install
npm run build
```

El resultado queda en `dist/`. Esa carpeta es una web estática y puede publicarse en un hosting que sirva HTML/CSS/JS aunque el servidor no ejecute Node.js.

> Node/Vite son necesarios para compilar el proyecto, no para ejecutar en producción el build generado.

## Paso 2 previsto

Añadir trigger probabilístico en la zona de encuentro, generar una instancia salvaje de Teemo y abrir `BattleScene` 1v1.
