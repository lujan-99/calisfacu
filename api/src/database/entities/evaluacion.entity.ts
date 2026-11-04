import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { decimal } from '../decimal.transformer';
import { Curso, DimensionEvaluacion, Estudiante, Materia, Trimestre } from './academico.entity';
import { EstadoAsistencia, EstadoSolicitud, OrigenCambio } from './enums';
import { Usuario } from './usuario.entity';

@Entity('actividades')
export class Actividad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @ManyToOne(() => Materia, { nullable: false })
  materia: Materia;

  @ManyToOne(() => Trimestre, { nullable: false })
  trimestre: Trimestre;

  @ManyToOne(() => DimensionEvaluacion, { nullable: false })
  dimension: DimensionEvaluacion;
}

/** Nota de una actividad, en la escala de 1 a 100 (RNF-01). `numeric` para no perder precisión. */
@Entity('notas')
// Las restricciones CHECK se declaran aquí para que migration:generate no las borre.
@Check('notas_valor_escala', 'valor >= 1 AND valor <= 100')
@Unique(['actividad', 'estudiante'])
export class Nota {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Actividad, { nullable: false })
  actividad: Actividad;

  @ManyToOne(() => Estudiante, { nullable: false })
  estudiante: Estudiante;

  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: decimal })
  valor: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizadoEn: Date;
}

/** Registro de no repudio (US-04, M15). Solo inserción: un trigger de PostgreSQL rechaza UPDATE y DELETE. */
@Entity('registros_auditoria')
export class RegistroAuditoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Nota, { nullable: false })
  nota: Nota;

  @ManyToOne(() => Usuario, { nullable: false })
  usuario: Usuario;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true, transformer: decimal })
  valorAnterior: number | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, transformer: decimal })
  valorNuevo: number;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Column({ type: 'enum', enum: OrigenCambio, enumName: 'origen_cambio' })
  origen: OrigenCambio;

  /** clock_timestamp() y no now(): now() es la hora de inicio de la transacción, no la del cambio. */
  @CreateDateColumn({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  creadoEn: Date;
}

@Entity('asistencias')
@Unique(['materia', 'estudiante', 'fecha'])
export class Asistencia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Materia, { nullable: false })
  materia: Materia;

  @ManyToOne(() => Estudiante, { nullable: false })
  estudiante: Estudiante;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'enum', enum: EstadoAsistencia, enumName: 'estado_asistencia' })
  estado: EstadoAsistencia;
}

/** Entrega de las notas de una materia en un trimestre (US-10): la marca el profesor asignado, una sola vez. */
@Entity('entregas_notas')
@Unique(['materia', 'trimestre'])
export class EntregaNotas {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Materia, { nullable: false })
  materia: Materia;

  @ManyToOne(() => Trimestre, { nullable: false })
  trimestre: Trimestre;

  @ManyToOne(() => Usuario, { nullable: false })
  profesor: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  entregadoEn: Date;
}

/**
 * Publicación del boletín de un curso en un trimestre (US-11, decisión D20): desde entonces el padre ve las notas de
 * ese trimestre. La hace la secretaria o el administrador cuando todas las materias del curso entregaron sus notas.
 */
@Entity('publicaciones_boletin')
@Unique(['curso', 'trimestre'])
export class PublicacionBoletin {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Curso, { nullable: false })
  curso: Curso;

  @ManyToOne(() => Trimestre, { nullable: false })
  trimestre: Trimestre;

  @ManyToOne(() => Usuario, { nullable: false })
  publicadoPor: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  publicadoEn: Date;
}

/**
 * Centralización de las notas de un curso en un trimestre (US-09, T-057; decisión D21). La hace la secretaria o el
 * administrador cuando todas las materias del curso entregaron sus notas (US-10); desde entonces se exporta la
 * planilla oficial. El trimestre se cierra cuando están centralizados todos los cursos de la gestión.
 */
@Entity('centralizaciones')
@Unique(['curso', 'trimestre'])
export class Centralizacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Curso, { nullable: false })
  curso: Curso;

  @ManyToOne(() => Trimestre, { nullable: false })
  trimestre: Trimestre;

  @ManyToOne(() => Usuario, { nullable: false })
  centralizadoPor: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  centralizadoEn: Date;
}

/**
 * Alerta de promedio bajo (US-08, T-060; decisión D22): la nota trimestral de un estudiante en una materia quedó por
 * debajo de 51. Está vigente hasta que la nota vuelve a 51 o más (`superadaEn`); mientras tanto no se repite (índice
 * único parcial). El profesor la lee y la atiende con una nota de lo que hizo (contactar al tutor).
 */
@Entity('alertas_promedio')
@Index('alertas_promedio_una_vigente', ['estudiante', 'materia', 'trimestre'], {
  unique: true,
  where: '"superada_en" IS NULL',
})
export class AlertaPromedio {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Estudiante, { nullable: false })
  estudiante: Estudiante;

  @ManyToOne(() => Materia, { nullable: false })
  materia: Materia;

  @ManyToOne(() => Trimestre, { nullable: false })
  trimestre: Trimestre;

  /** Nota trimestral que disparó la alerta. */
  @Column()
  nota: number;

  /** Nota trimestral anterior al cambio que la disparó; null si no tenía (D4). */
  @Column({ type: 'int', nullable: true })
  notaAnterior: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadaEn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leidaEn: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  atendidaEn: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  atendidaPor: Usuario | null;

  @Column({ type: 'text', nullable: true })
  notaAtencion: string | null;

  /** Cuándo la nota volvió a 51 o más: desde entonces la alerta deja de estar vigente. */
  @Column({ type: 'timestamptz', nullable: true })
  superadaEn: Date | null;
}

/**
 * Solicitud de edición (decisión D16): el profesor pide corregir notas ya registradas de una actividad y el
 * administrador la aprueba o la rechaza con una observación. Cada estudiante aprobado habilita una corrección.
 */
@Entity('solicitudes_edicion')
@Check('solicitudes_rechazo_con_observacion', `estado <> 'RECHAZADA' OR observacion IS NOT NULL`)
export class SolicitudEdicion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Actividad, { nullable: false })
  actividad: Actividad;

  @ManyToOne(() => Usuario, { nullable: false })
  profesor: Usuario;

  @Column({ type: 'text' })
  motivo: string;

  @Column({
    type: 'enum',
    enum: EstadoSolicitud,
    enumName: 'estado_solicitud',
    default: EstadoSolicitud.PENDIENTE,
  })
  estado: EstadoSolicitud;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resueltoEn: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  resueltoPor: Usuario | null;

  @OneToMany(() => SolicitudEdicionEstudiante, (x) => x.solicitud)
  estudiantes: SolicitudEdicionEstudiante[];
}

/** Un estudiante de la solicitud. `usadaEn` se llena cuando la corrección aprobada se hace (una sola vez). */
@Entity('solicitudes_edicion_estudiantes')
@Unique(['solicitud', 'estudiante'])
export class SolicitudEdicionEstudiante {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SolicitudEdicion, (s) => s.estudiantes, { nullable: false })
  solicitud: SolicitudEdicion;

  @ManyToOne(() => Estudiante, { nullable: false })
  estudiante: Estudiante;

  @Column({ type: 'timestamptz', nullable: true })
  usadaEn: Date | null;
}
