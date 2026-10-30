import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import {
  Curso,
  EntregaNotas,
  Materia,
  PublicacionBoletin,
  Trimestre,
} from '../../database/entities';
import { CalculoService } from '../calculo/calculo.service';
import type { DatosBoletin } from './contenido';

/**
 * Publicación del boletín por curso y trimestre (US-11, T-050; decisión D20). El padre ve solo los trimestres
 * publicados; se publica cuando todas las materias del curso entregaron sus notas (US-10, D13).
 */
@Injectable()
export class PublicacionesService {
  constructor(
    private readonly calculo: CalculoService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** Estado de cada trimestre del curso: cuántas materias entregaron y si ya se publicó. */
  async listar(cursoId: number) {
    const curso = await this.curso(cursoId);
    const [trimestres, materias, entregas, publicaciones] = await Promise.all([
      this.db.getRepository(Trimestre).find({
        where: { gestion: { id: curso.gestion.id } },
        order: { numero: 'ASC' },
      }),
      this.db.getRepository(Materia).find({
        where: { curso: { id: curso.id } },
        order: { nombre: 'ASC' },
      }),
      this.db.getRepository(EntregaNotas).find({
        where: { materia: { curso: { id: curso.id } } },
        relations: { materia: true, trimestre: true },
      }),
      this.db.getRepository(PublicacionBoletin).find({
        where: { curso: { id: curso.id } },
        relations: { trimestre: true, publicadoPor: true },
      }),
    ]);
    return trimestres.map((t) => {
      const entregadas = new Set(
        entregas.filter((x) => x.trimestre.id === t.id).map((x) => x.materia.id),
      );
      const p = publicaciones.find((x) => x.trimestre.id === t.id);
      return {
        trimestreId: t.id,
        numero: t.numero,
        cerrado: t.cerrado,
        materias: materias.length,
        materiasPendientes: materias.filter((m) => !entregadas.has(m.id)).map((m) => m.nombre),
        publicado: Boolean(p),
        publicadoEn: p?.publicadoEn ?? null,
        publicadoPor: p ? { id: p.publicadoPor.id, nombre: p.publicadoPor.nombre } : null,
      };
    });
  }

  async publicar(cursoId: number, trimestreId: number, usuario: UsuarioToken) {
    const estado = (await this.listar(cursoId)).find((t) => t.trimestreId === trimestreId);
    if (!estado) throw new NotFoundException('El trimestre no existe en la gestión del curso');
    if (estado.materias === 0) {
      throw new UnprocessableEntityException(
        'El curso no tiene materias: no hay boletín que publicar',
      );
    }
    if (estado.materiasPendientes.length > 0) {
      throw new UnprocessableEntityException(
        `Faltan entregar las notas de: ${estado.materiasPendientes.join(', ')}`,
      );
    }
    try {
      await this.db.getRepository(PublicacionBoletin).insert({
        curso: { id: cursoId },
        trimestre: { id: trimestreId },
        publicadoPor: { id: usuario.id },
      });
    } catch (e) {
      if (!esDuplicado(e)) throw e;
      throw new ConflictException('El boletín de ese trimestre ya está publicado');
    }
    return (await this.listar(cursoId)).find((t) => t.trimestreId === trimestreId);
  }

  /** Por si se publicó por error: el padre deja de ver ese trimestre. */
  async despublicar(cursoId: number, trimestreId: number) {
    const r = await this.db.getRepository(PublicacionBoletin).delete({
      curso: { id: cursoId },
      trimestre: { id: trimestreId },
    });
    if (!r.affected) throw new NotFoundException('El boletín de ese trimestre no está publicado');
  }

  async publicadas(cursoId: number) {
    return this.db.getRepository(PublicacionBoletin).find({
      where: { curso: { id: cursoId } },
      relations: { trimestre: true },
      order: { publicadoEn: 'DESC' },
    });
  }

  /**
   * El boletín como lo ve el padre (criterio 2): las notas de los trimestres sin publicar no se muestran, y la nota
   * anual y el estado del año esperan a que estén publicados todos.
   */
  soloPublicado(datos: DatosBoletin, publicados: ReadonlySet<number>): DatosBoletin {
    if (datos.trimestres.every((t) => publicados.has(t.id))) return datos;
    const visible = datos.trimestres.map((t) => publicados.has(t.id));
    const promediosTrimestrales = datos.promediosTrimestrales.map((p, i) =>
      visible[i] ? p : null,
    );
    const resumen = this.calculo.resumenAnual(promediosTrimestrales);
    return {
      ...datos,
      materias: datos.materias.map((m) => ({
        ...m,
        notas: m.notas.map((n, i) => (visible[i] ? n : null)),
        notaAnual: null,
        aprobado: null,
      })),
      promediosTrimestrales,
      promedioAnual: resumen.promedioAnual,
      estadoAnual: 'PENDIENTE',
    };
  }

  private async curso(cursoId: number) {
    const curso = await this.db
      .getRepository(Curso)
      .findOne({ where: { id: cursoId }, relations: { gestion: true } });
    if (!curso) throw new NotFoundException('El curso no existe');
    return curso;
  }
}
