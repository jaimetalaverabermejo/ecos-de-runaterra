# Fichas de combate simplificadas

- Nombre y, debajo, `m8`/`m18` como un único texto azul con la fuente habitual,
  tamaño uniforme y peso normal. No se escala el número por separado.
- Sin tipos en las fichas ni botones nuevos de información. Los ataques
  conservan sus tipos y sus indicaciones de efectividad/objetivo.
- Estados sobre la barra: ATU, AIR, DOR, POL, DES, REC, ENC, PRO, INM, CEG,
  VEN y QUE. Quemadura roja y por los aires marrón. INM sigue siendo
  inmovilización: impide cambiar de Eco, no atacar. No se modifica ninguna
  mecánica de estado.
- Se agrupan condiciones repetidas por tipo y se retiran al caducar. Se priorizan
  las que impiden actuar. Hasta cinco placas caben en el espacio reservado;
  si hay más, la última indica cuántas adicionales hay (`+N`). Las variaciones
  de estadísticas, evasión y precisión no ocupan esa fila.
- Barras con anchura fija: 280 px en 1v1 y 194 px en equipos, igual que antes.
  El escudo aparece blanco dentro de la misma barra y se actualiza al absorber
  daño o caducar. No hay icono de escudo adicional.
- Un pequeño par de eslabones rúnicos azules sobre los puntos de vida del rival
  indica una especie ya vinculada en el registro de la partida. Sin sello para
  aliados, rivales no vinculados o combatientes humanos. Showdown sin partida
  no muestra vínculos inventados.
- Se conservan cargas, marcas, invocaciones y recursos activos en sus espacios
  propios. No se añaden separadores interiores a los paneles.

`CombatHud.ts` contiene los elementos compartidos por las escenas individuales
y de equipos. Son formas/textos Phaser; no hacen falta nuevos PNG.

`node scripts/check-combat-hud.mjs` comprueba las funciones reales de dibujo:
maestría normal, múltiples estados, caducidad, overflow, ancho fijo, escudos
y vínculo. También forma parte de la compilación.
