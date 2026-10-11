# Recursos gráficos para el siguiente salto de calidad

Las figuras geométricas servían para distinguir familias, pero no son el acabado adecuado para flechas o manos. El ritmo y las distancias ya pueden corregirse con código. El siguiente paso gráfico necesita recursos dibujados coherentes con los sprites existentes.

## Primer paquete recomendado

| Recurso | Tamaño por frame | Frames | Uso |
|---|---:|---:|---|
| Flecha limpia | 48×16 | 4 | Varus; asta fina, punta legible y estela separada |
| Dardo | 24×8 | 3 | Teemo; silueta pequeña y clara |
| Pluma/cuchilla | 48×24 | 4 | Xayah y Rakan; dos variantes de color |
| Shuriken | 32×32 | 6 | Kennen/Zed; giro real sin deformación |
| Corte diagonal | 96×96 | 8 | Espadas; variantes ascendente/descendente |
| Corte circular | 128×128 | 8 | Garen/Wukong; arco limpio y disipación |
| Impacto de contacto | 64×64 | 6 | Puños/martillos; destello y partículas, sin dibujar una mano flotante |
| Onda/conos de energía | 128×64 | 8 | Sett W, fuego y ondas; emisión, expansión e impacto |

PNG con fondo transparente, un atlas horizontal por recurso, sin texto ni fondo. La estela no debe impedir reconocer el proyectil. Dar punto de anclaje, dirección de emisión y momento de contacto de cada secuencia. Mantener grosor de contorno, paleta y textura de los recursos actuales; evitar un look de icono plano o vectorial. El motor puede invertir el atlas para el otro lado del combate.

## Lo que Sett necesita de verdad

El mayor avance vendría de poses del propio Sett, no de un icono de puño colocado sobre el rival. Propongo dos hojas —espalda del jugador y frente del rival— con cuatro frames de 320×320: anticipación, primer puñetazo, segundo puñetazo y recuperación. Mantener exactamente la proporción, ropa, contorno y posición de los pies del PNG actual. El efecto de contacto se reproduce aparte, sincronizado con la mano.

El siguiente personaje para poses sería Garen o Yi: preparación, contacto del filo y recuperación, en ambas orientaciones. Empezaría con estos dos personajes y el paquete de proyectiles/cortes, revisando el acabado en combate antes de producir poses para los 32 campeones.

Hasta tener esos recursos, el juego conserva sus sprites existentes, aumenta el tiempo legible de la acción y utiliza trazos de impacto abstractos. Se ha retirado la mano geométrica de Sett y afinado la silueta de flechas/dardos como mejora provisional. Este documento es una propuesta de producción; los atlas dibujados aún no están creados.
