# Casas base de Noxus

Ocho plantillas en celdas de 32 × 32. Copia la carpeta public en la raíz del proyecto o abre los TMJ directamente desde el ZIP extraído. Los TSX y PNG incluidos son los atlas reordenados de la última revisión.

| Plantilla | Tamaño | Ubicación orientativa | Celdas alcanzables |
|---|---|---|---|
| Casa humilde · nx-casa-humilde | 11 × 9 | Basilich · casa normal | 32 |
| Casa de arrieros · nx-casa-arrieros | 14 × 10 | Cruce de Caravanas · casa de los arrieros | 50 |
| Casa familiar · nx-casa-familiar | 15 × 11 | Basilich · casa alta | 69 |
| Casa con dormitorios · nx-casa-dos-dormitorios | 18 × 13 | Basilich · casa doble o vivienda del gremio | 103 |
| Casa con taller · nx-casa-taller | 16 × 11 | Capital · barrio de las forjas o Basilich | 75 |
| Casa rural de cuidadores · nx-casa-cuidadores | 15 × 12 | Memorial de Sion · cuidadores o granja litoral | 76 |
| Residencia de comerciante · nx-casa-comerciante | 18 × 12 | Capital · distrito norte o lonja | 100 |
| Casa de huéspedes · nx-casa-hospederia | 19 × 14 | Cruce de Caravanas o capital · posada pequeña | 118 |

Cada casa trae entrada de dos celdas, aparición from_outside, salida marcada en AuthoringNotes y colisiones de paredes y muebles. Al asignar una fachada, convierte el marcador de salida en portal to_outside y apunta al spawn exterior que corresponda. Los destinos y habitantes se asignan al instanciar.

Las ubicaciones son sugerencias basadas en el manifiesto vigente de Noxus. NO06 y los edificios sustituidos por santuarios quedan fuera. Barracones, administración y otras dependencias específicas conservan sus reservas para su futuro diseño.
## Comprobaciones

Se generaron los ocho archivos runtime con el conversor de Tiled del repositorio. En cada planta se comprobó la conexión desde la aparición a todos los tiles transitables, a las dos celdas de salida y al frente o lateral de los muebles sólidos. Se revisó el render de los atlas. Falta comprobar las plantillas en Tiled y en Phaser tras enlazar las fachadas.
