import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { decimal } from '../decimal.transformer';
import { DimensionEvaluacion, Estudiante, Materia, Trimestre } from './academico.entity';
import { EstadoAsistencia, OrigenCambio } from './enums';
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

  @CreateDateColumn({ type: 'timestamptz' })
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
