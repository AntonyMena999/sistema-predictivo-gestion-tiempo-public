const CATEGORY_RULES = [
  {
    categoria: 'Trabajos en grupo',
    keywords: ['grupo', 'grupal', 'equipo', 'colaborativo', 'colaborativa'],
  },
  {
    categoria: 'Estudio personal',
    keywords: [
      'repaso', 'repasos', 'repasar', 'repasando', 'estudio', 'estudios',
      'estudiar', 'estudiando', 'ensayo', 'ensayos', 'ensayar', 'ensayando',
      'memorizar', 'memorizando',
    ],
  },
  {
    categoria: 'Exámenes',
    keywords: [
      'examen', 'examenes', 'prueba', 'pruebas', 'quiz', 'parcial', 'parciales',
      'evaluacion', 'evaluaciones', 'test', 'supletorio', 'supletorios',
      'sustentacion', 'sustentar', 'sustentando', 'defensa', 'defender',
      'defendiendo', 'leccion', 'lecciones',
    ],
  },
  {
    categoria: 'Entregas',
    keywords: [
      'entrega', 'entregas', 'entregar', 'entregando', 'tarea', 'tareas',
      'deber', 'deberes', 'proyecto', 'proyectos', 'informe', 'informes',
      'exposicion', 'exposiciones', 'taller', 'talleres', 'tesis',
      'presentacion', 'presentaciones', 'presentar', 'presentando',
    ],
  },
  {
    categoria: 'Clases',
    keywords: [
      'clase', 'clases', 'laboratorio', 'laboratorios', 'tutoria', 'tutorias',
      'curso', 'cursos',
    ],
  },
];

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const findKeywordIndex = (text, keyword) => {
  const regex = new RegExp(`\\b${keyword}\\b`);
  const match = regex.exec(text);
  return match ? match.index : null;
};

const detectarCategoria = (texto = '') => {
  const normalized = normalizeText(texto);
  let best = null;

  CATEGORY_RULES.forEach((rule, ruleIndex) => {
    rule.keywords.forEach((keyword) => {
      const index = findKeywordIndex(normalized, keyword);
      if (index === null) return;

      if (!best || index < best.index || (index === best.index && ruleIndex < best.ruleIndex)) {
        best = { categoria: rule.categoria, index, ruleIndex };
      }
    });
  });

  return best ? best.categoria : 'Personal';
};

module.exports = {
  detectarCategoria,
  CATEGORY_RULES,
};
