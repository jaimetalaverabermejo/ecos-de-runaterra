# Validación del despliegue de NPC y fauna

11 de octubre de 2026. JO01–JO05 y sus interiores mantienen mapas, conexiones, historia, banderas y servicios existentes.

- 49 nuevas instancias: 28 personas y 21 animales/espíritus. Todas tienen patrulla e interacción propia.
- 19 diseños humanos/vastaya y cinco criaturas nuevas utilizados; cinco diseños de personas y tres criaturas reservados según `despliegue-actores.json`.
- Dos poros viajeros, presencia escasa solicitada por el usuario. Polillas, pajarillos, conejos, sapo y lagartija reutilizan sus assets originales. El zorro queda para sus zonas del bosque.
- Navegador con el juego real: desplazamiento medido en los 49 actores, parada en las 49 conversaciones y desplazamiento posterior al cierre. Otros 20 habitantes comprobados en sus 20 interiores ocupados. Sin errores de JavaScript.
- Los 32 sheets tienen 288×384 y 12 frames de 96×96. A escala 0.70, adultos visibles de aproximadamente 48–55 px; niños 38 px. Captura de Lhradi revisada frente al protagonista. Los campeones conservan sus escalas propias.
- Validación permanente en `prebuild`: ID de actor, diálogo, hábitat, acceso desde llegada, todo el recorrido y esquinas de hitbox sobre suelo libre, sin agua bloqueada, vallas, bordes de salto ni hierbas de encuentros.
- `npm run build`, `node scripts/check-ionia-access.cjs` y `git diff --check` pasan. Entradas, puertas, pistas y hierbas siguen accesibles.

JO06–JO21 existen como archivos Tiled, pero siguen pendientes de integración jugable y validación. No se abren ni se crean NPC en mapas inexistentes en el registro runtime. El guardián del claro permanece reservado como presencia singular de JO11.
