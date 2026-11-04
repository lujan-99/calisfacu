import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { type DataSource, In, IsNull } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { esDuplicado } from '../../common/transformaciones';
import {
  Actividad,
  AlertaPromedio,
  AsignacionMateria,
  DimensionEvaluacion,
  Nota,
  Rol,
  VinculoPadre,
} from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { CalculoService } from '../calculo/calculo.service';
import { AccesoNotasService } from '../notas/acceso.service';
import { CambiosNotasService, type CambioNotas } from '../notas/cambios-notas.service';
import { accionAlerta } from './reglas-alertas';

type PorDimension = Record<string, number[]>;

/**
 * Alertas de promedio bajo (US-08, T-060; decisión D22). Cada vez que cambian notas (registro, importación o
 * corrección) recalcula la nota trimestral de esos estudiantes en la materia con CalculoService y crea, mantiene o
 * supera su alerta. El aviso dentro del sistema es la propia alerta; el correo es de T-061.
 */
@Injectable()
export class AlertasService implements OnModuleInit {
  constructor(
    private readonly calculo: CalculoService,
    private readonly acceso: AccesoNotasService,
    private readonly cambios: CambiosNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  onModuleInit() {
    this.cambios.suscribir((c) => this.evaluar(c));
  }

  /** Recalcula y aplica la regla de la alerta a cada estudiante del cambio. */
  async evaluar({ actividadId, estudianteIds }: CambioNotas) {
    const actividad = await this.db.getRepository(Actividad).findOne({
      where: { id: actividadId },
      relations: { materia: true, trimestre: { gestion: true } },
    });
    if (!actividad) return;
    const { materia, trimestre } = actividad;
    const [dims, notas, vigentes] = await Promise.all([
      this.db.getRepository(DimensionEvaluacion).find({
        where: { gestion: { id: trimestre.gestion.id } },
        order: { orden: 'ASC' },
      }),
      this.db.getRepository(Nota).find({
        where: {
          estudiante: { id: In(estudianteIds) },
          actividad: { materia: { id: materia.id }, trimestre: { id: trimestre.id } },
        },
        relations: { estudiante: true, actividad: { dimension: true } },
      }),
      this.db.getRepository(AlertaPromedio).find({
        where: {
          estudiante: { id: In(estudianteIds) },
          materia: { id: materia.id },
          trimestre: { id: trimestre.id },
          superadaEn: IsNull(),
        },
        relations: { estudiante: true },
      }),
    ]);
    const anteriores = await this.valoresAnteriores(
      notas.filter((n) => n.actividad.id === actividadId).map((n) => n.id),
    );

    for (const estudianteId of estudianteIds) {
      const actuales: PorDimension = {};
      const antes: PorDimension = {};
      for (const n of notas.filter((x) => x.estudiante.id === estudianteId)) {
        const codigo = n.actividad.dimension.codigo;
        (actuales[codigo] ??= []).push(n.valor);
        // Antes del cambio, la nota de la actividad tenía su valor anterior o no existía.
        const previo = n.actividad.id === actividadId ? anteriores.get(n.id) : n.valor;
        if (previo !== undefined && previo !== null) (antes[codigo] ??= []).push(previo);
      }
      const nota = this.calculo.notaTrimestral(dims, actuales).nota;
      const vigente = vigentes.find((v) => v.estudiante.id === estudianteId);
      const accion = accionAlerta(nota, Boolean(vigente));
      if (accion === 'CREAR' && nota !== null) {
        try {
          await this.db.getRepository(AlertaPromedio).insert({
            estudiante: { id: estudianteId },
            materia: { id: materia.id },
            trimestre: { id: trimestre.id },
            nota,
            notaAnterior: this.calculo.notaTrimestral(dims, antes).nota,
          });
        } catch (e) {
          // Dos cambios simultáneos: la otra petición ya creó la alerta vigente (índice único parcial).
          if (!esDuplicado(e)) throw e;
        }
      } else if (accion === 'SUPERAR' && vigente) {
        await this.db
          .getRepository(AlertaPromedio)
          .update({ id: vigente.id, superadaEn: IsNull() }, { superadaEn: new Date() });
      }
    }
  }

  /** Valor que tenía cada nota antes de su último cambio, según la auditoría (null si se acaba de registrar). */
  private async valoresAnteriores(notaIds: number[]) {
    if (notaIds.length === 0) return new Map<number, number | null>();
    const filas = await this.db.query<{ notaId: number; valorAnterior: string | null }[]>(
      `SELECT DISTINCT ON (nota_id) nota_id AS "notaId", valor_anterior AS "valorAnterior"
       FROM registros_auditoria WHERE nota_id = ANY($1) ORDER BY nota_id, id DESC`,
      [notaIds],
    );
    return new Map(
      filas.map((f) => [
        Number(f.notaId),
        f.valorAnterior === null ? null : Number(f.valorAnterior),
      ]),
    );
  }

  /** Las alertas que ve el usuario: el profesor, las de sus materias; la secretaria y el administrador, todas. */
  async listar(usuario: UsuarioToken, materiaId?: number) {
    if (materiaId) await this.acceso.verificarMateria(materiaId, usuario);
    let materias: number[] | undefined;
    if (usuario.rol === Rol.PROFESOR) {
      const asignaciones = await this.db.getRepository(AsignacionMateria).find({
        where: { profesor: { id: usuario.id } },
        relations: { materia: true },
      });
      materias = asignaciones.map((a) => a.materia.id);
    }
    const filtro = materiaId ? [materiaId] : materias;
    const alertas = await this.db.getRepository(AlertaPromedio).find({
      where: filtro ? { materia: { id: In(filtro) } } : {},
      relations: {
        estudiante: true,
        materia: { curso: true },
        trimestre: true,
        atendidaPor: true,
      },
      order: { creadaEn: 'DESC', id: 'DESC' },
    });
    const tutores = await this.tutores(alertas.map((a) => a.estudiante.id));
    return alertas.map((a) => this.vista(a, tutores.get(a.estudiante.id)));
  }

  private async tutores(estudianteIds: number[]) {
    if (estudianteIds.length === 0) return new Map<number, VinculoPadre>();
    const vinculos = await this.db.getRepository(VinculoPadre).find({
      where: { estudianteId: In([...new Set(estudianteIds)]) },
      relations: { padre: true },
      order: { creadoEn: 'ASC' },
    });
    const primero = new Map<number, VinculoPadre>();
    for (const v of vinculos) if (!primero.has(v.estudianteId)) primero.set(v.estudianteId, v);
    return primero;
  }

  private vista(a: AlertaPromedio, tutor?: VinculoPadre) {
    const e = a.estudiante;
    return {
      id: a.id,
      estudianteId: e.id,
      estudianteNombre: `${e.apellidos}, ${e.nombres}`,
      codigoRude: e.codigoRude,
      ci: e.ci,
      materiaId: a.materia.id,
      materiaNombre: a.materia.nombre,
      cursoId: a.materia.curso.id,
      cursoNombre: nombreCurso(a.materia.curso),
      trimestreId: a.trimestre.id,
      trimestreNumero: a.trimestre.numero,
      promedioAnterior: a.notaAnterior,
      promedioNuevo: a.nota,
      fechaAlerta: a.creadaEn.toISOString(),
      estado: a.atendidaEn ? ('ATENDIDA' as const) : ('ACTIVA' as const),
      vigente: a.superadaEn === null,
      fechaSuperada: a.superadaEn?.toISOString() ?? null,
      leida: a.leidaEn !== null,
      // El correo lo envía T-061; hasta entonces la alerta es solo el aviso dentro del sistema.
      correoEnviado: false,
      tutor: tutor
        ? {
            id: tutor.padre.id,
            nombre: tutor.padre.nombre,
            parentesco: tutor.parentesco,
            email: tutor.padre.email,
          }
        : undefined,
      notaAtencion: a.notaAtencion ?? undefined,
      fechaAtencion: a.atendidaEn?.toISOString(),
      atendidaPor: a.atendidaPor
        ? { id: a.atendidaPor.id, nombre: a.atendidaPor.nombre }
        : undefined,
    };
  }

  /** Solo el profesor asignado a la materia lee o atiende la alerta (M09). */
  private async alertaDelProfesor(alertaId: number, usuario: UsuarioToken) {
    const alerta = await this.db.getRepository(AlertaPromedio).findOne({
      where: { id: alertaId },
      relations: { materia: true },
    });
    if (!alerta) throw new NotFoundException('La alerta no existe');
    await this.acceso.verificarMateria(alerta.materia.id, usuario);
    return alerta;
  }

  async marcarLeida(alertaId: number, usuario: UsuarioToken) {
    const alerta = await this.alertaDelProfesor(alertaId, usuario);
    if (alerta.leidaEn === null) {
      await this.db.getRepository(AlertaPromedio).update(alerta.id, { leidaEn: new Date() });
    }
  }

  /** El profesor deja constancia de lo que hizo (por ejemplo, que habló con el tutor). */
  async atender(alertaId: number, notaAtencion: string, usuario: UsuarioToken) {
    const alerta = await this.alertaDelProfesor(alertaId, usuario);
    if (alerta.atendidaEn !== null) throw new ConflictException('La alerta ya fue atendida');
    const ahora = new Date();
    await this.db.getRepository(AlertaPromedio).update(alerta.id, {
      atendidaEn: ahora,
      atendidaPor: { id: usuario.id },
      notaAtencion: notaAtencion.trim(),
      leidaEn: alerta.leidaEn ?? ahora,
    });
    const [vista] = (await this.listar(usuario, alerta.materia.id)).filter(
      (a) => a.id === alerta.id,
    );
    return vista;
  }
}
