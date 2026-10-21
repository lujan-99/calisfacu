import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource, In } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import {
  AsignacionMateria,
  EntregaNotas,
  Gestion,
  Materia,
  Trimestre,
} from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { AccesoNotasService } from '../notas/acceso.service';
import { requisitosEntrega } from './reglas-entregas';

type Conteo = { id: number; total: string }[];
const porId = (filas: Conteo) => new Map(filas.map((f) => [Number(f.id), Number(f.total)]));

/** Control de entrega de notas por curso (US-10, T-040; decisión D13). */
@Injectable()
export class EntregasService {
  constructor(
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** Trimestre pedido, o el primero abierto de la gestión (la última si no se indica). */
  private async trimestre(trimestreId?: number, gestionId?: number) {
    const repo = this.db.getRepository(Trimestre);
    if (trimestreId) {
      const t = await repo.findOne({ where: { id: trimestreId }, relations: { gestion: true } });
      if (!t || (gestionId && t.gestion.id !== gestionId)) {
        throw new NotFoundException('El trimestre no existe en esa gestión');
      }
      return t;
    }
    const gestion = await this.db.getRepository(Gestion).findOne({
      where: gestionId ? { id: gestionId } : {},
      order: { anio: 'DESC' },
    });
    if (!gestion) throw new NotFoundException('La gestión no existe');
    const trimestres = await repo.find({
      where: { gestion: { id: gestion.id } },
      relations: { gestion: true },
      order: { numero: 'ASC' },
    });
    const t = trimestres.find((x) => !x.cerrado) ?? trimestres.at(-1);
    if (!t) throw new NotFoundException('La gestión no tiene trimestres');
    return t;
  }

  /** Estado de entrega de cada materia en el trimestre, con los conteos del criterio 2. */
  private async resumenes(trimestre: Trimestre, materias: Materia[]) {
    if (materias.length === 0) return [];
    const ids = materias.map((m) => m.id);
    const [asignaciones, entregas, actividades, notas, estudiantes] = await Promise.all([
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
      // Solo cuentan las notas de los estudiantes que hoy están en el curso de la materia.
      this.db.query<Conteo>(
        `SELECT a.materia_id AS id, COUNT(*) AS total FROM notas n
         JOIN actividades a ON a.id = n.actividad_id
         JOIN materias m ON m.id = a.materia_id
         JOIN estudiantes e ON e.id = n.estudiante_id AND e.curso_id = m.curso_id
         WHERE a.trimestre_id = $1 AND a.materia_id = ANY($2) GROUP BY a.materia_id`,
        [trimestre.id, ids],
      ),
      this.db.query<Conteo>(
        `SELECT curso_id AS id, COUNT(*) AS total FROM estudiantes
         WHERE curso_id = ANY($1) GROUP BY curso_id`,
        [[...new Set(materias.map((m) => m.curso.id))]],
      ),
    ]);
    const profesorDe = new Map(asignaciones.map((a) => [a.materia.id, a.profesor]));
    const entregaDe = new Map(entregas.map((x) => [x.materia.id, x]));
    const [nActividades, nNotas, nEstudiantes] = [actividades, notas, estudiantes].map(porId);

    return materias.map((m) => {
      const conteo = {
        totalActividades: nActividades.get(m.id) ?? 0,
        totalEstudiantes: nEstudiantes.get(m.curso.id) ?? 0,
        totalNotasRegistradas: nNotas.get(m.id) ?? 0,
      };
      const { totalNotasRequeridas, notasFaltantes } = requisitosEntrega(conteo);
      const profesor = profesorDe.get(m.id);
      const entrega = entregaDe.get(m.id);
      return {
        materiaId: m.id,
        materia: m.nombre,
        cursoId: m.curso.id,
        curso: nombreCurso(m.curso),
        profesorId: profesor?.id ?? null,
        profesor: profesor?.nombre ?? 'Sin asignar',
        trimestreId: trimestre.id,
        trimestreNumero: trimestre.numero,
        estado: entrega ? ('ENTREGADO' as const) : ('PENDIENTE' as const),
        fechaEntrega: entrega?.entregadoEn.toISOString() ?? null,
        ...conteo,
        totalNotasRequeridas,
        notasFaltantes,
      };
    });
  }

  /** Criterio 1: todas las materias de la gestión, ordenadas por curso y nombre. */
  async control(gestionId?: number, trimestreId?: number) {
    const t = await this.trimestre(trimestreId, gestionId);
    const materias = await this.db.getRepository(Materia).find({
      where: { curso: { gestion: { id: t.gestion.id } } },
      relations: { curso: true },
      order: { curso: { nivel: 'ASC', anioEscolaridad: 'ASC', paralelo: 'ASC' }, nombre: 'ASC' },
    });
    return this.resumenes(t, materias);
  }

  private async materiaYTrimestre(materiaId: number, trimestreId: number, usuario: UsuarioToken) {
    const materia = await this.db.getRepository(Materia).findOne({
      where: { id: materiaId },
      relations: { curso: { gestion: true } },
    });
    if (!materia) throw new NotFoundException('La materia no existe');
    await this.acceso.verificarMateria(materia.id, usuario);
    const t = await this.trimestre(trimestreId, materia.curso.gestion.id);
    return { materia, t };
  }

  async estado(materiaId: number, trimestreId: number, usuario: UsuarioToken) {
    const { materia, t } = await this.materiaYTrimestre(materiaId, trimestreId, usuario);
    const [resumen] = await this.resumenes(t, [materia]);
    return resumen;
  }

  /** Criterio 2: el profesor asignado entrega la materia solo si no falta ninguna nota. */
  async entregar(materiaId: number, trimestreId: number, usuario: UsuarioToken) {
    const { materia, t } = await this.materiaYTrimestre(materiaId, trimestreId, usuario);
    if (t.cerrado) {
      throw new UnprocessableEntityException(
        'El trimestre está cerrado: ya no se pueden entregar notas',
      );
    }
    const [antes] = await this.resumenes(t, [materia]);
    if (antes.estado === 'ENTREGADO') {
      throw new ConflictException('La materia ya se entregó en este trimestre');
    }
    const requisitos = requisitosEntrega(antes);
    if (!requisitos.puedeEntregar) throw new UnprocessableEntityException(requisitos.razon);
    try {
      await this.db
        .getRepository(EntregaNotas)
        .insert({ materia, trimestre: t, profesor: { id: usuario.id } });
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictException('La materia ya se entregó en este trimestre');
      }
      throw error;
    }
    const [entrega] = await this.resumenes(t, [materia]);
    return {
      exito: true,
      mensaje: `Se entregaron las notas de ${materia.nombre} del trimestre ${t.numero}.`,
      entrega,
    };
  }
}
