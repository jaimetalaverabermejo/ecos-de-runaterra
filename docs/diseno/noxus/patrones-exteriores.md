# Noxus: patrones validados en NO01

Usar como autoridad `public/assets/world/regions/Jonia/Zones/JO01_Koeshin/NO01_Puerto.tmj` del repositorio `jaimetalaverabermejo/ecos-de-runaterra`, rama `maps/no01-puerto-oriental`, revisión manual de Jaime `806156c` (01/11/2026), o una revisión manual posterior. Mantener su ubicación provisional hasta autorizar una reorganización. No regenerar esta fuente desde los scripts de las propuestas anteriores.

## Esquinas interiores y cruces

Resolver `firstgid` del tileset `EdR_Ground` actual. La tabla muestra los GID cuando `firstgid=1` y los índices locales base cero, no valores universales.

Aplicar la tabla cuando los cuatro vecinos cardinales son camino y falta exactamente un vecino diagonal. El cuadrante ausente corresponde a la hierba, no a la esquina opuesta de la celda. No confundir este caso con los bordes exteriores de una curva.

| Diagonal fuera del camino | GID de referencia | Índice local | Ejemplo NO01 (x, y desde cero) |
| --- | --- | --- | --- |
| Noroeste | 273 | 272 | (24, 13) |
| Noreste | 272 | 271 | (25, 3) |
| Suroeste | 238 | 237 | (45, 4) |
| Sureste | 237 | 236 | (25, 4) |

El error de la primera propuesta invertía las parejas `237 ↔ 273` y `238 ↔ 272`. No corregirlo girando toda la capa ni sustituyendo todos los números a ciegas: comprobar el vecindario y los bits de transformación. En la versión manual hay 21 esquinas de este tipo verificadas. Usar `scripts/check-tiled-inner-corners.py` para una comprobación de solo lectura.

## Caminos, bordes y puentes

- Mantener caminos de dos tiles, excepcionalmente tres en Noxus si la composición lo justifica; conservar plazas amplias.
- Integrar el camino en la banda de tierra que ya existe junto al acantilado. No prolongar dos bordes verdes como una pista independiente hasta el tablero. Abrir la unión y componer las esquinas donde ambos suelos se encuentran.
- Examinar Ground, GroundDetails y Paths conjuntamente. No modificar la silueta de la costa para disimular una unión incorrecta.
- Tomar el puente inferior como ejemplo: columnas 12–13; se retiraron los remates de Paths en filas 42 y 48 y se integraron los encuentros de las filas 41 y 49. Conservar el tablero y la roca bajo el puente.
- Dibujar ramificaciones con un destino reconocible: conexión, objetivo, edificio, mirador o recompensa. No restaurar el ramal decorativo sin destino eliminado por Jaime en columnas 14–21, filas 35–38.

## Vegetación y cierres

- Mantener hierba bajo los bosques y evitar claros artificiales de tierra. Mezclar individualmente verdes oscuros, amarillos y rojos; no separar por grandes bloques de color.
- Elegir una selección de las especies de referencia adecuada a cada mapa; no hay obligación de usarlas todas. Reducir la densidad interior y mantener continuidad donde los árboles delimitan la navegación.
- Permitir excepcionalmente algún árbol sobre el suelo gris de la franja próxima al acantilado para cerrar el paso. No imponer una validación que fuerce hierba bajo todos los árboles. Conservar la roca estructural y evitar árboles en agua, tableros o accesos.
- Comprobar las colisiones de copas, troncos y objetos después de mover un árbol: no dejar bloqueos invisibles en huecos recién abiertos ni pasos por detrás de los cierres.
- Si se cierra temporalmente una carretera por control militar, usar soldados y un aviso comprensible en lugar de rocas sueltas sobre el camino. Mantener la escala humana; una guardia estática requiere la excepción de movimiento solicitada por Jaime y documentada. Esta excepción no autoriza NPC estáticos en general.
- Mantener coherencia en los desniveles bajos. NO01 incluye un segundo salto en la fila 26, columnas 20–25, con rocas laterales en (19,26) y (26,26). Conservarlo y verificar bajada y ruta de regreso; no añadir barrancos altos por defecto.

## Cierre de la referencia

Dar NO01 por cerrado visualmente con la revisión de Jaime y usar sus soluciones en los siguientes mapas. Guardar una referencia no autoriza publicar el juego, fusionar la propuesta ni construir los otros nueve mapas sin encargo.
