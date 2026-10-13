import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Rol } from './enums';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  nombre: string;

  @Column({ select: false })
  hashContrasena: string;

  @Column({ type: 'enum', enum: Rol, enumName: 'rol' })
  rol: Rol;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: 0 })
  intentosFallidos: number;

  @Column({ type: 'timestamptz', nullable: true })
  bloqueadoHasta: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creadoEn: Date;
}
