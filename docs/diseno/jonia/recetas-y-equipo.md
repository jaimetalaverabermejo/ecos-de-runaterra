# Recetas de Jonia y equipo de líderes

Implementación solicitada por Jaime el 2 de noviembre de 2026. Conserva los ID históricos de Luden y Navori para que no se pierdan objetos de partidas existentes. Los objetos nuevos son adaptaciones de estadísticas al combate por turnos; no se anuncian pasivas de reflejo, regeneración o efectos de League que el motor no haya implementado.

## Legendarios

| Objeto | Estadísticas | Receta | Entrega |
| --- | --- | --- | --- |
| Eco de Luden | Poder 40 | Capítulo perdido + Varita explosiva + 450 oro | Desenlace de las esferas de Syndra |
| Filoveloz de Navori | Ataque 22, velocidad 16 | Fervor + Arco recurvado + 450 oro | Conversación de Yasuo en los Arrozales |
| Fuerza de la Trinidad | Ataque 24, vida 100, velocidad 8 | Bacteriófago + Brillo + Fervor + 600 oro | Defensa de Navori con Irelia |
| Malla de espinas | Defensa 32, vida 100 | Chaleco de espinas + Cinturón de gigante + 450 oro | Encargo posterior al asedio de Navori |
| Rostro espiritual | Resistencia 30, vida 120 | Capucha espectral + Cinturón de gigante + 450 oro | Encargo del paso espiritual del Templo Kinkou |

Los componentes básicos siguen disponibles en el mercader nutria. Hay diez épicos contando el Capítulo perdido de Bandle y cinco legendarios al completar las entregas de Jonia. Warmog queda para una fase posterior.

## Encargos y épicos nuevos

- «Una cuerda bien tensada»: Jao → Wei → Fen → Jao, en los Arrozales. Arco recurvado.
- «El reflejo del muelle»: Ara → Nao → Ara, en We’hle, después del rescate de Lee Sin. Brillo.
- «Cargas para la ribera»: Dai, en el Estuario → capitana Ema, en We’hle → Dai. Cinturón de gigante.
- «Raíces que sostienen»: Lillia → Ivern → Lillia, en Omikayalan, después de abrir el paso. Brazalete cristalino.
- «El paso protegido»: Sao → Mei → Luo → Sao, en el Templo Kinkou, después de escuchar ambas posturas para Shen. Capucha espectral al aceptar y Rostro espiritual al entregar.
- «Volver a proteger Navori»: Jun → Yun, patrullera → Fei → Jun, después de defender Navori. Malla de espinas.

Todos usan los NPC y patrullas existentes. El encargo se puede aplazar; guarda el avance, exige las visitas en orden, permite volver para entregar y no repite oro ni recetas. Tras completarlo se recupera el diálogo habitual del NPC. Las recetas históricas de Yasuo, Syndra e Irelia se recuperan al guardar/cargar partidas que ya cumplan sus condiciones, sin repetir historias ni oro.

## Iconos pendientes

Se reutilizan `epic/arco-curvo.png` y `epic/cinturon.png`. El archivo `epic/chaleco-cristalino.png` representa una armadura, no el nuevo brazalete; `brazalete-buscadora.png` representa otro objeto. No se presentan como iconos definitivos del Brazalete cristalino.

Faltan seis dibujos propios. Mientras tanto se muestran dos componentes existentes, con nombre y marco, usando `iconParts`:

| Objeto | Ruta propuesta del icono definitivo |
| --- | --- |
| Brillo | `public/assets/items/epic/sheen.png` |
| Capucha espectral | `public/assets/items/epic/spectres-cowl.png` |
| Brazalete cristalino | `public/assets/items/epic/crystalline-bracer.png` |
| Fuerza de la Trinidad | `public/assets/items/legendary/trinity-force.png` |
| Malla de espinas | `public/assets/items/legendary/thornmail.png` |
| Rostro espiritual | `public/assets/items/legendary/spirit-visage.png` |

Añadir una imagen requiere registrar después su carga en BootScene. No hay solicitudes a archivos inexistentes ni sustitución de los iconos ya aprobados de Luden y Navori.

## Líderes y dificultad

Lee Sin mantiene dos épicos. Jhin, Ivern, Xayah/Rakan, Akali, Shen y Zed usan legendarios adecuados a su papel junto a épicos; Irelia lleva Trinidad y Navori. Swain lleva Luden y Rostro espiritual; su comandante, Malla de espinas y Bacteriófago. Irelia aliada en el asedio lleva Trinidad y Chaleco de espinas.

No se incrementan niveles ni se conceden huecos ocultos: dos objetos hasta maestría 19, tres desde 20. Las estadísticas y la vida inicial se calculan con el mismo código de combate usado por el jugador. Los primeros jefes de Bandle conservan su progresión inicial. El test verifica el constructor real de once combatientes, sus bonos efectivos y que ninguno tenga objetos fuera de sus huecos.

Validación: `npm run check:crafting`, validaciones generales y compilación. Los tests de las seis misiones resuelven los diálogos seleccionados por sus condiciones reales, prueban aplazamiento, secuencia, guardado/carga, entrega y no repetición. Se ensamblan las cinco cadenas legendarias completas a partir de componentes de tienda y se verifica que un fallo no consuma recursos. La dificultad exacta requiere pruebas de juego con equipos distintos; no se fija una tasa de victoria a partir de las estadísticas.
