# Fondos de combate regionales

Los dos formatos de combate comparten `drawCombatBackdrop` y el catálogo
`src/ui/combat/CombatBackgrounds.ts`. El fondo se decide por el mapa actual de
la partida, no por la región de los campeones. Showdown y sandbox usan el
genérico, independientemente de la partida guardada.

Todos los PNG son de **960 × 540**, sin personajes ni interfaz. Los siete nuevos
fondos se exportaron completos con vecino más próximo, sin recortar la escena.
Bandle conserva su PNG original. Los exteriores tienen claros discretos; las
ciudades conservan pavimento continuo. No hay desnivel entre equipos fuera de
Bandle. Las sombras de contacto y la interfaz siguen siendo elementos del juego.

| Región / mapa | Fondo |
| --- | --- |
| Bandle, incluidos sus interiores | Bandle original |
| Jonia, incluidos sus interiores | Jonia |
| NO01 Puerto, NO03 Basilich, NO05 Capital, NO06 Bastión, NO09 Delverhold | Noxus ciudad |
| NO02 Caravanas, NO04 Suministros, NO07 Memorial, NO08 Frontera, NO10 Ironspike | Noxus campo |
| Demacia | Demacia campo; ciudad con `battleEnvironment: "city"` |
| Freljord | Freljord |
| Sin mapa o región sin fondo propio | Genérico |

Demacia y Freljord todavía no tienen mapas registrados; sus fondos quedan
preparados para sus futuros `regionId`. Un mapa puede declarar
`battleEnvironment: "field"` o `"city"`. Este campo prevalece sobre la tabla
de asignaciones; los futuros interiores noxianos pueden heredar la asignación
de su `zoneId`. Las regiones desconocidas usan el genérico.

Comprobación: `node scripts/check-combat-backgrounds.mjs` valida dimensiones,
archivos, todos los mapas vigentes y las alternativas para regiones futuras.
