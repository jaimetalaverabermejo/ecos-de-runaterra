# Jonia: mapas iniciales

Los recursos comunes están en `public/assets/world/tiles` y `public/assets/world/Tilesets`. Tanto Bandle como Jonia apuntan a estas carpetas.

- `jo01_koeshin`: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/JO01_Koeshin.tmj`.
- `jo02_white_cliffs`: `public/assets/world/regions/Jonia/Zones/JO02_Acantilados_Blancos/JO02_Acantilados_Blancos.tmj`.
- `jo03_lhradi`: `public/assets/world/regions/Jonia/Zones/JO03_Lhradi/JO03_Lhradi.tmj`.
- `jo04_rice_fields`: `public/assets/world/regions/Jonia/Zones/JO04_Camino_Arrozales/JO04_Camino_Arrozales.tmj`.
- `jo05_placidium`: `public/assets/world/regions/Jonia/Zones/JO05_Placidium_Navori/JO05_Placidium_Navori.tmj`.
- Sus definiciones de juego están en `src/data/world/regions/ionia/zones`.
- `jo06_estuary`: `public/assets/world/regions/Jonia/Zones/JO06_Senda_Estuario/JO06_Senda_Estuario.tmj`.
- `jo07_wehle`: `public/assets/world/regions/Jonia/Zones/JO07_Puerto_Wehle/JO07_Puerto_Wehle.tmj`.
- El menú de Jonia usa el mapa general provisional y señala las trece zonas accesibles. No permite viajes rápidos.

## Conexiones

Montañas de los Portales ↔ Koeshin ↔ Acantilados Blancos ↔ Lhradi ↔ Arrozales ↔ Placidium ↔ Estuario ↔ We’hle ↔ Cumbres. El mirador de Cumbres abre un atajo bidireccional hasta el pueblo de Navori; no abre el memorial ni la cima. La salida de Bandle requiere `story:kennen-portal-activated`, que ya concede Kennen. Los destinos tienen puntos de llegada fuera del acceso de retorno; las salidas siguen el ancho actual de los caminos.

## Casas, puertas y servicios

Las casas de JO01–JO05 usan las plantillas ionias corregidas por el usuario. Se conservan 23 interiores: 22 activos y la antigua tienda de Lhradi reservada para otra casa, sin entrada exterior ni vendedor. Su salida permanece para partidas guardadas dentro. La puerta exterior del teatro lleva a la sala; las bambalinas comunican con el taller `jo03_lhradi_house_04`, donde sigue apareciendo Jhin tras completar su investigación. Los destinos y retornos de cada casa son propios de su instancia.

Las fachadas están en Structures, con colisiones explícitas y el paso libre únicamente en la puerta. Ya no se dibujan como casas atravesables en AbovePlayer. Árboles, puentes y decoración ajena se conservan. Las capas artísticas de cada interior mantienen exactamente el orden y los tiles de las correcciones del usuario; los puntos de llegada y las patrullas se adaptan a los muebles y muros. Una partida guardada dentro de una nueva pared se recoloca en una llegada segura sin perder progreso.

Lhradi tiene un único vendedor, el mismo `otter-merchant` de Bandle: Mercader, ambulante por toda Runaterra, siempre con su puesto exterior reconocible. El puesto copia los 25 tiles de Bandle con el mismo atlas, sin decoración regional añadida. Hablar con él abre directamente la tienda; el catálogo no cambia y el taller sigue disponible desde su menú tras desbloquearlo en Bandle. No hay vendedor ni banco interactivo en el interior reservado. Las futuras tiendas regionales deben reutilizar esta identidad y puesto. El círculo central de Soraka cura al equipo y a la reserva al entrar, guarda el checkpoint y habilita la Reserva de Ecos mientras se permanece dentro. La oración mantiene la interacción manual. Una derrota devuelve al santuario de Jonia conservando región y zona.

Antes de los primeros desbloqueos, JO01 y JO02 permiten encontrar Kennen M7–8, sin condiciones. Completar las conversaciones de Yi o Wukong activa sus resonancias. JO03–JO05 usan Kennen como respaldo únicamente si no hay ninguna resonancia inicial disponible; se retira en cuanto se habilita una. Cada mapa tiene su propia tabla y rango.

La distribución de personajes y rutas está en `docs/IONIA_PROGRESSION.md` y `docs/diseno/jonia/plan-region.json`. Sett y Karma tienen historias sin duelo; Jhin recorre JO03–JO07 y regresa a Lhradi para su combate y detención. Irelia tiene su duelo final preparado, condicionado a `story:ionia-trial-complete`; no aparece durante esta primera visita. JO06 Estuario y JO07 We’hle están registrados y conectados; los TMJ de JO14–JO21 siguen como material de diseño.

## Campeones

Los 21 campeones de Jonia están en `src/contenido/campeones/<id>/`: Ahri, Akali, Irelia, Ivern, Jhin, Karma, Kayn, Lee Sin, Lillia, Master Yi, Rakan, Sett, Shen, Syndra, Varus, Wukong, Xayah, Yasuo, Yone, Yunara y Zed.

Cada carpeta contiene `eco.json`, `estadisticas.json`, `habilidades.json`, `personaje.json` y sus imágenes. El selector de Showdown los carga automáticamente y muestra cuatro Ecos por página en orden alfabético. Los datos nuevos están junto a los anteriores, sin una carpeta separada para packs.

## Verificación

`npm run build` prepara los mapas y compila el juego. Después, `node scripts/check-world-maps.mjs` comprueba imágenes, tilesets, portales y puntos de llegada de los mapas activos.

`node scripts/check-ionia-access.cjs` comprueba acceso desde la entrada a los spawns, puertas, objetivos y hierbas terrestres. `node scripts/check-ionia-plan.mjs` comprueba las condiciones y el reparto narrativo. La revisión en navegador comprueba puertas, historias, desbloqueos, curación, reserva, recuperación tras derrota, tienda, transiciones físicas y cruce de puentes.

La capa `Agua` se dibuja en el orden de Tiled y bloquea el paso a pie, salvo los puentes de `Paths`. `BridgeRails` mantiene cerrados sus laterales. La navegación y el surf quedan reservados para una fase futura; las hierbas sobre agua se conservan como material del mapa y no forman parte del recorrido terrestre.

## Representación y primera historia

Los mapas de Jonia usan tiled.layerOrder=authored para respetar el orden de capas de Tiled: ramas, flores y rocas decorativas quedan sobre el barranco. AbovePlayer conserva su altura superior. Los personajes sin escala declarada usan 0,52; Yi y Wukong declaran 0,60 en personaje.json, con frames de 96 px.

Kennen acompaña desde el portal hasta el templo usando el seguidor de mundo. Partidas que ya cruzaron lo encuentran al llegar a Koeshin. La conversación del templo alterna Kennen y Yi, desbloquea su resonancia y dirige al viajero a Wukong. El relato de Wukong permite volver a Yi con la primera pista y continuar hasta Lhradi. Los antiguos duelos iniciales se conservan solo como archivo en docs/archivo/duelos.

## Isla principal completa · 15 de octubre

JO08 Paso de las Cumbres está integrado. We’hle conecta por el camino norte; el mirador abre el regreso occidental a Navori. El barco de Ema delimita el final disponible: JO09 y las otras islas no se abren. Lee Sin ofrece «Lo que no ves», con dos testimonios, huellas, rescate y una prueba de combate anunciada en texto. Estuario ofrece la recuperación opcional del paquete de Dai. Los habitantes y criaturas de JO06–JO08 tienen patrulla e interacción; Jun y Nima pasan al patio del puerto tras el rescate.


## Bosque Eterno · mapas abiertos, historias reservadas

JO09 Desembarco del Bosque ↔ JO10 Jardín del Olvido ↔ JO11 Omikayalan ↔ JO12 Sendero de las Raíces ↔ JO13 Refugio Vastaya están registrados y conectados en ambos sentidos. Se embarca mediante interacción explícita al final del muelle occidental de We’hle; el muelle del Desembarco permite regresar. Las llegadas quedan separadas de los portales para evitar rebotes.

Los cinco mapas se abren únicamente para explorar. No se añaden NPC, campeones, misiones, activadores narrativos ni santuarios nuevos; los encuentros aleatorios permanecen desactivados hasta trabajar las historias. Los interiores reservados siguen cerrados y las conexiones a JO14 y otras islas no se activan. Se mantienen el arte y las notas de diseño. En JO12 se retiran exclusivamente dos tiles de valla superpuestos sobre la escalera central (columnas 38/39, fila 42), que cortaban el acceso a la mitad norte.

`check-ionia-forest.mjs` comprueba las trece definiciones mediante el registro, el acceso a todas las llegadas y salidas nuevas, las conexiones bidireccionales y barco, los guardados y la ausencia de eventos adelantados. La revisión en navegador recorre el barco de ida/vuelta, todas las conexiones terrestres y la escalera reparada con movimiento del protagonista.
