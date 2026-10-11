# Jonia: propuesta de NPC y fauna para las 21 zonas

Estado: reparto base y primer despliegue, 11 de octubre de 2026. Basada en `plan-region.json`, `docs/IONIA_MAPS.md` y los mapas Tiled presentes. Los cinco primeros exteriores están integrados; JO06–JO21 existen como material de diseño y todavía no son jugables. Los 21 interiores ya accesibles son adicionales, no nuevas zonas de este reparto.

Los 24 sprites de personas y ocho de criaturas están registrados en el catálogo común `src/contenido/mundo/actores/`. El primer despliegue añade 49 actores ambientales con patrullas e interacciones en JO01–JO05 y viste a los residentes y secundarios existentes conservando sus IDs, servicios e historias. Usa 19 diseños de personas y cinco criaturas nuevas; los otros cinco perfiles y tres criaturas quedan reservados para sus hábitats futuros. El estado por recurso figura en `despliegue-actores.json`. El JSON de reparto base sigue fuera del catálogo runtime.

Excepción solicitada por el usuario: dos poros viajeros en Koeshin y Lhradi. Los poros también habitan Jonia, con mucha menor presencia que en Bandle. No hay encuentros capturables nuevos ni recompensas gratuitas por hablar con esta fauna. JO06–JO21 no se activan en este despliegue.

Este reparto es diseño del juego, no una afirmación de hábitats o asentamientos canónicos.

## Distribución por mapa

Los principales definen la identidad de cada zona. Los ocasionales son variantes y visitas justificadas; no hay que poner todos a la vez. La fauna habitual y ocasional son poblaciones ambientales, no porcentajes de combate ni especies capturables.

