import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Nivel } from './enums';
import { Usuario } from './usuario.entity';

@Entity('unidades_educativas')
export class UnidadEducativa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  codigoSie: string;
}

@Entity('gestiones')
@Unique(['unidadEducativa', 'anio'])
export class Gestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  anio: number;

  @ManyToOne(() => UnidadEducativa, { nullable: false })
  unidadEducativa: UnidadEducativa;
}

@Entity('trimestres')
@Check('trimestres_numero', 'numero BETWEEN 1 AND 3')
@Unique(['gestion', 'numero'])
export class Trimestre {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Gestion, { nullable: false })
  gestion: Gestion;

  @Column()
  numero: number;

  @Column({ default: false })
  cerrado: boolean;
}

/**
 * Dimensión de evaluación con su puntaje máximo, configurable por gestión (US-18).
 * 2026, RM 001/2026: SER 10, SABER 45, HACER 40, AUTOEVALUACION 5.
 */
@Entity('dimensiones_evaluacion')
@Check('dimensiones_puntaje_positivo', 'puntaje_maximo > 0')
@Unique(['gestion', 'codigo'])
export class DimensionEvaluacion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Gestion, { nullable: false })
  gestion: Gestion;

  @Column()
  codigo: string;

  @Column()
  nombre: string;

  @Column()
  puntajeMaximo: number;

  @Column({ default: 0 })
  orden: number;
}

@Entity('cursos')
@Unique(['gestion', 'nivel', 'anioEscolaridad', 'paralelo'])
export class Curso {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Gestion, { nullable: false })
  gestion: Gestion;

  @Column({ type: 'enum', enum: Nivel, enumName: 'nivel' })
  nivel: Nivel;

  @Column()
  anioEscolaridad: number;

  @Column()
  paralelo: string;
}

@Entity('materias')
@Unique(['curso', 'nombre'])
export class Materia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @ManyToOne(() => Curso, { nullable: false })
  curso: Curso;
}

/** Un profesor por materia (US-18). Solo ese profesor registra y corrige notas (RNF-04, M09). */
@Entity('asignaciones_materia')
export class AsignacionMateria {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Materia, { nullable: false })
  @JoinColumn()
  materia: Materia;

  @ManyToOne(() => Usuario, { nullable: false })
  profesor: Usuario;
}

@Entity('estudiantes')
export class Estudiante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @ManyToOne(() => Curso, { nullable: false })
  curso: Curso;
}

/** Vínculo padre–estudiante (US-20): un padre solo ve a sus hijos vinculados. */
@Entity('vinculos_padre')
export class VinculoPadre {
  @PrimaryColumn()
  padreId: number;

  @PrimaryColumn()
  estudianteId: number;

  @ManyToOne(() => Usuario, { nullable: false })
  padre: Usuario;

  @ManyToOne(() => Estudiante, { nullable: false })
  estudiante: Estudiante;
}
