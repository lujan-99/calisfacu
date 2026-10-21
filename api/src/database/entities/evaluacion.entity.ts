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
import { DimensionEvaluacion, Estudiante, Materia, Trimestre } from './academico.entity';
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