| Zona | NPC principales | NPC ocasionales | Fauna habitual | Fauna ocasional |
|---|---|---|---|---|
| JO01 · Koeshin y Senda del Portal | Monje, Sacerdotisa, Peregrino, Anciano | Aldeano, Aldeana, Viajera, Aprendiz Kinkou | Pajarillo de Bandle, Conejo setoso | Ardilla, Polilla de portal |
| JO02 · Acantilados Blancos | Viajera, Peregrino, Pescador | Herborista, Monje | Pajarillo de Bandle, Lagartija mágica | Grulla, Ardilla |
| JO03 · Poblado de Lhradi | Aldeano, Aldeana, Anciano, Anciana, Niño, Niña, Mercader, Artesana, Cocinera | Viajera, Herborista, Miliciana de Navori, Vastaya felino | Pajarillo de Bandle | Conejo setoso, Ardilla |
| JO04 · Camino de los Arrozales | Agricultor, Aldeano, Aldeana, Miliciana de Navori | Anciano, Anciana, Cocinera, Herborista, Viajera | Grulla, Sapo de Bandle, Tortuga de río | Conejo setoso, Jabalí joven |
| JO05 · Placidium de Navori | Sacerdotisa, Monje, Peregrino, Miliciana de Navori | Anciano, Anciana, Mercader, Artesana, Cocinera, Viajera | Pajarillo de Bandle | Polilla de portal, Espíritu de pétalo |
| JO06 · Senda del Estuario | Pescador, Herborista, Viajera | Agricultor, Peregrino, Aldeana | Grulla, Tortuga de río, Sapo de Bandle | Pajarillo de Bandle, Lagartija mágica |
| JO07 · Puerto de We’hle | Pescador, Mercader, Artesana, Cocinera, Viajera, Peregrino | Aldeano, Aldeana, Monje, Vastaya aviar | Pajarillo de Bandle, Grulla | Tortuga de río, Lagartija mágica |
| JO08 · Paso de las Cumbres | Peregrino, Monje, Viajera | Guardián Kinkou | Pajarillo de Bandle, Lagartija mágica | Conejo setoso |
| JO09 · Desembarco del Bosque | Herborista, Viajera, Vastaya felino | Pescador, Vastaya aviar, Anciana vastaya | Zorro feérico, Ardilla, Pajarillo de Bandle | Ciervo del bosque, Polilla de portal, Sapo de Bandle |
| JO10 · Jardín del Olvido | Vastaya cervino, Anciana vastaya | Herborista | Ciervo del bosque, Espíritu de pétalo, Polilla de portal | Zorro feérico, Ardilla, Espíritu de brote |
| JO11 · Omikayalan | Anciana vastaya, Vastaya cervino | Vastaya felino, Herborista | Espíritu de brote, Ciervo del bosque, Ardilla | Zorro feérico, Polilla de portal, Espíritu de pétalo, Guardián del claro |
| JO12 · Sendero de las Raíces | Sacerdotisa, Anciana vastaya, Vastaya cervino | Monje, Vastaya felino | Espíritu de brote, Ardilla, Lagartija mágica | Ciervo del bosque, Polilla de portal, Espíritu de pétalo |
| JO13 · Refugio Vastaya | Vastaya felino, Vastaya aviar, Vastaya cervino, Anciana vastaya | Herborista, Viajera | Ardilla, Pajarillo de Bandle, Zorro feérico | Ciervo del bosque, Espíritu de brote, Espíritu de pétalo, Polilla de portal |
| JO14 · Costa de Fae’lor | Viajera, Miliciana de Navori | Pescador, Herborista | Pajarillo de Bandle, Lagartija mágica | Grulla, Polilla de portal |
| JO15 · Recinto de Fae’lor | Guardián Kinkou, Sacerdotisa | Monje | Polilla de portal | Lagartija mágica |
| JO16 · Poblado de las Órdenes | Aldeano, Aldeana, Mercader, Artesana, Cocinera, Aprendiz Kinkou | Anciano, Anciana, Niño, Niña, Viajera, Guardián Kinkou, Herborista | Pajarillo de Bandle | Conejo setoso, Ardilla |
| JO17 · Templo Kinkou | Aprendiz Kinkou, Guardián Kinkou, Monje, Sacerdotisa | Peregrino, Anciano | Pajarillo de Bandle, Polilla de portal | Espíritu de brote |
| JO18 · Barranco de la Sombra | Adepto de la Sombra | Viajera | Lagartija mágica, Polilla de portal | Jabalí joven |
| JO19 · Camino de los Errantes | Viajera, Peregrino | Guardián Kinkou, Herborista, Mercader | Conejo setoso, Pajarillo de Bandle, Ardilla | Jabalí joven, Zorro feérico, Lagartija mágica |
| JO20 · Santuario de la Prueba | Monje, Sacerdotisa, Guardián Kinkou | Peregrino | Polilla de portal | Espíritu de brote, Espíritu de pétalo |
| JO21 · Islote del Reencuentro | Anciana vastaya, Vastaya aviar | Vastaya felino, Vastaya cervino, Viajera, Pescador | Pajarillo de Bandle, Polilla de portal | Espíritu de pétalo, Zorro feérico |

## Lugar concreto y densidad inicial

Rangos orientativos de actores presentes en el exterior entero; no todos en pantalla ni en un solo claro. Incluyen principales y ocasionales. Las ciudades admiten más habitantes en interiores, repartidos por función.

