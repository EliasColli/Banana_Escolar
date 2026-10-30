import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Eléctrico',
  'Plomería',
  'Mobiliario',
  'Pintura',
  'Limpieza',
  'Tecnología',
  'Seguridad',
];

const FIRST_NAMES = [
  'Ana', 'Luis', 'María', 'Jorge', 'Sofía', 'Carlos', 'Valeria', 'Miguel', 'Daniela', 'José',
  'Fernanda', 'Ricardo', 'Paola', 'Alejandro', 'Camila', 'Diego', 'Lucía', 'Manuel', 'Regina', 'Iván',
];

const LAST_NAMES = [
  'Pérez', 'Gómez', 'López', 'Hernández', 'García', 'Martínez', 'Rodríguez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Vargas', 'Castillo', 'Mendoza', 'Ruiz', 'Ortiz', 'Cruz',
  'Morales', 'Jiménez',
];

function buildName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const secondLast = LAST_NAMES[(Math.floor(index / 7) + index) % LAST_NAMES.length];
  return `${first} ${last} ${secondLast}`;
}

async function seedCatalogs(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const nombre of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { nombre },
      create: { nombre },
      update: {},
    });
    map.set(nombre, category.id);
  }
  console.log(`Categorías: ${map.size}`);
  return map;
}

async function seedUsers(): Promise<{ admins: number[]; technicians: number[]; requesters: number[] }> {
  const adminPassword = await hashPassword('Admin123!');
  const techPassword = await hashPassword('Tecnico123!');
  const userPassword = await hashPassword('Usuario123!');

  const admins: number[] = [];
  const technicians: number[] = [];
  const requesters: number[] = [];

  for (let index = 0; index < 2; index += 1) {
    const correo = index === 0 ? 'admin@banana.local' : `admin${index + 1}@banana.local`;
    const user = await prisma.user.upsert({
      where: { correo },
      create: {
        nombre: index === 0 ? 'Administrador Banana' : `Administrador ${index + 1}`,
        correo,
        passwordHash: adminPassword,
        rol: Role.ADMIN,
      },
      update: { rol: Role.ADMIN, activo: true },
    });
    admins.push(user.id);
  }

  for (let index = 1; index <= 8; index += 1) {
    const correo = `tecnico${index}@banana.local`;
    const user = await prisma.user.upsert({
      where: { correo },
      create: {
        nombre: buildName(index * 5 + 3),
        correo,
        passwordHash: techPassword,
        rol: Role.TECNICO,
      },
      update: { rol: Role.TECNICO, activo: true },
    });
    technicians.push(user.id);
  }

  for (let index = 1; index <= 200; index += 1) {
    const correo = `usuario${index}@banana.local`;
    const user = await prisma.user.upsert({
      where: { correo },
      create: {
        nombre: buildName(index),
        correo,
        passwordHash: userPassword,
        rol: Role.USUARIO,
      },
      update: { rol: Role.USUARIO, activo: true },
    });
    requesters.push(user.id);
  }

  console.log(`Usuarios: ${admins.length} admin, ${technicians.length} técnicos, ${requesters.length} solicitantes`);
  return { admins, technicians, requesters };
}

async function seedDemoReports(
  categories: Map<string, number>,
  users: { technicians: number[]; requesters: number[] },
): Promise<void> {
  const existing = await prisma.report.count();
  if (existing > 0) {
    console.log(`Reportes existentes: ${existing}. No se generan datos demo.`);
    return;
  }

  const categoryIds = Array.from(categories.values());
  const locations = [
    'Edificio A - planta baja',
    'Edificio A - primer piso',
    'Edificio B - laboratorio 1',
    'Edificio B - laboratorio 2',
    'Biblioteca',
    'Cafetería',
    'Cancha deportiva',
    'Baños edificio C',
  ];
  const descriptions = [
    'La llave del lavabo gotea de forma constante y moja el piso.',
    'Un contacto eléctrico del aula no tiene tapa y está expuesto.',
    'La silla del escritorio tiene una pata rota y no se puede usar.',
    'La pared junto a la ventana presenta humedad y pintura levantada.',
    'El bote de basura del pasillo está saturado y genera mal olor.',
    'El proyector del aula no enciende desde el panel de control.',
    'La puerta de emergencia tiene el seguro trabado y no abre.',
  ];

  let counter = 0;
  const now = Date.now();
  for (let index = 0; index < 48; index += 1) {
    const createdAt = new Date(now - (47 - index) * 36 * 60 * 60 * 1000);
    const isCompleted = index % 3 !== 2;
    const technicianId = users.technicians[index % users.technicians.length];
    const requesterId = users.requesters[index % users.requesters.length];

    const year = createdAt.getUTCFullYear();
    const counterRow = await prisma.folioCounter.upsert({
      where: { year },
      create: { year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const folio = `REP-${year}-${String(counterRow.lastValue).padStart(5, '0')}`;
    counter += 1;

    const report = await prisma.report.create({
      data: {
        folio,
        usuarioId: requesterId,
        categoriaId: categoryIds[index % categoryIds.length],
        tecnicoId: technicianId,
        descripcion: descriptions[index % descriptions.length],
        ubicacion: locations[index % locations.length],
        prioridad: index % 5 === 0 ? 'alta' : 'media',
        estado: isCompleted ? 'completado' : 'en_proceso',
        creadoEn: createdAt,
        asignadoEn: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
      },
    });

    if (isCompleted) {
      await prisma.solution.create({
        data: {
          reporteId: report.id,
          tecnicoId: technicianId,
          descripcion: 'Se realizó la reparación y se verificó el funcionamiento.',
          resueltoEn: new Date(createdAt.getTime() + (1 + (index % 4)) * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log(`Reportes demo: ${counter}`);
}

async function main(): Promise<void> {
  console.log('Seed Banana Escolar — datos ficticios');
  const categories = await seedCatalogs();
  const users = await seedUsers();

  if (process.env.SEED_DEMO_REPORTS === 'true') {
    await seedDemoReports(categories, users);
  }

  console.log('Seed completado.');
  console.log('Credenciales demo: admin@banana.local / Admin123!');
  console.log('                   tecnico1@banana.local / Tecnico123!');
  console.log('                   usuario1@banana.local / Usuario123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
