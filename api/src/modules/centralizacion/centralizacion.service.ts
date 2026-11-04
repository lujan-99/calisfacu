import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource, In, LessThanOrEqual } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import {
  AsignacionMateria,
  Centralizacion,
  Curso,
  DimensionEvaluacion,
  EntregaNotas,
  Estudiante,
  Materia,
  Nota,
  Trimestre,
} from '../../database/entities';
import { nombreCurso, nombreNivel } from '../academico/formato';
import { CalculoService } from '../calculo/calculo.service';
import type { DatosExportacion } from './exportacion';
import {
  materiasPendientes,
  observacion,
  observacionEstudiante,
  resumenPlanilla,
  textoPendientes,
  type MateriaCurso,
} from './planilla';

type Conteo = { id: number; total: string }[];
const porId = (filas: Conteo) => new Map(filas.map((f) => [Number(f.id), Number(f.total)]));

/**
 * Centralización de notas por curso y trimestre (US-09, T-057; decisión D21): la planilla consolidada con la nota
 * trimestral de cada materia (US-02, calculada al consultar con CalculoService), la validación de las materias
 * pendientes de entrega (US-10) y el cierre del trimestre cuando están centralizados todos los cursos de la gestión.
 */
@Injectable()
export class CentralizacionService {
  constructor(
    private readonly calculo: CalculoService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  private async cursoYTrimestre(cursoId: number, trimestreId: number) {
    const curso = await this.db.getRepository(Curso).findOne({
      where: { id: cursoId },
      relations: { gestion: { unidadEducativa: true } },
    });
    if (!curso) throw new NotFoundException('El curso no existe');
    const trimestre = await this.db
      .getRepository(Trimestre)
      .findOne({ where: { id: trimestreId }, relations: { gestion: true } });
    if (!trimestre || trimestre.gestion.id !== curso.gestion.id) {
      throw new NotFoundException('El trimestre no existe en la gestión del curso');
    }
    return { curso, trimestre };
  }

  private async materiasDelCurso(curso: Curso, trimestre: Trimestre) {
    const materias = await this.db.getRepository(Materia).find({
      where: { curso: { id: curso.id } },
      order: { nombre: 'ASC' },
    });
    if (materias.length === 0) return [];
    const ids = materias.map((m) => m.id);
    const [asignaciones, entregas, actividades, notas] = await Promise.all([
      this.db.getRepository(AsignacionMateria).find({
        where: { materia: { id: In(ids) } },
        relations: { materia: true, profesor: true },
      }),
      this.db.getRepository(EntregaNotas).find({
        where: { trimestre: { id: trimestre.id }, materia: { id: In(ids) } },
        relations: { materia: true },
      }),
      this.db.query<Conteo>(
        `SELECT materia_id AS id, COUNT(*) AS total FROM actividades
         WHERE trimestre_id = $1 AND materia_id = ANY($2) GROUP BY materia_id`,
        [trimestre.id, ids],
      ),
      this.db.query<Conteo>(
        `SELECT a.materia_id AS id, COUNT(*) AS total FROM notas n
         JOIN actividades a ON a.id = n.actividad_id
         JOIN estudiantes e ON e.id = n.estudiante_id AND e.curso_id = $3
         WHERE a.trimestre_id = $1 AND a.materia_id = ANY($2) GROUP BY a.materia_id`,
        [trimestre.id, ids, curso.id],
      ),
    ]);
    const profesorDe = new Map(asignaciones.map((a) => [a.materia.id, a.profesor.nombre]));
    const entregadas = new Set(entregas.map((x) => x.materia.id));
    const [nActividades, nNotas] = [actividades, notas].map(porId);
    return materias.map((m): MateriaCurso => ({
      id: m.id,
      nombre: m.nombre,
      profesor: profesorDe.get(m.id) ?? null,
      entregada: entregadas.has(m.id),
      totalActividades: nActividades.get(m.id) ?? 0,
      totalNotasRegistradas: nNotas.get(m.id) ?? 0,
    }));
  }

  /** Nota trimestral (US-02) de cada estudiante en cada materia: estudianteId → materiaId → nota. */
  private async notasTrimestre(
    trimestre: Trimestre,
    materias: readonly { id: number }[],
    estudiantes: readonly Estudiante[],
  ) {
    const [dims, notas] = await Promise.all([
      this.db.getRepository(DimensionEvaluacion).find({
        where: { gestion: { id: trimestre.gestion.id } },
        order: { orden: 'ASC' },
      }),
      materias.length === 0 || estudiantes.length === 0
        ? Promise.resolve([] as Nota[])
        : this.db.getRepository(Nota).find({
            where: {
              estudiante: { id: In(estudiantes.map((e) => e.id)) },
              actividad: {
                trimestre: { id: trimestre.id },
                materia: { id: In(materias.map((m) => m.id)) },
              },
            },
            relations: { estudiante: true, actividad: { materia: true, dimension: true } },
          }),
    ]);
    const agrupadas = new Map<string, Record<string, number[]>>();
    for (const n of notas) {
      const clave = `${n.estudiante.id}:${n.actividad.materia.id}`;
      const porDimension = agrupadas.get(clave) ?? {};
      (porDimension[n.actividad.dimension.codigo] ??= []).push(n.valor);
      agrupadas.set(clave, porDimension);
    }
    const resultado = new Map<number, Map<number, number | null>>();
    for (const e of estudiantes) {
      const fila = new Map<number, number | null>();
      for (const m of materias) {
        fila.set(
          m.id,
          this.calculo.notaTrimestral(dims, agrupadas.get(`${e.id}:${m.id}`) ?? {}).nota,
        );
      }
      resultado.set(e.id, fila);
    }
    return resultado;
  }

  private estudiantes(cursoId: number) {
    return this.db.getRepository(Estudiante).find({
      where: { curso: { id: cursoId } },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  /** Criterio 1: la planilla consolidada del curso con todas sus materias. */
  async planilla(cursoId: number, trimestreId: number) {
    const { curso, trimestre } = await this.cursoYTrimestre(cursoId, trimestreId);
    const [materias, estudiantes, centralizacion] = await Promise.all([
      this.materiasDelCurso(curso, trimestre),
      this.estudiantes(curso.id),
      this.db.getRepository(Centralizacion).findOne({
        where: { curso: { id: curso.id }, trimestre: { id: trimestre.id } },
        relations: { centralizadoPor: true },
      }),
    ]);
    const notas = await this.notasTrimestre(trimestre, materias, estudiantes);
    const pendientes = materiasPendientes(materias, estudiantes.length);

    const filas = estudiantes.map((e, i) => {
      const deEstudiante = notas.get(e.id) ?? new Map<number, number | null>();
      const valores = materias.map((m) => deEstudiante.get(m.id) ?? null);
      return {
        numero: i + 1,
        estudianteId: e.id,
        codigoRude: e.codigoRude,
        ci: e.ci,
        apellidos: e.apellidos,
        nombres: e.nombres,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        notas: Object.fromEntries(materias.map((m, j) => [m.id, valores[j]])),
        promedioTrimestral: this.calculo.promedioDeMaterias(valores),
        materiasReprobadas: valores.filter((v) => observacion(v) === 'REPROBADO').length,
        observacion: observacionEstudiante(valores),
      };
    });

    return {
      curso: {
        id: curso.id,
        nombre: nombreCurso(curso),
        nivel: curso.nivel,
        nivelNombre: nombreNivel(curso.nivel),
        anioEscolaridad: curso.anioEscolaridad,
        paralelo: curso.paralelo,
      },
      gestion: { id: curso.gestion.id, anio: curso.gestion.anio },
      trimestre: { id: trimestre.id, numero: trimestre.numero, cerrado: trimestre.cerrado },
      unidadEducativa: {
        nombre: curso.gestion.unidadEducativa.nombre,
        codigoSie: curso.gestion.unidadEducativa.codigoSie,
      },
      todasEntregadas: materias.length > 0 && pendientes.length === 0,
      materiasPendientes: pendientes,
      materias: materias.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        profesor: m.profesor ?? 'Sin asignar',
      })),
      filas,
      resumen: resumenPlanilla(filas),
      centralizado: Boolean(centralizacion),
      fechaCentralizacion: centralizacion?.centralizadoEn.toISOString() ?? null,
      centralizadoPor: centralizacion
        ? { id: centralizacion.centralizadoPor.id, nombre: centralizacion.centralizadoPor.nombre }
        : null,
    };
  }

  /**
   * Criterios 1 y 3: centraliza el curso solo si todas sus materias entregaron las notas del trimestre; si no, lista
   * las pendientes. Con `cerrarTrimestre`, además cierra el trimestre si ya están centralizados todos los cursos de la
   * gestión (el trimestre es de la gestión, no del curso); si falta alguno, no centraliza ni cierra nada.
   */
  async ejecutar(
    cursoId: number,
    trimestreId: number,
    cerrarTrimestre: boolean,
    usuario: UsuarioToken,
  ) {
    const antes = await this.planilla(cursoId, trimestreId);
    if (antes.trimestre.cerrado) {
      throw new UnprocessableEntityException('El trimestre ya está cerrado');
    }
    if (antes.materias.length === 0) {
      throw new UnprocessableEntityException(
        'El curso no tiene materias: no hay notas que centralizar',
      );
    }
    if (!antes.todasEntregadas) {
      throw new UnprocessableEntityException(
        `No se puede centralizar: faltan entregar las notas de ${textoPendientes(antes.materiasPendientes)}`,
      );
    }
    if (antes.centralizado) {
      throw new ConflictException('Las notas de este curso ya están centralizadas en el trimestre');
    }

    await this.db.transaction(async (m) => {
      if (cerrarTrimestre) {
        const faltan = await this.cursosSinCentralizar(antes.gestion.id, trimestreId, cursoId);
        if (faltan.length > 0) {
          throw new UnprocessableEntityException(
            `No se puede cerrar el trimestre: faltan centralizar ${faltan.join(', ')}`,
          );
        }
      }
      try {
        await m.getRepository(Centralizacion).insert({
          curso: { id: cursoId },
          trimestre: { id: trimestreId },
          centralizadoPor: { id: usuario.id },
        });
      } catch (e) {
        if (!esDuplicado(e)) throw e;
        throw new ConflictException(
          'Las notas de este curso ya están centralizadas en el trimestre',
        );
      }
      if (cerrarTrimestre) await m.getRepository(Trimestre).update(trimestreId, { cerrado: true });
    });

    const centralizador = await this.planilla(cursoId, trimestreId);
    return {
      exito: true,
      mensaje: cerrarTrimestre
        ? `Se centralizaron las notas de ${centralizador.curso.nombre} y se cerró el trimestre ${centralizador.trimestre.numero}.`
        : `Se centralizaron las notas de ${centralizador.curso.nombre} del trimestre ${centralizador.trimestre.numero}.`,
      centralizador,
    };
  }

  /** Cursos de la gestión con materias, salvo `exceptoCursoId`, que no tienen su centralización del trimestre. */
  private async cursosSinCentralizar(
    gestionId: number,
    trimestreId: number,
    exceptoCursoId: number,
  ) {
    const [materias, hechas] = await Promise.all([
      // Un curso sin materias no tiene notas que centralizar: no detiene el cierre.
      this.db.getRepository(Materia).find({
        where: { curso: { gestion: { id: gestionId } } },
        relations: { curso: true },
        order: { curso: { nivel: 'ASC', anioEscolaridad: 'ASC', paralelo: 'ASC' } },
      }),
      this.db.getRepository(Centralizacion).find({
        where: { trimestre: { id: trimestreId } },
        relations: { curso: true },
      }),
    ]);
    const centralizados = new Set(hechas.map((c) => c.curso.id));
    const cursos = [...new Map(materias.map((m) => [m.curso.id, m.curso])).values()];
    return cursos
      .filter((c) => c.id !== exceptoCursoId && !centralizados.has(c.id))
      .map((c) => nombreCurso(c));
  }

  /**
   * Datos de la planilla oficial (T-058, criterio 2): la consolidada del trimestre y, por materia, la nota de cada
   * trimestre de la gestión hasta el centralizado. Solo se exporta un curso ya centralizado.
   */
  async exportacion(cursoId: number, trimestreId: number): Promise<DatosExportacion> {
    const consolidada = await this.planilla(cursoId, trimestreId);
    if (!consolidada.centralizado) {
      throw new UnprocessableEntityException(
        'Primero centralice las notas del curso: la planilla oficial se exporta después de centralizar',
      );
    }
    const [trimestres, estudiantes] = await Promise.all([
      this.db.getRepository(Trimestre).find({
        where: {
          gestion: { id: consolidada.gestion.id },
          numero: LessThanOrEqual(consolidada.trimestre.numero),
        },
        relations: { gestion: true },
        order: { numero: 'ASC' },
      }),
      this.estudiantes(cursoId),
    ]);
    const todos = await this.db
      .getRepository(Trimestre)
      .count({ where: { gestion: { id: consolidada.gestion.id } } });
    const porTrimestre: Map<number, Map<number, number | null>>[] = [];
    for (const t of trimestres) {
      porTrimestre.push(await this.notasTrimestre(t, consolidada.materias, estudiantes));
    }

    const materias = consolidada.materias.map((m) => ({
      nombre: m.nombre,
      profesor: m.profesor,
      filas: estudiantes.map((e, i) => {
        const notas = porTrimestre.map((mapa) => mapa.get(e.id)?.get(m.id) ?? null);
        // D3: la nota anual existe con las notas de todos los trimestres de la gestión.
        const completas = notas.length === todos && notas.every((n) => n !== null);
        const notaAnual = completas ? this.calculo.notaAnual(notas) : null;
        return {
          numero: i + 1,
          estudiante: `${e.apellidos}, ${e.nombres}`,
          notas,
          notaAnual,
          observacion: observacion(completas ? notaAnual : notas[notas.length - 1]),
        };
      }),
    }));

    return {
      unidadEducativa: consolidada.unidadEducativa,
      gestion: consolidada.gestion.anio,
      curso: consolidada.curso,
      trimestre: consolidada.trimestre.numero,
      totalTrimestres: todos,
      fechaCentralizacion: consolidada.fechaCentralizacion,
      consolidada: {
        materias: consolidada.materias.map((m) => m.nombre),
        filas: consolidada.filas.map((f) => ({
          numero: f.numero,
          estudiante: f.estudiante,
          notas: consolidada.materias.map((m) => f.notas[m.id]),
          promedio: f.promedioTrimestral,
          observacion: f.observacion,
        })),
        resumen: consolidada.resumen,
      },
      materias,
    };
  }
}