| Zona | Personas | Criaturas | Ubicación y reservas |
|---|---|---|---|
| JO01 | 4–6 | 3–5 | Patio y casa para habitantes; peregrinos en senda; fauna en jardines, lejos del portal y de la conversación de Yi. |
| JO02 | 2–4 | 3–5 | Pescador solo en la cala accesible; grulla en poza o desembocadura, no sobre cornisa seca. Dejar libres puentes y mirador de Wukong. |
| JO03 | 8–12 | 2–4 | Oficios en mercado y talleres; familias en patios; vastaya felino como residente o visitante con diálogo propio, no como decoración de arena. |
| JO04 | 4–7 | 5–8 | Agricultores junto a campos; fauna acuática en orillas transitables; jabalí solo en lindero boscoso, lejos de la plaza de la casa. |
| JO05 | 6–9 | 2–4 | Fauna escasa en jardines laterales. Milicia patrulla plazas amplias; no ocupa pasos de 4–5 tiles ni escenario final de Irelia. |
| JO06 | 3–5 | 5–8 | Pescadores en embarcaderos; agricultor únicamente junto a huertos. No colocar personas ni fauna en el altar sellado de Varus. |
| JO07 | 7–10 | 3–5 | Vastaya aviar como pasajero ocasional; tortuga solo junto a una desembocadura de agua dulce. Mantener libre el patio de Lee Sin y la maniobra del barco. |
| JO08 | 2–4 | 2–4 | Peregrinos en descansos ensanchados. Guardián Kinkou en un puesto de enlace, no un cuartel; sin familias, mercado ni fauna de humedal. |
| JO09 | 3–5 | 5–8 | Pescador solo en embarcadero; sapo en ribera. Vastaya como guías de entrada; proteger el espacio del refugio de Ahri. |
| JO10 | 1–3 | 6–9 | Pocos habitantes; espíritus de pétalo junto a flores y ciervos en claros. Dejar vacío el centro de la prueba de Lillia. |
| JO11 | 1–3 | 6–9 | Un solo guardián del claro, en el gran sauce o árbol especial: encuentro singular tras restaurar el claro. No ocupa el papel de Ivern ni de Daisy. |
| JO12 | 2–4 | 5–8 | Personas en umbral y pequeñas terrazas; espíritus entre raíces. Reservar la cámara y reliquias de Yunara, sin repetir el guardián singular. |
| JO13 | 6–9 | 4–7 | Los cuatro diseños vastaya tienen aquí su núcleo residencial. Herborista o viajera humana solo invitadas tras ganar confianza; reservar el claro de combate doble de Xayah/Rakan. |
| JO14 | 2–4 | 3–5 | Campamento pequeño y vigilado; pescador solo en ribera segura y grulla en poza costera. Los vastaya no forman una aldea aquí. |
| JO15 | 1–3 | 1–3 | Los guardianes en el acceso exterior; sacerdotisa como custodia o investigadora del sello. Fauna tenue en ruinas exteriores; cámara de Syndra despejada. |
| JO16 | 7–10 | 2–4 | Aprendices entrenan en patio; aldeanos y servicios en viviendas. No mezclar adeptos de la Sombra como vecinos habituales; reservar misión y patio de Akali. |
| JO17 | 4–7 | 2–4 | Patrullas y aprendices en patios transitables. Cámara de equilibrio de Shen libre; brote únicamente en jardín del templo. |
| JO18 | 3–5 | 2–4 | Viajera excepcional en acceso exterior, no dentro del dojo. Jabalí solo en matorral del borde; sin niños, comercio, campesinos, Kinkou o vastaya residentes. Cámara de Kayn sigue sellada. |
| JO19 | 2–4 | 4–6 | Mercader ambulante solo en descanso ensanchado. Jabalí en bosque lateral; no poblar los puntos de resonancia de Yasuo/Yone con dobles de los campeones. |
| JO20 | 2–4 | 2–4 | Espíritus en jardín o umbral; arena y mecanismos de la prueba despejados. Evitar fauna mundana abundante. |
| JO21 | 2–4 | 3–5 | Pocas presencias elegidas para el epílogo; pescador en embarcadero. Los vastaya visitantes requieren vínculo narrativo con el refugio; centro de reunión y santuario libres. |

## Referencia inversa: los 24 NPC

Usar estos IDs en el campo `actorId` de los futuros NPC. Una imagen puede vestir varias instancias con nombres, diálogos y patrullas diferentes.

