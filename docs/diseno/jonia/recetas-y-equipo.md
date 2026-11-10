# Recetas de Jonia y equipo de líderes

Progresión de campaña de Bandle, Jonia y Noxus. Los ID históricos de Luden y Navori se conservan para las partidas existentes.

## Legendarios

| Objeto | Estadísticas | Receta | Entrega |
| --- | --- | --- | --- |
| Eco de Luden | Poder 24, velocidad 3 | Capítulo perdido + Varita explosiva + 450 oro | Desenlace de las esferas de Syndra |
| Filoveloz de Navori | Ataque 15, velocidad 10 | Fervor + Arco recurvado + 450 oro | Xayah tras el duelo doble del Refugio Vastaya (JO13) |
| Fuerza de la Trinidad | Ataque 16, vida 34, velocidad 5 | Bacteriófago + Brillo + Fervor + 600 oro | Defensa de Navori con Irelia |
| Malla de espinas | Defensa 24, vida 40 | Chaleco de espinas + Cinturón de gigante + 450 oro | Plano reservado para Zaun |
| Rostro espiritual | Resistencia 22, vida 50 | Capucha espectral + Cinturón de gigante + 450 oro | Plano reservado para las Islas de la Sombra |

Los componentes básicos siguen disponibles en el mercader nutria. Hay dos planos en Bandle y nueve en Jonia. El Filo fantasmal de Youmuu se aprende con Zed y se fabrica cuando Réctrice esté disponible en Ixtal. Warmog queda para una fase posterior.

## Encargos y épicos nuevos

- «Una cuerda bien tensada»: Jao → Wei → Fen → Jao, en los Arrozales. Arco recurvado.
- «El reflejo del muelle»: Ara → Nao → Ara, en We’hle, después del rescate de Lee Sin. Brillo.
- «Cargas para la ribera»: Dai, en el Estuario → capitana Ema, en We’hle → Dai. Cristal de rubí. El plano del Cinturón de gigante pasa al depósito de Suministros.
- «Raíces que sostienen»: Lillia → Ivern → Lillia, en Omikayalan, después de abrir el paso. Cristal de rubí. El plano del Brazalete cristalino queda reservado para Piltover.
- «El paso protegido»: Sao → Mei → Luo → Sao, en el Templo Kinkou, después de escuchar ambas posturas para Shen. Mota brillante al aceptar y Manto anulamagia al entregar. Ambos planos pasan a las Islas de la Sombra.
- «Volver a proteger Navori»: Jun → Yun, patrullera → Fei → Jun, después de defender Navori. Armadura de tela. El plano de la Malla de espinas se reserva para Zaun.

Todos usan los NPC y patrullas existentes. El encargo se puede aplazar; guarda el avance, exige las visitas en orden, permite volver para entregar y no repite oro ni recetas. Tras completarlo se recupera el diálogo habitual del NPC. Las partidas anteriores conservan los planos a los que ya tenían acceso. Quien ya ganó el duelo doble puede recoger el Filoveloz hablando con Xayah.

## Noxus y planos de regiones futuras

En Basilich se aprenden Chaleco de espinas y Gema avivadora. El depósito de Suministros concede Cinturón de gigante y Rell entrega Sterak tras localizar al recluta. Vladimir entrega Cetro vampírico en la capital, Talon la Daga dentada en Frontera e Ironspike ofrece Pico y Cuchilla negra. Son encargos breves propios del juego en mapas existentes. La escena de Vladimir se sitúa junto a la casa, en el exterior. [Vladimir](https://www.leagueoflegends.com/es-es/champions/vladimir/) · [Talon](https://www.leagueoflegends.com/es-es/champions/talon/) · [Rell](https://www.leagueoflegends.com/es-es/champions/rell/)

Los 44 planos de capítulos posteriores permanecen bloqueados en campañas nuevas, con la región prevista indicada en el Taller. Los guardados antiguos que cerraron Jonia retienen el lote anterior. El desbloqueo de Youmuu indica dónde se consiguen sus dos componentes.

## Iconos pendientes

Se reutilizan `epic/arco-curvo.png` y `epic/cinturon.png`. El archivo `epic/chaleco-cristalino.png` representa una armadura, no el nuevo brazalete; `brazalete-buscadora.png` representa otro objeto. No se presentan como iconos definitivos del Cristal de rubí. El plano del Brazalete cristalino queda reservado para Piltover.

Faltan seis dibujos propios. Mientras tanto se muestran dos componentes existentes, con nombre y marco, usando `iconParts`:

| Objeto | Ruta propuesta del icono definitivo |
| --- | --- |
| Brillo | `public/assets/items/epic/sheen.png` |
| Capucha espectral | `public/assets/items/epic/spectres-cowl.png` |
| Brazalete cristalino | `public/assets/items/epic/crystalline-bracer.png` |
| Fuerza de la Trinidad | Ataque 16, vida 34, velocidad 5
| Malla de espinas | Defensa 24, vida 40
| Rostro espiritual | Resistencia 22, vida 50

Añadir una imagen requiere registrar después su carga en BootScene. No hay solicitudes a archivos inexistentes ni sustitución de los iconos ya aprobados de Luden y Navori.

## Líderes y dificultad

Lee Sin mantiene dos épicos. Jhin, Ivern, Xayah/Rakan, Akali, Shen y Zed usan legendarios adecuados a su papel junto a épicos; Irelia lleva Trinidad y Navori. Swain lleva Luden y Rostro espiritual; su comandante, Malla de espinas y Bacteriófago. Irelia aliada en el asedio lleva Trinidad y Chaleco de espinas.

No se incrementan niveles ni se conceden huecos ocultos: dos objetos hasta maestría 19, tres desde 20. Las estadísticas y la vida inicial se calculan con el mismo código de combate usado por el jugador. Los primeros jefes de Bandle conservan su progresión inicial. El test verifica el constructor real de once combatientes, sus bonos efectivos y que ninguno tenga objetos fuera de sus huecos.

Validación: `npm run check:crafting`, validaciones generales y compilación. Los tests de las seis misiones resuelven los diálogos seleccionados por sus condiciones reales, prueban aplazamiento, secuencia, guardado/carga, entrega y no repetición. Se ensamblan las cinco cadenas legendarias completas a partir de componentes de tienda y se verifica que un fallo no consuma recursos. La dificultad exacta requiere pruebas de juego con equipos distintos; no se fija una tasa de victoria a partir de las estadísticas.
