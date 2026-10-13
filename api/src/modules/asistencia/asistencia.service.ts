import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Asistencia, EstadoAsistencia, Estudiante, Materia } from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';
import type { RegistrarAsistenciaDto } from './asistencia.dto';
import { esFechaFutura, esFechaValida, porcentajeAsistencia } from './reglas-asistencia';

/** Registro de asistencia por clase y porcentaje por estudiante (US-19, T-036). */
@Injectable()
export class AsistenciaService {
  constructor(
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  private validarFecha(fecha: string, campo = 'La fecha') {
    if (!esFechaValida(fecha)) {
      throw new BadRequestException(`${campo} debe ser una fecha válida con formato AAAA-MM-DD`);
    }
  }

  /** La materia con su curso y gestión; el profesor debe estar asignado a ella (RNF-04). */
  private async materia(materiaId: number, usuario: UsuarioToken) {
    const materia = await this.db.getRepository(Materia).findOne({
      where: { id: materiaId },
      relations: { curso: { gestion: true } },
    });
    if (!materia) throw new NotFoundException('La materia no existe');
    await this.acceso.verificarMateria(materia.id, usuario);
    return materia;
  }

  private estudiantes(cursoId: number) {
    return this.db.getRepository(Estudiante).find({
      where: { curso: { id: cursoId } },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  /** Lista de la clase de una fecha, con el estado de cada estudiante (null si aún no se tomó). */
  async lista(materiaId: number, fecha: string, usuario: UsuarioToken) {
    this.validarFecha(fecha);
    const materia = await this.materia(materiaId, usuario);
    const [estudiantes, registros] = await Promise.all([
      this.estudiantes(materia.curso.id),
      this.db.getRepository(Asistencia).find({
        where: { materia: { id: materia.id }, fecha },
        relations: { estudiante: true },
      }),
    ]);
    const estadoDe = new Map(registros.map((r) => [r.estudiante.id, r.estado]));
    return {
      materia: materia.nombre,
      fecha,
      filas: estudiantes.map((e) => ({
        estudianteId: e.id,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        estado: estadoDe.get(e.id) ?? null,
      })),
    };
  }

  /**
   * US-19, criterios 1 y 3: guarda (o corrige) la asistencia de una clase. Exige la lista completa del curso, así
   * "clases dictadas" es la misma para todos. Rechaza fechas futuras (hoy en Bolivia) y fuera del año de la gestión.
   */
  async registrar(
    materiaId: number,
    fecha: string,
    dto: RegistrarAsistenciaDto,
    usuario: UsuarioToken,
    ahora = new Date(),
  ) {
    this.validarFecha(fecha);
    const materia = await this.materia(materiaId, usuario);
    if (esFechaFutura(fecha, ahora)) {
      throw new UnprocessableEntityException(
        'No se puede registrar asistencia de una fecha futura',
      );
    }
    if (Number(fecha.slice(0, 4)) !== materia.curso.gestion.anio) {
      throw new UnprocessableEntityException(
        `La fecha no pertenece a la gestión ${materia.curso.gestion.anio}`,
      );
    }

    const ids = dto.registros.map((r) => r.estudianteId);
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException('Un estudiante aparece más de una vez en la lista');
    }
    const estudiantes = await this.estudiantes(materia.curso.id);
    const delCurso = new Set(estudiantes.map((e) => e.id));
    if (ids.some((id) => !delCurso.has(id))) {
      throw new UnprocessableEntityException('La lista incluye estudiantes que no son del curso');
    }
    const enLista = new Set(ids);
    const faltan = estudiantes.filter((e) => !enLista.has(e.id));
    if (faltan.length > 0) {
      const nombres = faltan.map((e) => `${e.apellidos}, ${e.nombres}`).join('; ');
      throw new UnprocessableEntityException(`Falta la asistencia de: ${nombres}`);
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(Asistencia, { materia: { id: materia.id }, fecha });
      await tx.insert(
        Asistencia,
        dto.registros.map((r) => ({
          materia: { id: materia.id },
          estudiante: { id: r.estudianteId },
          fecha,
          estado: r.estado,
        })),
      );
    });
    return { fecha, guardados: dto.registros.length };
  }

  /** US-19, criterio 2: porcentaje de asistencia de cada estudiante de la materia, opcionalmente entre dos fechas. */
  async porcentajes(materiaId: number, usuario: UsuarioToken, desde?: string, hasta?: string) {
    if (desde) this.validarFecha(desde, 'desde');
    if (hasta) this.validarFecha(hasta, 'hasta');
    const materia = await this.materia(materiaId, usuario);
    const consulta = this.db
      .getRepository(Asistencia)
      .createQueryBuilder('a')
      .select('a.estudiante_id', 'estudianteId')
      .addSelect('a.estado', 'estado')
      .addSelect('COUNT(*)::int', 'cantidad')
      .where('a.materia_id = :materiaId', { materiaId: materia.id })
      .groupBy('a.estudiante_id')
      .addGroupBy('a.estado');
    if (desde) consulta.andWhere('a.fecha >= :desde', { desde });
    if (hasta) consulta.andWhere('a.fecha <= :hasta', { hasta });
    const [estudiantes, filas] = await Promise.all([
      this.estudiantes(materia.curso.id),
      consulta.getRawMany<{ estudianteId: number; estado: EstadoAsistencia; cantidad: number }>(),
    ]);

    return estudiantes.map((e) => {
      const de = (estado: EstadoAsistencia) =>
        filas.find((f) => f.estudianteId === e.id && f.estado === estado)?.cantidad ?? 0;
      const conteo = {
        presentes: de(EstadoAsistencia.PRESENTE),
        licencias: de(EstadoAsistencia.LICENCIA),
        ausentes: de(EstadoAsistencia.AUSENTE),
      };
      return {
        estudianteId: e.id,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        ...conteo,
        clases: conteo.presentes + conteo.licencias + conteo.ausentes,
        porcentaje: porcentajeAsistencia(conteo),
      };
    });
  }
}
