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
import { COLORES_PREDETERMINADOS } from '../../modules/academico/apariencia';
import { Nivel } from './enums';
import { Usuario } from './usuario.entity';

/**
 * Datos de la institución que salen en boletines y centralizadores (US-18, criterio 5) y su apariencia en la web:
 * colores y logo, configurables sin tocar el código (ADR-0010).
 */
@Entity('unidades_educativas')
@Check(
  'unidades_colores_hex',
  `color_marca ~ '^#[0-9A-F]{6}$' AND color_primario ~ '^#[0-9A-F]{6}$' AND color_acento ~ '^#[0-9A-F]{6}$'`,
)
export class UnidadEducativa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ unique: true })
  codigoSie: string;

  @Column({ length: 7, default: COLORES_PREDETERMINADOS.marca })
  colorMarca: string;

  @Column({ length: 7, default: COLORES_PREDETERMINADOS.primario })
  colorPrimario: string;

  @Column({ length: 7, default: COLORES_PREDETERMINADOS.acento })
  colorAcento: string;

  /** PNG, JPEG o WebP de hasta 256 KB. No se lee salvo que se pida (select: false). */
  @Column({ type: 'bytea', nullable: true, select: false })
  logo: Buffer | null;

  @Column({ type: 'varchar', nullable: true })
  logoTipo: string | null;

  /** Cambia con cada logo nuevo: la web lo usa en la URL para que el navegador no muestre el anterior. */
  @Column({ type: 'timestamptz', nullable: true })
  logoActualizadoEn: Date | null;
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

/**
 * Un estudiante inscrito en un curso de una gestión. El código RUDE (Registro Único de Estudiantes del Ministerio)
 * lo identifica: no puede repetirse en la misma gestión, así nadie queda inscrito en dos cursos a la vez
 * (US-18, criterio 3; decisión D10). La gestión es siempre la del curso (EstudiantesService la copia del curso).
 */
@Entity('estudiantes')
@Unique('estudiantes_rude_por_gestion', ['gestion', 'codigoRude'])
export class Estudiante {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  codigoRude: string;

  /** Cédula de identidad, opcional (decisión D15). Dato de un menor: solo lo ve el personal autorizado. */
  @Column({ type: 'varchar', length: 15, nullable: true })
  ci: string | null;

  @Column()
  nombres: string;

  @Column()
  apellidos: string;

  @ManyToOne(() => Curso, { nullable: false })
  curso: Curso;

  @ManyToOne(() => Gestion, { nullable: false })
  gestion: Gestion;
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
