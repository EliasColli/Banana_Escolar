export const SEED = 2026;

export const CATEGORIES = [
  'Eléctrico',
  'Plomería',
  'Mobiliario',
  'Pintura',
  'Limpieza',
  'Tecnología',
  'Seguridad',
] as const;

export const FIRST_NAMES = [
  'Ana', 'Luis', 'María', 'Jorge', 'Sofía', 'Carlos', 'Valeria', 'Miguel', 'Daniela', 'José',
  'Fernanda', 'Ricardo', 'Paola', 'Alejandro', 'Camila', 'Diego', 'Lucía', 'Manuel', 'Regina', 'Iván',
] as const;

export const LAST_NAMES = [
  'Pérez', 'Gómez', 'López', 'Hernández', 'García', 'Martínez', 'Rodríguez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Vargas', 'Castillo', 'Mendoza', 'Ruiz', 'Ortiz', 'Cruz',
  'Morales', 'Jiménez',
] as const;

export const LOCATIONS = [
  'Edificio A - planta baja',
  'Edificio A - primer piso',
  'Edificio A - segundo piso',
  'Edificio B - laboratorio 1',
  'Edificio B - laboratorio 2',
  'Edificio C - baños',
  'Biblioteca central',
  'Cafetería',
  'Cancha deportiva',
  'Auditorio',
  'Sala de cómputo',
  'Estacionamiento',
  'Dirección académica',
  'Taller de mantenimiento',
  'Patio central',
] as const;

/** Pesos ficticios: baños y laboratorios concentran más incidencias. */
export const LOCATION_WEIGHTS = [
  18, 14, 10, 22, 18, 30, 8, 12, 5, 7, 16, 4, 3, 9, 10,
];

export const RESOLUTION_DAYS_BY_CATEGORY: Record<string, number> = {
  Eléctrico: 3,
  Plomería: 4,
  Mobiliario: 7,
  Pintura: 12,
  Limpieza: 1,
  Tecnología: 8,
  Seguridad: 5,
};

export const DESCRIPTIONS: Record<string, string[]> = {
  Eléctrico: [
    'Un contacto del aula está flojo y genera chispas al conectar equipos.',
    'La lámpara del pasillo parpadea y en ocasiones se apaga por completo.',
    'El interruptor del laboratorio no responde y el área queda sin luz.',
    'Hay un cable expuesto junto al pizarrón que representa un riesgo.',
    'El tablero eléctrico emite un zumbido constante desde ayer.',
  ],
  Plomería: [
    'La llave del lavabo gotea de forma constante y moja el piso.',
    'El baño del edificio C presenta una fuga en la tubería del lavabo.',
    'No hay agua en los sanitarios del primer piso desde la mañana.',
    'El drenaje del patio está tapado y el agua se acumula.',
    'El inodoro del baño de docentes no descarga correctamente.',
  ],
  Mobiliario: [
    'La silla del escritorio tiene una pata rota y no se puede usar.',
    'Una mesa del aula está coja y se mueve al escribir.',
    'El librero de la biblioteca tiene un estante desprendido.',
    'El escritorio de la dirección presenta la gaveta trabada.',
    'Faltan tornillos en la base del pupitre y está inestable.',
  ],
  Pintura: [
    'La pared junto a la ventana presenta humedad y pintura levantada.',
    'El barandal del pasillo tiene la pintura descascarada.',
    'Hay grafiti en la pared del baño del edificio B.',
    'El techo del aula 12 muestra manchas y requiere resane.',
    'La puerta principal tiene la pintura desgastada en la parte inferior.',
  ],
  Limpieza: [
    'El bote de basura del pasillo está saturado y genera mal olor.',
    'Hay vidrios rotos en el patio y es necesario limpiar el área.',
    'El baño del edificio A requiere limpieza profunda.',
    'Se derramó líquido en el laboratorio y el piso está resbaloso.',
    'La cafetería presenta restos de comida en las mesas.',
  ],
  Tecnología: [
    'El proyector del aula no enciende desde el panel de control.',
    'La computadora de la sala 3 no reconoce el teclado.',
    'El internet del edificio B se desconecta cada pocos minutos.',
    'La impresora de la biblioteca marca error de papel constantemente.',
    'El cañón del auditorio muestra la imagen con colores alterados.',
  ],
  Seguridad: [
    'La puerta de emergencia tiene el seguro trabado y no abre.',
    'El extintor del pasillo está vencido y sin señalización.',
    'La cámara de la entrada principal no registra imagen.',
    'Hay un cristal roto en la ventana del laboratorio 2.',
    'El pasillo del edificio C no tiene iluminación de emergencia.',
  ],
};

export const SOLUTION_TEXTS = [
  'Se realizó la reparación y se verificó el funcionamiento del equipo.',
  'Se sustituyó la pieza dañada y se probó el sistema completo.',
  'Se corrigió la falla, se limpió el área y se dejó en condiciones de uso.',
  'Se ajustó el componente y se confirmó con el personal del área.',
  'Se atendió el reporte con material de mantenimiento disponible.',
];

export const SOLUTION_NOTES = [
  'Se recomienda revisar nuevamente en tres meses.',
  'El área quedó operativa al finalizar el trabajo.',
  'Se informó al solicitante sobre la reparación realizada.',
  'No fue necesario reemplazar componentes adicionales.',
  null,
];
