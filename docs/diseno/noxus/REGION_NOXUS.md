# Noxus — mapas Tiled y urbanismo imperial

Revisión basada en el Basilich manual de Jaime `17d230f` y en sus ajustes del Bastión. Las ciudades comparten suelo marrón, calles oscuras con bordillo, fachadas alineadas, murallas completas y decoración sobria. Caravanas y los recorridos rurales conservan sus caminos de tierra.

Abrir `public/assets/world/regions/Noxus/Noxus.world` en Tiled para ver las diez piezas. Cada mapa usa cuadrícula de 32 px y orden de capas authored. Los criterios concretos, índices locales de las calles, módulos de muralla y tratamiento del Bastión están en [urbanismo de Basilich](urbanismo-basilich.md).

NO01 conserva sus capas de tiles validadas por Jaime. NO03 conserva exactamente las capas visuales de su revisión manual `17d230f`; se corrigen únicamente las referencias del atlas ampliado y los objetos auxiliares de colisión y diseño que no se habían desplazado con los edificios y la decoración. El arte y la posición del Bastión aprobado también se verifican mediante un hash.

| Mapa | Tamaño (tiles) | Composición |
| --- | --- | --- |
| [NO01_Puerto](mapas/NO01_Puerto.jpg) | 74 × 64 | Puerto manual conservado; referencia de naturaleza, costas y ensamblajes. |
| [NO02_Cruce_Caravanas](mapas/NO02_Cruce_Caravanas.jpg) | 88 × 68 | Cruce rural de tierra, posada, mercado de tránsito, corral y puente. |
| [NO03_Basilich](mapas/NO03_Basilich.jpg) | 88 × 78 | Referencia visual manual de Jaime 17d230f conservada; huellas de edificios y decoración ajustadas a sus posiciones reales. |
| [NO04_Suministros](mapas/NO04_Suministros.jpg) | 88 × 76 | Almacenes y patios de carga con barriles, sacos, carros, cajas y mesas de intendencia; forja con carbón y leña; vallas horizontales completas. |
| [NO05_Capital_Exterior](mapas/NO05_Capital_Exterior.jpg) | 112 × 100 | Mercado de Hierro con puestos y posadas; distrito militar con arsenal y forja; plaza equipada; segundo recinto de 52 tiles, en piedra oscura, con cuatro dependencias. |
| [NO06_Bastion_Interior](mapas/NO06_Bastion_Interior.jpg) | 112 × 96 | Interior de 112 × 96 tiles: vestíbulo, galería, consejo, sala de guerra, biblioteca, archivo, armería y aposentos. |
| [NO07_Memorial_Sion](mapas/NO07_Memorial_Sion.jpg) | 100 × 76 | Islote redondo, tierra, hierba, templo y pedestal de Sion. |
| [NO08_Frontera_Occidental](mapas/NO08_Frontera_Occidental.jpg) | 132 × 52 | Valle horizontal y muralla quebrada; puesto urbano con calles de bordillo, tierra marrón y farolas. |
| [NO09_Delverhold](mapas/NO09_Delverhold.jpg) | 88 × 76 | Guarnición con patios equipados, bancos, jardineras, material de instrucción, almacenes y vallas con huecos frente a las puertas. |
| [NO10_Ironspike](mapas/NO10_Ironspike.jpg) | 152 × 54 | Paso horizontal con terrazas, tres cruces del río, cantera y bocamina. |

## Capital y segundo recinto

La ciudad exterior tiene ahora cuatro áreas de funciones diferentes: Mercado de Hierro al oeste, distrito militar al este, zona cívica al norte y plaza ceremonial al sur. El mercado reúne cinco puestos, tiendas, mesas de mercancías, fuente, bancos y carga civil. La zona militar contiene cuartel, patio de instrucción, arsenal, forja, combustible y carros. La plaza de entrada se equipa con bancos, jardineras, braseros y bolardos alrededor de las estatuas.

El segundo recinto pasa de 62 a 52 tiles de ancho para ceder espacio a la ciudad. Se conservan cuatro dependencias pequeñas y un pavimento oscuro continuo. El paseo de dos tiles por ambos flancos y por detrás de las torres sigue accesible; la entrada comunica con NO06. El arte del Bastión, su posición y la superposición sobre la muralla norte se conservan.

El acceso ceremonial tiene cuatro tiles, las calles de distrito tres y los ramales de las puertas dos. El hueco real de los portones sigue siendo de dos tiles. La decoración se agrupa por funciones y las vallas utilizan los módulos horizontales completos de la referencia de Jaime.

![Capital antes y después](mapas/Capital_urbanismo_comparacion.jpg)

## Fuentes y alcance

Fuentes en `public/assets/world/regions/Noxus/Zones`. `manifest.json` registra conexiones, objetivos y huellas protegidas. `Noxus_calles_32.tsx` declara las 60 celdas del atlas ampliado; permite usar sus nuevas esquinas sin desplazar los rangos históricos de los demás mapas. Los runtime se generan con `node scripts/prepare-tiled-maps.mjs` y no se versionan.

Los portales tienen destinos y retornos. El atajo puerto–Caravanas requiere `noxus:atajo-puerto-abierto`. NO06 es el interior del edificio. Los demás accesos de edificios se documentan para una fase de interiores; no apuntan a mapas inexistentes. Esta revisión prepara las fuentes y no activa la región ni despliega el juego publicado.

## Validación

- `python scripts/check-noxus-maps.py`: referencias, GID, fuentes/runtime, llegadas, conexiones, puntos de interés, escaleras y protección de NO01.
- `python scripts/check-noxus-urban-style.py`: protección de NO01 y del Basilich manual, atlas ampliado, esquinas de las calles, vallas horizontales completas, arte del Bastión y circuito continuo de dos tiles por sus flancos y parte posterior.
- `python scripts/check-noxus-city-clearance.py`: llegadas de dos tiles a los edificios, calles completas de dos o tres tiles y eje ceremonial de cuatro, sin decoración que corte los pasos.
- WorldScene real: diez mapas renderizados; dos puentes y una escalera recorridos; Puerto–Basilich–Puerto y Capital–Bastión interior–Capital; circuito completo a pie por el flanco oeste, detrás de las torres, flanco este y frente del Bastión. También se recorren el mercado, el distrito militar y la calle de carga de Suministros. Sin errores JavaScript.
- `npm run build`: compilación y comprobaciones generales correctas.

![Vista de las diez piezas](mapas/Noxus_diez_mapas.jpg)
