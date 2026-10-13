// Datos SINTÉTICOS para desarrollo, staging y rendimiento (SQAP, Sección 7.2; riesgo R07).
// Nunca se cargan datos reales de estudiantes fuera de producción.
//   npm run -w api seed        → 1 curso de prueba con usuarios de cada rol
//   npm run -w api seed:perf   → además 40 cursos × 60 estudiantes y ~2400 notas (etapa Rendimiento)
// Contraseña de todos los usuarios: SEED_PASSWORD (por defecto Calis2026!).
import 'reflect-metadata';
import { fakerES as faker } from '@faker-js/faker';
import { DataSource, type EntityManager } from 'typeorm';
import { AuthService } from '../modules/auth/auth.service';
import { DIMENSIONES_RM_001_2026 } from '../modules/calculo/reglas';
import {
  Actividad,
  AsignacionMateria,
  Curso,
  DimensionEvaluacion,
  Estudiante,
  Gestion,
  Materia,
  Nivel,
  Nota,
  OrigenCambio,
  RegistroAuditoria,
  Rol,
  Trimestre,
  UnidadEducativa,
  Usuario,
  VinculoPadre,
} from './entities';
import { cargarEnv } from './cargar-env';
import { opcionesBaseDeDatos } from './typeorm.config';

const MATERIAS = [
  'Matemática',
  'Comunicación y Lenguajes',
  'Ciencias Naturales',
  'Ciencias Sociales',
];

async function crearCurso(
  tx: EntityManager,
  gestion: Gestion,
  paralelo: string,
  profesor: Usuario,
  dims: DimensionEvaluacion[],
  trimestre: Trimestre,
  cantidad: number,
  conNotas: boolean,
) {
  const curso = await tx.save(Curso, {
    gestion,
    nivel: Nivel.SECUNDARIA,
    anioEscolaridad: 3,
    paralelo,
  });
  const estudiantes = await tx.save(
    Estudiante,
    Array.from({ length: cantidad }, () => ({
      nombres: faker.person.firstName(),
      apellidos: faker.person.lastName(),
      curso,
    })),
  );
  for (const nombre of MATERIAS) {
    const materia = await tx.save(Materia, { nombre, curso });
    await tx.save(AsignacionMateria, { materia, profesor });
    for (const d of dims) {
      // La primera actividad de cada dimensión queda sin notas para la prueba E2E de registro.
      await tx.save(Actividad, { nombre: `${d.nombre} 1`, materia, trimestre, dimension: d });
      const llena = await tx.save(Actividad, {
        nombre: `${d.nombre} 2`,
        materia,
        trimestre,
        dimension: d,
      });
      if (!conNotas) continue;
      for (const e of estudiantes) {
        const valor = faker.number.int({ min: 35, max: 100 });
        const nota = await tx.save(Nota, { actividad: llena, estudiante: e, valor });
        await tx.insert(RegistroAuditoria, {
          nota,
          usuario: profesor,
          valorAnterior: null,
          valorNuevo: valor,
          origen: OrigenCambio.REGISTRO,
        });
      }
    }
  }
  return estudiantes;
}

async function sembrar() {
  // En una imagen de producción solo siembra si se pide explícitamente (staging define SEMBRAR=1; producción nunca).
  if (process.env.NODE_ENV === 'production' && process.env.SEMBRAR !== '1') {
    throw new Error('Seed rechazado: NODE_ENV=production sin SEMBRAR=1');
  }
  faker.seed(2026);
  const perf = process.env.PERF === '1';
  cargarEnv();
  const ds = await new DataSource(opcionesBaseDeDatos()).initialize();
  if ((await ds.getRepository(Usuario).count()) > 0) {
    console.warn(
      'La base ya tiene datos: no se vuelve a sembrar. Use npm run -w api db:reset primero.',
    );
    await ds.destroy();
    return;
  }
  const hash = await AuthService.hash(process.env.SEED_PASSWORD ?? 'Calis2026!');
  await ds.transaction(async (tx) => {
    const u = (email: string, rol: Rol, nombre: string) =>
      tx.save(Usuario, { email, rol, nombre, hashContrasena: hash });
    await u('admin@calisfacu.test', Rol.ADMINISTRADOR, 'Administración');
    await u('secretaria@calisfacu.test', Rol.SECRETARIA, 'Secretaría');
    const profesor = await u('profesor@calisfacu.test', Rol.PROFESOR, 'Profesora de prueba');
    await u('profesor2@calisfacu.test', Rol.PROFESOR, 'Profesor sin materias');
    const padre = await u('padre@calisfacu.test', Rol.PADRE, 'Padre de prueba');

    const ue = await tx.save(UnidadEducativa, {
      nombre: 'Unidad Educativa de Prueba',
      codigoSie: '80000001',
    });
    const gestion = await tx.save(Gestion, { anio: 2026, unidadEducativa: ue });
    const dims = await tx.save(
      DimensionEvaluacion,
      DIMENSIONES_RM_001_2026.map((d) => ({ ...d, gestion })),
    );
    const [t1] = await tx.save(
      Trimestre,
      [1, 2, 3].map((numero) => ({ gestion, numero })),
    );

    const estudiantes = await crearCurso(tx, gestion, 'A', profesor, dims, t1, 30, true);
    await tx.save(VinculoPadre, { padreId: padre.id, estudianteId: estudiantes[0].id });

    if (perf) {
      for (let i = 0; i < 40; i++) {
        await crearCurso(tx, gestion, `P${i + 1}`, profesor, dims, t1, 60, i < 2);
      }
    }
  });
  const notas = await ds.getRepository(Nota).count();
  console.warn(`Seed listo${perf ? ' (rendimiento)' : ''}: ${notas} notas sintéticas`);
  await ds.destroy();
}

sembrar().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
