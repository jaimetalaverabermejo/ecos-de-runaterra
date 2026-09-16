# Asset packs de build (v16.2)

Los PNG grandes se materializan antes de `vite build` para evitar alteraciones de binario durante transferencias automatizadas.

Archivos esperados:

- `v16.2-rescaled.zip`: pack de Ecos 96/320, protagonista y componentes 96px.
- `ui_960_v1.zip`: pack UI960 original generado en Work.

`scripts/materialize-v16-assets.mjs` copia cada archivo a su ruta de runtime. Ignora deliberadamente Master Yi y Mega Gnar hasta que exista contenido/asset definitivo para ellos.