| Diseño / actorId | Zonas principales | Zonas ocasionales |
|---|---|---|
| Aldeano · `ionia-aldeano` | JO03, JO04, JO16 | JO01, JO07 |
| Aldeana · `ionia-aldeana` | JO03, JO04, JO16 | JO01, JO06, JO07 |
| Anciano · `ionia-anciano` | JO01, JO03 | JO04, JO05, JO16, JO17 |
| Anciana · `ionia-anciana` | JO03 | JO04, JO05, JO16 |
| Niño · `ionia-nino` | JO03 | JO16 |
| Niña · `ionia-nina` | JO03 | JO16 |
| Agricultor · `ionia-agricultor` | JO04 | JO06 |
| Pescador · `ionia-pescador` | JO02, JO06, JO07 | JO09, JO14, JO21 |
| Herborista · `ionia-herborista` | JO06, JO09 | JO02, JO03, JO04, JO10, JO11, JO13, JO14, JO16, JO19 |
| Mercader · `ionia-mercader` | JO03, JO07, JO16 | JO05, JO19 |
| Artesana · `ionia-artesana` | JO03, JO07, JO16 | JO05 |
| Cocinera · `ionia-cocinera` | JO03, JO07, JO16 | JO04, JO05 |
| Viajera · `ionia-viajera` | JO02, JO06, JO07, JO08, JO09, JO14, JO19 | JO01, JO03, JO04, JO05, JO13, JO16, JO18, JO21 |
| Peregrino · `ionia-peregrino` | JO01, JO02, JO05, JO07, JO08, JO19 | JO06, JO17, JO20 |
| Monje · `ionia-monje` | JO01, JO05, JO08, JO17, JO20 | JO02, JO07, JO12, JO15 |
| Sacerdotisa · `ionia-sacerdotisa` | JO01, JO05, JO12, JO15, JO17, JO20 | — |
| Aprendiz Kinkou · `ionia-aprendiz-kinkou` | JO16, JO17 | JO01 |
| Guardián Kinkou · `ionia-guardian-kinkou` | JO15, JO17, JO20 | JO08, JO16, JO19 |
| Adepto de la Sombra · `ionia-adepto-sombra` | JO18 | — |
| Miliciana de Navori · `ionia-miliciana-navori` | JO04, JO05, JO14 | JO03 |
| Vastaya felino · `ionia-vastaya-felino` | JO09, JO13 | JO03, JO11, JO12, JO21 |
| Vastaya aviar · `ionia-vastaya-aviar` | JO13, JO21 | JO07, JO09 |
| Vastaya cervino · `ionia-vastaya-cervino` | JO10, JO11, JO12, JO13 | JO21 |
| Anciana vastaya · `ionia-anciana-vastaya` | JO10, JO11, JO12, JO13, JO21 | JO09 |

## Las ocho criaturas nuevas y seis reutilizadas

Las seis de Bandle conservan sus IDs y PNG existentes: no se duplican ni se vuelven a subir. La polilla de portal cubre el papel visual de mariposa/polilla mágica. Los drakalops se reservan para Bandle; los poros aparecen escasamente en Jonia por petición expresa del usuario.

| Criatura / actorId | Origen | Zonas habituales | Zonas ocasionales |
|---|---|---|---|
| Ciervo del bosque · `ionia-ciervo-del-bosque` | Jonia | JO10, JO11 | JO09, JO12, JO13 |
| Grulla · `ionia-grulla` | Jonia | JO04, JO06, JO07 | JO02, JO14 |
| Ardilla · `ionia-ardilla` | Jonia | JO09, JO11, JO12, JO13, JO19 | JO01, JO02, JO03, JO10, JO16 |
| Jabalí joven · `ionia-jabali-joven` | Jonia | — | JO04, JO18, JO19 |
| Tortuga de río · `ionia-tortuga-de-rio` | Jonia | JO04, JO06 | JO07 |
| Espíritu de brote · `ionia-espiritu-de-brote` | Jonia | JO11, JO12 | JO10, JO13, JO17, JO20 |
| Espíritu de pétalo · `ionia-espiritu-de-petalo` | Jonia | JO10 | JO05, JO11, JO12, JO13, JO20, JO21 |
| Guardián del claro · `ionia-guardian-del-claro` | Jonia | — | JO11 |
| Zorro feérico · `fae-fox` | Bandle | JO09, JO13 | JO10, JO11, JO19, JO21 |
| Polilla de portal · `portal-moth` | Bandle | JO10, JO15, JO17, JO18, JO20, JO21 | JO01, JO05, JO09, JO11, JO12, JO13, JO14 |
| Pajarillo de Bandle · `messenger-bird` | Bandle | JO01, JO02, JO03, JO05, JO07, JO08, JO09, JO13, JO14, JO16, JO17, JO19, JO21 | JO06 |
| Conejo setoso · `fuzzy-rabbit` | Bandle | JO01, JO19 | JO03, JO04, JO08, JO16 |
| Sapo de Bandle · `bandle-toad` | Bandle | JO04, JO06 | JO09 |
| Lagartija mágica · `magic-lizard` | Bandle | JO02, JO08, JO12, JO14, JO18 | JO06, JO07, JO15, JO19 |

## Criterios de despliegue

