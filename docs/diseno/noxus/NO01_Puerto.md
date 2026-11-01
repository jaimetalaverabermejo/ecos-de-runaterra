# NO01 — Puerto oriental

Referencia visual cerrada con la revisión manual de Jaime `806156c` del 1 de noviembre de 2026. Basada en su montaje inicial `d57374d5e96078d36f896b6a428dac4aca984522` y en las láminas regional y «Noxus · Puerto y Basilich».

Fuente: `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/NO01_Puerto.tmj`. Se conserva su ubicación provisional y todas sus referencias relativas. Cuadrícula de 32 px; 74 × 64 tiles.

## Composición

- Recinto del puerto, edificios, murallas, estatuas, muelles y pavimento conservados celda por celda. Todas las capas de tiles entre columnas 31–73 y filas 5–34 permanecen idénticas. Coordenadas desde cero.
- Agua, puente de madera, roca costera y desnivel original conservados. No se introducen barrancos altos. La última franja de tierra bajo los árboles del cierre sureste pasa a hierba sin modificar la roca de la costa.
- Exterior con una selección de cuatro variantes de los árboles de muestra: verdes oscuros, amarillos y rojos mezclados individualmente. Bosques menos densos en la superficie original; se conserva la continuidad de los límites. El hueco del sureste queda cerrado con árboles hasta la costa.
- Suelo verde bajo los bosques, con algún árbol excepcional en la franja gris próxima al acantilado para cerrar el paso. Se eliminan los claros artificiales de tierra. Usar la geometría manual final: `GroundDetails` debajo de `Paths`, esquinas interiores corregidas e integración del camino en la tierra de la orilla antes del puente.
- Caminos de dos tiles: salida norte hacia Basilich, ramal occidental cerrado, circuito de regreso de los saltos y paseo sur cruzando el puente existente. Se elimina el ramal sin destino de columnas 14–21, filas 35–38; se añade el segundo salto en la fila 26. Los claros y el puerto conservan espacios amplios.
- El ramal occidental está cerrado por dos soldados noxianos, con el aviso «Por aquí no se puede pasar» y la indicación de continuar por Basilich. La roca del camino desaparece. Árboles a ambos lados del puesto evitan rodearlo por la hierba. La salida principal está al norte. El regreso desde el salto bajo recorre el camino occidental.

`DesignNotes` contiene las reservas de conexión y se entrega oculta. No hay portales a destinos aún inexistentes ni nuevas conexiones activas en la aventura. Este cambio prepara el archivo Tiled; no publica Noxus ni altera la aventura de Jonia.

Los guardias son puestos estáticos solicitados expresamente por Jaime para cortar el paso. Su arte procede de los sprites existentes de lancero y escudero, al 54 %, en el pequeño atlas `NO01_guardias_32`. La representación se sitúa en `Decoration`; `NpcSpawns` conserva los marcadores, identidades y la excepción de movimiento autorizada. `Collisions` delimita sus pies y `Interactions` permite hablar pulsando A/E/espacio. El diálogo está en `src/contenido/mundo/dialogos/noxus-puerto.json`. No se crean NPC duplicados en el catálogo ni se modifica el motor.

Los cierres críticos de bosque usan colisión bajo las copas visibles, además de los troncos de `Obstacles`, para impedir rodear el puesto o cruzar el límite sureste. Los puntos de interés y caminos siguen accesibles.

Al integrar NO01 en el catálogo jugable, usar `tiled.layerOrder: "authored"` para conservar el orden del archivo. Los runtime se generan desde las fuentes; no se versionan.

## Índice de las diez piezas de la lámina regional

La lámina general es la referencia para esta numeración. Las láminas de detalle pueden agrupar dos piezas; no equivalen a un único archivo Tiled.

| ID | Mapa | Estado en este encargo |
| --- | --- | --- |
| NO01 | Puerto oriental | Referencia visual cerrada por Jaime |
| NO02 | Cruce de caravanas | Pendiente |
| NO03 | Basilich | Pendiente |
| NO04 | Suministros militares | Pendiente |
| NO05 | Capital exterior | Pendiente |
| NO06 | Bastión interior | Pendiente |
| NO07 | Camino y Memorial de Sion | Pendiente |
| NO08 | Frontera occidental | Pendiente |
| NO09 | Delverhold | Pendiente |
| NO10 | Paso de Ironspike | Pendiente |

## Comprobaciones

Durante la primera propuesta se generó el runtime y se comprobaron GID, referencias de tilesets, dimensiones de capas, puerto y navegación. Los recuentos y objetivos de aquella propuesta quedan sustituidos por el mapa manual final; no restaurar el ramal eliminado para satisfacer una prueba antigua.

La propuesta anterior se probó en el `WorldScene` real (movimiento, puente, salto, guardia, diálogo y bosque sureste) y compiló correctamente. Esos resultados corresponden a la propuesta anterior, no sustituyen una revisión jugable posterior a nuevos retoques manuales. Para el cierre visual se ha regenerado el runtime final, inspeccionado el render de tiles y verificado las 21 esquinas interiores de la revisión de Jaime, todas correctas. El archivo Tiled manual se conserva sin cambios. Las reglas reutilizables están en [patrones-exteriores.md](patrones-exteriores.md); el comprobador de solo lectura es `scripts/check-tiled-inner-corners.py`.

Las imágenes adjuntas son renders de los tiles reales. `NO01_comparacion.png` muestra la propuesta anterior y la revisión final de Jaime; `NO01_Puerto_preview.png` muestra el mapa final completo. Este cierre visual no publica el mapa ni activa conexiones nuevas.
