import fs from 'node:fs';

const mappings = {
  teemo: {
    'Guerra de guerrillas': 'sombrio',
    'Dardo cegador': 'tecnologico',
    'Movimiento rápido': 'marcial',
    'Tiro tóxico': 'primordial',
    'Trampa ponzoñosa': 'primordial'
  },
  poppy: {
    'Embajadora de hierro': 'runico',
    'Impacto de martillo': 'marcial',
    'Entereza inalterable': 'runico',
    'Carga heroica': 'marcial',
    'Veredicto de la guardiana': 'runico'
  },
  tristana: {
    'Tiro certero': 'marcial',
    'Tiro rápido': 'marcial',
    'Salto misil': 'marcial',
    'Carga explosiva': 'tecnologico',
    'Tiro destructor': 'marcial'
  },
  lulu: {
    'Pix, el hada compañera': 'espiritual',
    'Lanza reluciente': 'espiritual',
    'Banal': 'arcano',
    '¡Ayuda, Pix!': 'espiritual',
    'Crecimiento salvaje': 'espiritual'
  },
  gnar: {
    'Gen de furia': 'primordial',
    'Bumerán': 'marcial',
    'Híper': 'primordial',
    'Brinco': 'marcial',
    '¡GNAR!': 'primordial',
    'Peñascazo': 'primordial',
    'Golpazo': 'marcial',
    'Sacudida': 'primordial'
  }
};

let applied = 0;
const missing = [];
for (const [championId, byName] of Object.entries(mappings)) {
  const path = `src/contenido/campeones/${championId}/habilidades.json`;
  if (!fs.existsSync(path)) {
    missing.push(`${championId}: no existe ${path}`);
    continue;
  }
  const skills = JSON.parse(fs.readFileSync(path, 'utf8'));
  const seen = new Set();
  for (const skill of skills) {
    const moveType = byName[skill.nombre];
    if (!moveType) continue;
    skill.tipo = moveType;
    seen.add(skill.nombre);
    applied += 1;
  }
  for (const name of Object.keys(byName)) {
    if (!seen.has(name)) missing.push(`${championId}: no se encontró '${name}'`);
  }
  fs.writeFileSync(path, `${JSON.stringify(skills, null, 2)}\n`);
}

if (missing.length) {
  console.error('Asignaciones no aplicadas:\n- ' + missing.join('\n- '));
  process.exit(1);
}
if (applied !== 30) {
  console.error(`Se esperaban 30 asignaciones jugables y se aplicaron ${applied}.`);
  process.exit(1);
}
console.log(`v0.4: ${applied} entradas de tipo de movimiento aplicadas correctamente.`);
