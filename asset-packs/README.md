# Asset packs de build (v16.2)

Los PNG grandes se materializan antes de `vite build` para preservar exactamente sus bytes.

## Opción recomendada

Subir un único archivo:

- `asset-packs/v16.2-all-assets.zip`

Contiene el pack reescalado de Ecos/protagonista/componentes y la UI960 original.

## Compatibilidad

El materializador también admite dos ZIP separados (`v16.2-rescaled.zip` + `ui_960_v1.zip`).

`scripts/materialize-v16-assets.mjs` copia cada archivo a su ruta de runtime. Ignora deliberadamente Master Yi y Mega Gnar hasta que exista contenido/asset definitivo para ellos.
