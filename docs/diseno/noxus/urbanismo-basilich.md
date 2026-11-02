# Noxus: urbanismo validado en Basilich

Referencia de Jaime: revisión manual `17d230f` de `NO03_Basilich.tmj`, 2 de noviembre de 2026, repositorio `jaimetalaverabermejo/ecos-de-runaterra`, rama `maps/no01-puerto-oriental`. Conservar sus capas visuales. Usar la revisión manual posterior si existe.

## Calles y parcelas

- Representar un imperio sobrio, duro y planificado. Cubrir el interior urbano con tierra marrón, no hierba por defecto ni pavimento gris uniforme. Conservar vegetación fuera de las ciudades y zonas verdes expresamente compuestas.
- Alinear fachadas, cruces, parcelas y equipamientos en ejes coherentes. Crear manzanas, calles perimetrales y conexiones que respondan a una planificación urbana; evitar ramales accidentales entre edificios dispersos.
- Usar las calles oscuras con bordillo del atlas `Noxus_suelos_32.png`, con el mismo principio modular que los caminos rurales. Resolver el tileset y su `firstgid` en cada mapa; nunca trasladar GID absolutos entre mapas.
- El atlas ampliado tiene 12 columnas y 5 filas, 384 × 160 px y 60 celdas. La definición de 48 celdas no incluye las nuevas esquinas. En el repositorio, `Noxus_calles_32.tsx` declara la versión ampliada y evita modificar los rangos históricos de los demás tilesets. Las fuentes antiguas pueden conservar la definición de 48 celdas si no usan la fila nueva.
- Índices locales de la calle: centro 39; borde oeste 40, norte 41, este 42, sur 43; esquinas exteriores NO 44, NE 53, SO 55, SE 54. Con cuatro vecinos cardinales y una diagonal ausente: NO 56, NE 57, SO 59, SE 58. Comprobar cada esquina en un render.
- Mantener calles locales de dos tiles. Permitir tres o cuatro en la capital solo para un eje o plaza con sentido urbanístico. No ensanchar al azar ni prolongar asfalto urbano sobre los caminos rurales de llegada.
- Construir plazas con el mismo sistema de bordes y esquinas, dejando acceso a puertas y espacio ante fachadas. Distinguir una plaza deliberada de un cruce ensanchado por error.

## Murallas y accesos

- Para vallas horizontales del atlas `Noxus_decoracion_32`, usar los índices locales **216 / 217 repetido / 218**, fila 13 y columnas 8 / 9 / 10. Forman pilar, balaustres y pilar. Las piezas 219–221, columnas 11–13, son verticales: no extenderlas por una fila como si fueran postes sueltos. Dejar huecos ante las puertas y comprobar la valla completa en el render.

- Construir los tramos frontales con módulos completos de **2 columnas × 4 filas**, repitiendo la misma fase de izquierda a derecha. No alternar tiles sueltos: las ventanas y almenas de la pareja son diferentes. Insertar el módulo de bandera como pareja completa, con ritmo visual.
- Resolver las esquinas convexas y cóncavas, retranqueos y encuentros laterales con los ensamblajes completos de Basilich. No dejar huecos entre un giro y el siguiente. Mantener los varios giros del contorno.
- En una entrada lateral abierta, componer dos torres o pilares que enmarquen el paso, siguiendo la puerta occidental manual de Basilich. Mantener dos tiles de paso y colisiones en los apoyos; no bloquear el dintel transitable.
- Utilizar vallas, banderas, farolas y decoración sobria para definir parcelas y canalizar el paso por las calles. Colocar las bases sólidas y las vallas en Obstacles/Vallas o con colisión explícita; separar las partes altas que deben dibujarse sobre el jugador. Comprobar que no quedan rutas alternativas accidentales entre parcelas.

## Bastión y desniveles

Revisión posterior de Jaime: dar prioridad a la ciudad exterior. Mantener solo tres o cuatro dependencias pequeñas dentro del segundo recinto y permitir pavimento oscuro continuo en todo ese recinto. Reducir su anchura si se conserva el paseo por ambos flancos y detrás de las torres. En la capital, usar cuatro tiles para el acceso ceremonial, tres para las calles de distrito y dos en los ramales de las puertas; los portones pueden estrechar el paso a su hueco real de dos tiles.

- Mantener el Bastión aprobado y su posición central. Bajar visualmente la muralla norte del segundo recinto para que las torres se superpongan a ella; no deducir una barrera física del rectángulo visual completo del edificio.
- Ensanchar el segundo recinto para recorrer ambos laterales y la parte posterior. Darle vida con archivo, armería, alojamiento, cuartel o pequeños patios; trasladar casas exteriores si hace falta espacio. Separar cubierta/torres en AbovePlayer de la base física.
- Probar un recorrido completo desde la puerta sur, por un flanco, por detrás de las torres y de vuelta por el otro flanco, además de la entrada y retorno del interior del edificio.
- Variar la silueta de plataformas y elevaciones con entrantes y salientes, conservando una escalera bien ensamblada. Revisar uniones de caminos con barrancos y orillas. No sustituir las correcciones manuales por un borde automático aproximado.

## Datos que acompañan los retoques

- Al mover edificios en Tiled, revisar también Collisions, DesignNotes, puntos de interés y futuras puertas: no se desplazan automáticamente con el arte. Reconstruir sus huellas desde la posición visible antes de validar la navegación.
- Comprobar el tamaño real del PNG frente a la definición TSX y los rangos de GID. Una fila añadida puede desplazar los `firstgid` posteriores; conservar el significado del tile y sus bits de transformación.
- Proteger las capas manuales de Basilich y las del Puerto con una comparación anterior/posterior. Renderizar con los tilesets y `firstgid` propios de cada mapa, no con los de una referencia global.

## Decoración y barrios con funciones diferentes

- Comparar la densidad con Basilich a una escala y superficie equivalentes. Una capital mucho mayor requiere bastantes más objetos; no basta con repetir un farol y una bandera cada varios edificios.
- Diferenciar distritos por su contenido: mercado con puestos, mesas de mercancías, tiendas, posada, carga y espacio para compradores; zona militar con cuartel, patio de instrucción, arsenal, forja, carbón, leña y carros; áreas cívicas y residenciales con bancos, jardineras, tablones y pequeños grupos de enseres.
- Equipar las plazas, especialmente la de entrada a la capital, con bancos, jardineras, braseros, bolardos y monumentos. Conservar el eje principal libre. Crear pequeños grupos relacionados con una función; evitar tanto el vacío como la dispersión aleatoria de cajas.
- No superponer dos objetos completos sobre las mismas celdas de decoración ni recortar sus mitades para llenar un hueco. Colocar elementos fuera de los pasos de dos, tres o cuatro tiles que se hayan previsto.
- Comprobar las huellas de las farolas en su base, no en la mitad del poste. Verificar dos tiles de llegada a cada puerta y la anchura completa de los ejes de calle, además de la conectividad global.
