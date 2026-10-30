import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Asistencia, EstadoAsistencia, Estudiante } from '../../database/entities';
import { nombreCurso, nombreNivel } from '../academico/formato';
import { porcentajeAsistencia } from '../asistencia/reglas-asistencia';
import { CalculoService } from '../calculo/calculo.service';
import { HistorialService } from '../calculo/historial.service';
import type { DatosBoletin } from './contenido';

/**
 * Datos del boletín de un estudiante (US-07, T-045): las notas salen del historial (US-03), así son iguales a las que
 * muestra el sistema; la nota anual de cada materia es la de D3 y la asistencia, la acumulada por materia (D5).
 */
@Injectable()
export class BoletinService {
  constructor(
    private readonly historial: HistorialService,
    private readonly calculo: CalculoService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** El historial ya comprueba que el profesor dé clases al curso (US-03, criterio 2). */
  async datos(estudianteId: number, usuario: UsuarioToken): Promise<DatosBoletin> {
    const h = await this.historial.deEstudiante(estudianteId, usuario);
    const [estudiante, conteos] = await Promise.all([
      this.db.getRepository(Estudiante).findOneOrFail({
        where: { id: estudianteId },
        relations: { curso: true, gestion: { unidadEducativa: true } },
      }),
      this.db
        .getRepository(Asistencia)
        .createQueryBuilder('a')
        .select('a.materia_id', 'materiaId')
        .addSelect('a.estado', 'estado')
        .addSelect('COUNT(*)::int', 'cantidad')
        .where('a.estudiante_id = :estudianteId', { estudianteId })
        .groupBy('a.materia_id')
        .addGroupBy('a.estado')
        .getRawMany<{ materiaId: number; estado: EstadoAsistencia; cantidad: number }>(),
    ]);
    const contar = (estado: EstadoAsistencia, materiaId?: number) =>
      conteos
        .filter(
          (f) => f.estado === estado && (materiaId === undefined || f.materiaId === materiaId),
        )
        .reduce((s, f) => s + f.cantidad, 0);
    const asistenciaDe = (materiaId?: number) =>
      porcentajeAsistencia({
        presentes: contar(EstadoAsistencia.PRESENTE, materiaId),
        licencias: contar(EstadoAsistencia.LICENCIA, materiaId),
        ausentes: contar(EstadoAsistencia.AUSENTE, materiaId),
      });

    const materiasBase = h.trimestres[0]?.materias ?? [];
    const materias = materiasBase.map((m) => {
      const notas = h.trimestres.map(
        (t) => t.materias.find((x) => x.materiaId === m.materiaId)?.nota ?? null,
      );
      const conNota = notas.filter((n): n is number => n !== null);
      // D3: la nota anual existe cuando están las notas de todos los trimestres.
      const notaAnual =
        conNota.length > 0 && conNota.length === notas.length
          ? this.calculo.notaAnual(conNota)
          : null;
      return {
        materiaId: m.materiaId,
        nombre: m.materia,
        profesor: m.profesor ?? null,
        notas,
        notaAnual,
        aprobado: notaAnual === null ? null : this.calculo.aprobado(notaAnual),
        porcentajeAsistencia: asistenciaDe(m.materiaId),
      };
    });

    const { curso, gestion } = estudiante;
    return {
      unidadEducativa: {
        nombre: gestion.unidadEducativa.nombre,
        codigoSie: gestion.unidadEducativa.codigoSie,
      },
      gestion: { id: gestion.id, anio: gestion.anio },
      estudiante: {
        id: estudiante.id,
        codigoRude: estudiante.codigoRude,
        ci: estudiante.ci,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
      },
      curso: {
        id: curso.id,
        nombre: nombreCurso(curso),
        nivel: curso.nivel,
        nivelNombre: nombreNivel(curso.nivel),
        anioEscolaridad: curso.anioEscolaridad,
        paralelo: curso.paralelo,
      },
      trimestres: h.trimestres.map((t) => ({ id: t.trimestreId, numero: t.numero })),
      materias,
      promediosTrimestrales: h.trimestres.map((t) => t.promedioTrimestral),
      promedioAnual: h.promedioAnual,
      estadoAnual: h.estadoAnual,
      porcentajeAsistencia: asistenciaDe(),
    };
  }
}