- Vastaya: núcleo residencial en JO13; cervinos y anciana en JO10–JO12; felinos en JO09 y JO13; aviares en JO13 y JO21. La visita a Lhradi o We’hle es una excepción narrativa con oficio o motivo. Evitar convertir cualquier tipo en relleno de todos los mapas.
- Familias, niños y ancianos humanos: casas, plazas y patios seguros de JO03 y JO16; pequeñas presencias en Koeshin o Navori. Sin menores en acantilados peligrosos, barranco o recinto sellado.
- Agricultores: JO04 y huertos de JO06. Pescadores: cala JO02, estuario JO06, puerto JO07 y embarcaderos; no en arrozales secos, cumbres o templos.
- Kinkou: JO16–JO17 y puestos justificados en JO08, JO15, JO19 o JO20. Adeptos de la Sombra: JO18. No mezclar órdenes enfrentadas en patrullas neutrales sin evento escrito.
- Guardianes del bosque: un único guardián del claro en JO11, ligado al gran sauce/árbol especial. Es una criatura singular, no un reemplazo de Ivern o Daisy; reservar su encuentro y limitarlo a un ejemplar.
- Grullas, tortugas y sapos: agua y ribera transitable; no colocarlos sobre agua bloqueada, paredes ni puentes. Ardillas, ciervos, zorros y conejos: claros y lindes. Jabalíes: matorral exterior, no calles.
- Espíritus: jardines, raíces y lugares de resonancia del bosque; pequeñas excepciones en jardines de templos. Omikayalan y Jardín del Olvido deben tener más fauna que personas.
- Todos los NPC se mueven sobre suelo transitable. Comerciantes y custodios patrullan un pequeño espacio junto a su servicio; aldeanos pasean y aprendices entrenan. Ninguno queda estático por ser guardián o vendedor. Probar desplazamiento, pausa al hablar y reanudación antes de aprobar el despliegue.
- Frames: 96×96, hoja 288×384, filas abajo/arriba/izquierda/derecha, columnas paso A/reposo/paso B; secuencia 1,0,1,2. NEAREST. El espíritu de pétalo conserva anclaje corporal para flotar; no añadirle apoyo de pies.
- Escala inicial 0.70 para los nuevos actores: adultos de unos 76 px visibles quedan cerca de 53 px en mundo frente a 52 px del protagonista. Esta cifra procede de medir los PNG, no de una prueba dentro de los mapas: verificarla al colocar los actores. Los niños y criaturas pequeñas siguen siendo menores; el guardián es más ancho.
- No tocar las escalas de Bandle en esta subida. Compararlas en escena al reutilizar su fauna; evitar normalizar todos los animales a la misma altura.
- Respetar caminos de dos tiles y pasos estrechos del Placidium. Patrullas siempre en descansos o plazas; no bloquear portales, puertas, arenas, mecanismos, altar de Varus ni cámara de Kayn.

## Interiores y personajes ya presentes

Reutilizar diseños según función: mercader para tiendas, artesana para taller y tramoyistas, cocinera para cocinas, sacerdotisa para guardianas de santuario, ancianos y familias para casas. Las casas de Arrozales usan agricultor; las de Placidium, peregrinos o monjes. Evitar animales grandes en interiores.

Las instancias actuales conservan IDs, condiciones y servicios. Aya utiliza la artesana, Meilin y la guardiana del Placidium la sacerdotisa, y los mercaderes de Lhradi el diseño humano de mercader. Los residentes tienen diálogos propios de su función. Los personajes campeones mantienen sus propios assets.

## Orden recomendado

1. Poblar los cinco exteriores activos y sus interiores; resolver las personas que aún no tienen sprite específico sin duplicar instancias narrativas.
2. Estuario, We’hle y Cumbres al activar JO06–JO08.
3. Bosque JO09–JO13: introducir la fauna común primero, después espíritus y guardián singular; construir la identidad del refugio vastaya.
4. Fae’lor, órdenes y cierre JO14–JO21 según se activen sus mapas y eventos.

Para trasladar esta propuesta a datos, usar `distribucion-actores.json`. Verificar puntos de aparición y recorridos en Tiled antes de crear entradas en `src/contenido/mundo/npcs/`.
