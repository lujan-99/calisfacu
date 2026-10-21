import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import {
  AsignacionMateria,
  DimensionEvaluacion,
  Estudiante,
  Materia,
  Nota,
  Trimestre,
} from '../../database/entities';
import { resumenCurso, resumenGestion } from '../academico/formato';
import { AccesoNotasService } from '../notas/acceso.service';
import { CalculoService } from './calculo.service';

/**
 * Historial académico de un estudiante en su gestión (US-03): cada trimestre con la nota de cada materia del curso,
 * calculada al consultar con CalculoService, y el resumen anual (decisión D12).
 */
@Injectable()
export class HistorialService {
  constructor(
    private readonly calculo: CalculoService,
    private readonly acceso: AccesoNotasService,
    @InjectRepository(Estudiante) private readonly estudiantes: Repository<Estudiante>,
    @InjectRepository(Trimestre) private readonly trimestres: Repository<Trimestre>,
    @InjectRepository(DimensionEvaluacion)
    private readonly dimensiones: Repository<DimensionEvaluacion>,
    @InjectRepository(Materia) private readonly materias: Repository<Materia>,
    @InjectRepository(AsignacionMateria)
    private readonly asignaciones: Repository<AsignacionMateria>,
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
  ) {}

  async deEstudiante(estudianteId: number, usuario: UsuarioToken) {
    const estudiante = await this.estudiantes.findOne({
      where: { id: estudianteId },
      relations: { curso: true, gestion: true },
    });
    if (!estudiante) throw new NotFoundException('El estudiante no existe');
    await this.acceso.verificarEstudiante(estudiante.curso.id, usuario);

    const gestionId = estudiante.gestion.id;
    const [trimestres, dims, materias, asignaciones, notas] = await Promise.all([
      this.trimestres.find({ where: { gestion: { id: gestionId } }, order: { numero: 'ASC' } }),
      this.dimensiones.find({ where: { gestion: { id: gestionId } }, order: { orden: 'ASC' } }),
      this.materias.find({
        where: { curso: { id: estudiante.curso.id } },
        order: { nombre: 'ASC' },
      }),
      this.asignaciones.find({
        where: { materia: { curso: { id: estudiante.curso.id } } },
        relations: { materia: true, profesor: true },
      }),
      this.notas.find({
        where: { estudiante: { id: estudiante.id } },
        relations: { actividad: { materia: true, trimestre: true, dimension: true } },
      }),
    ]);
    const profesorDe = new Map(asignaciones.map((a) => [a.materia.id, a.profesor.nombre]));

    const historial = trimestres.map((t) => {
      const filas = materias.map((m) => {
        const porDimension: Record<string, number[]> = {};
        for (const n of notas) {
          if (n.actividad.materia.id === m.id && n.actividad.trimestre.id === t.id) {
            (porDimension[n.actividad.dimension.codigo] ??= []).push(n.valor);
          }
        }
        const r = this.calculo.notaTrimestral(dims, porDimension);
        return {
          materiaId: m.id,
          materia: m.nombre,
          profesor: profesorDe.get(m.id),
          dimensiones: dims.map((d, i) => ({
            codigo: d.codigo,
            nombre: d.nombre,
            puntos: r.dimensiones[i].puntos,
            puntajeMaximo: d.puntajeMaximo,
          })),
          nota: r.nota,
          aprobado: r.aprobado,
          pendientes: r.pendientes,
        };
      });
      return {
        trimestreId: t.id,
        numero: t.numero,
        cerrado: t.cerrado,
        promedioTrimestral: this.calculo.promedioDeMaterias(filas.map((f) => f.nota)),
        materias: filas,
      };
    });

    return {
      estudiante: {
        id: estudiante.id,
        codigoRude: estudiante.codigoRude,
        ci: estudiante.ci,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        curso: resumenCurso(estudiante.curso),
        gestion: resumenGestion(estudiante.gestion),
      },
      trimestres: historial,
      ...this.calculo.resumenAnual(historial.map((t) => t.promedioTrimestral)),
    };
  }
}
