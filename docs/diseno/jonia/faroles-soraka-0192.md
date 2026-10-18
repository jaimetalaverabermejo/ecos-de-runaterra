# Faroles de Soraka · 0.19.2

Se conserva el PNG original de 192×128, con transparencia, sin reescalar ni recortar. El tileset externo usa una cuadrícula de 32×32 (6 columnas, 24 tiles). El farol superior central ocupa los tiles locales 2, 3, 8 y 9.

Sustituciones: dos faroles en JO09 (el descanso previo y la curandera del embarcadero); uno en JO10 (unifica el descanso y la curandera cercana); uno en JO11, JO12 y JO13. Se retiran las farolas provisionales y las dos curanderas, sin tocar los santuarios completos de Soraka.

La interacción restaura equipo y reserva y guarda el punto de regreso. Acercarse no cura ni cambia el checkpoint. Se conserva el acceso local a la Reserva de Ecos. La colisión solo ocupa el pie del farol; la imagen se ordena por la altura de su base, igual que los actores del overworld.

Validación: `node scripts/check-soraka-lanterns.mjs`, comprobaciones de accesibilidad y regresión de historias y compilación completa.
