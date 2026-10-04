# Jonia: mapas iniciales

Los recursos comunes están en `public/assets/world/tiles` y `public/assets/world/Tilesets`. Tanto Bandle como Jonia apuntan a estas carpetas.

- `jo01_koeshin`: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/JO01_Koeshin.tmj`.
- `jo02_white_cliffs`: `public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos.tmj`.
- Sus definiciones de juego están en `src/data/world/regions/ionia/zones`.
- El menú de Jonia usa el mapa general provisional y señala las dos zonas jugables. No permite viajes rápidos.

## Conexiones

Montañas de los Portales ↔ Koeshin ↔ Acantilados Blancos. La salida de Bandle requiere `story:kennen-portal-activated`, que ya concede Kennen. Los cuatro destinos tienen puntos de llegada fuera del acceso de retorno.

## Primera casa futura

Koeshin incluye el punto de retorno `from_koeshin_house_01` y una reserva en `DesignNotes` delante de la casa cercana al portal. Para crear el interior:

1. Registrar el mapa `koeshin_house_01` con un spawn `from_koeshin`.
2. Convertir la reserva `koeshin_house_01_entrance_reserved` en un objeto de la capa `Portals`, con `targetMap=koeshin_house_01` y `targetSpawn=from_koeshin`.
3. Añadir en el interior una salida con `targetMap=jo01_koeshin` y `targetSpawn=from_koeshin_house_01`.

La reserva no activa ninguna transición mientras no exista el interior. De momento, ambas zonas permiten encontrar exclusivamente Kennen M7–8, sin condiciones. Cada mapa tiene su propia tabla; las apariciones de Kennen también están registradas en su carpeta de campeón.

La distribución futura de personajes y rutas está en `IONIA_PROGRESSION.md` y en `src/contenido/borradores/jonia/plan-region.json`. Las reservas de autoría de los dos mapas actuales no activan todavía esos eventos.

## Campeones

Los 21 campeones de Jonia están en `src/contenido/campeones/<id>/`: Ahri, Akali, Irelia, Ivern, Jhin, Karma, Kayn, Lee Sin, Lillia, Master Yi, Rakan, Sett, Shen, Syndra, Varus, Wukong, Xayah, Yasuo, Yone, Yunara y Zed.

Cada carpeta contiene `eco.json`, `estadisticas.json`, `habilidades.json`, `personaje.json` y sus imágenes. El selector de Showdown los carga automáticamente y muestra cuatro Ecos por página en orden alfabético. Los datos nuevos están junto a los anteriores, sin una carpeta separada para packs.

## Verificación

`npm run build` prepara los mapas y compila el juego. Después, `node scripts/check-world-maps.mjs` comprueba imágenes, tilesets, portales y puntos de llegada de los mapas activos.
