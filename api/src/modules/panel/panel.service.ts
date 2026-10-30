import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Estudiante, Gestion, Materia, Trimestre } from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { AsistenciaService } from '../asistencia/asistencia.service';
import { NotasTrimestralesService } from '../calculo/notas-trimestrales.service';
import { NOTA_MINIMA_APROBACION } from '../calculo/reglas';
import { AccesoNotasService } from '../notas/acceso.service';
import { evaluarRiesgo, resumenRiesgo } from './riesgo';

/**
 * Panel de riesgo académico de una materia (US-06, T-043; decisión D18): la nota del trimestre de cada estudiante
 * (US-02) y su asistencia acumulada en la materia (US-19), con el umbral de asistencia de la gestión (D6).
 */
@Injectable()
export class PanelService {
  constructor(
    private readonly acceso: AccesoNotasService,
    private readonly notasTrimestrales: NotasTrimestralesService,
    private readonly asistencia: AsistenciaService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  async riesgo(materiaId: number, usuario: UsuarioToken, trimestreId?: number) {
    const materia = await this.db.getRepository(Materia).findOne({
      where: { id: materiaId },
      relations: { curso: { gestion: true } },
    });
    if (!materia) throw new NotFoundException('La materia no existe');
    await this.acceso.verificarMateria(materia.id, usuario);
    const gestion = materia.curso.gestion;
    const trimestre = await this.trimestre(gestion.id, trimestreId);

    const [notas, asistencias, estudiantes] = await Promise.all([
      this.notasTrimestrales.deMateria(materia.id, trimestre.id, usuario),
      this.asistencia.porcentajes(materia.id, usuario),
      this.db.getRepository(Estudiante).find({
        where: { curso: { id: materia.curso.id } },
        order: { apellidos: 'ASC', nombres: 'ASC' },
      }),
    ]);

    const filas = estudiantes.map((e) => {
      const promedio = notas.find((n) => n.estudianteId === e.id)?.nota ?? null;
      const asist = asistencias.find((a) => a.estudianteId === e.id);
      const porcentajeAsistencia = asist?.porcentaje ?? null;
      return {
        estudianteId: e.id,
        codigoRude: e.codigoRude,
        ci: e.ci,
        estudiante: `${e.apellidos}, ${e.nombres}`,
        promedio,
        porcentajeAsistencia,
        clasesDictadas: asist?.clases ?? 0,
        asistencias: asist ? asist.presentes + asist.licencias : 0,
        ...evaluarRiesgo(promedio, porcentajeAsistencia, gestion.umbralAsistencia),
      };
    });

    return {
      materia: { id: materia.id, nombre: materia.nombre },
      curso: { id: materia.curso.id, nombre: nombreCurso(materia.curso) },
      trimestre: { id: trimestre.id, numero: trimestre.numero, cerrado: trimestre.cerrado },
      umbralAsistencia: gestion.umbralAsistencia,
      umbralNotaMinima: NOTA_MINIMA_APROBACION,
      resumen: resumenRiesgo(filas),
      estudiantes: filas,
    };
  }

  /** Cambia el umbral de asistencia de la gestión (decisión D6); solo el administrador. */
  async cambiarUmbral(gestionId: number, umbralAsistencia: number) {
    const r = await this.db.getRepository(Gestion).update(gestionId, { umbralAsistencia });
    if (!r.affected) throw new NotFoundException('La gestión no existe');
    return { gestionId, umbralAsistencia };
  }

  /** El trimestre pedido (de la misma gestión) o, si no se indica, el primero abierto; si todos cerraron, el último. */
  private async trimestre(gestionId: number, trimestreId?: number) {
    const trimestres = await this.db.getRepository(Trimestre).find({
      where: { gestion: { id: gestionId } },
      order: { numero: 'ASC' },
    });
    const elegido = trimestreId
      ? trimestres.find((t) => t.id === trimestreId)
      : (trimestres.find((t) => !t.cerrado) ?? trimestres.at(-1));
    if (!elegido) throw new NotFoundException('El trimestre no existe en la gestión de la materia');
    return elegido;
  }
}
