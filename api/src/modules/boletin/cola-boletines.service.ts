import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Curso, Estudiante } from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { AccesoNotasService } from '../notas/acceso.service';
import { BoletinService } from './boletin.service';
import { generarPdfBoletines } from './pdf';

const COLA = 'boletines';
/** El PDF de un curso se guarda en Redis un día (decisión D19). */
const DURACION_SEGUNDOS = 24 * 60 * 60;
const clavePdf = (jobId: string) => `${COLA}:pdf:${jobId}`;

interface TrabajoBoletines {
  cursoId: number;
  cursoNombre: string;
  usuario: UsuarioToken;
  estudianteIds: number[];
}

export type EstadoTrabajo = 'ENCOLADO' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';

/**
 * Boletines de un curso en una cola BullMQ sobre Redis (US-07, criterio 3; T-046, ADR-0006, R05/CAL-001). El trabajo
 * es de quien lo pidió: otro usuario recibe 404. El aviso al terminar es el estado COMPLETADO con su mensaje (D19).
 */
@Injectable()
export class ColaBoletinesService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ColaBoletinesService.name);
  private redis: IORedis;
  private cola: Queue<TrabajoBoletines>;
  private worker: Worker<TrabajoBoletines, { total: number }>;

  constructor(
    private readonly boletines: BoletinService,
    private readonly acceso: AccesoNotasService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  onModuleInit() {
    // BullMQ exige maxRetriesPerRequest = null en la conexión del worker.
    this.redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    let avisado = false;
    this.redis.on('error', (e: Error) => {
      if (!avisado) this.log.error(`Sin conexión con Redis: ${e.message}`);
      avisado = true;
    });
    this.redis.on('ready', () => (avisado = false));
    this.cola = new Queue(COLA, { connection: this.redis });
    this.worker = new Worker(COLA, (job) => this.procesar(job), { connection: this.redis });
    this.worker.on('error', () => undefined); // ya lo registra la conexión
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.cola.close();
    this.redis.disconnect();
  }

  async encolar(cursoId: number, usuario: UsuarioToken) {
    const curso = await this.db.getRepository(Curso).findOneBy({ id: cursoId });
    if (!curso) throw new NotFoundException('El curso no existe');
    await this.acceso.verificarEstudiante(curso.id, usuario);
    const estudiantes = await this.db.getRepository(Estudiante).find({
      where: { curso: { id: curso.id } },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
    if (estudiantes.length === 0) {
      throw new UnprocessableEntityException('El curso no tiene estudiantes inscritos');
    }
    const job = await this.cola.add(
      'curso',
      {
        cursoId: curso.id,
        cursoNombre: nombreCurso(curso),
        usuario: { id: usuario.id, rol: usuario.rol },
        estudianteIds: estudiantes.map((e) => e.id),
      },
      {
        removeOnComplete: { age: DURACION_SEGUNDOS },
        removeOnFail: { age: DURACION_SEGUNDOS },
      },
    );
    return {
      jobId: job.id as string,
      totalEstudiantes: estudiantes.length,
      estado: 'ENCOLADO' as const,
    };
  }

  async estado(jobId: string, usuario: UsuarioToken) {
    const job = await this.trabajoDe(jobId, usuario);
    const estado = this.traducir(await job.getState());
    const total = job.data.estudianteIds.length;
    return {
      jobId,
      estado,
      progreso: estado === 'COMPLETADO' ? 100 : typeof job.progress === 'number' ? job.progress : 0,
      total,
      ...(estado === 'COMPLETADO' && {
        mensaje: `Los ${total} boletines de ${job.data.cursoNombre} están listos para descargar.`,
        urlDescarga: `/boletines/trabajos/${jobId}/pdf`,
      }),
      ...(estado === 'FALLIDO' && {
        mensaje: 'No se pudieron generar los boletines. Intente nuevamente.',
      }),
    };
  }

  async pdf(jobId: string, usuario: UsuarioToken) {
    const job = await this.trabajoDe(jobId, usuario);
    const datos = await this.redis.getBuffer(clavePdf(jobId));
    if (!datos) throw new NotFoundException('Los boletines todavía no están listos o ya vencieron');
    return { datos, nombre: `Boletines_${job.data.cursoNombre.replace(/\W+/g, '_')}.pdf` };
  }

  private async trabajoDe(jobId: string, usuario: UsuarioToken) {
    const job = await this.cola.getJob(jobId);
    if (!job || job.data.usuario.id !== usuario.id) {
      throw new NotFoundException('El trabajo no existe');
    }
    return job;
  }

  private traducir(estado: string): EstadoTrabajo {
    if (estado === 'active') return 'PROCESANDO';
    if (estado === 'completed') return 'COMPLETADO';
    if (estado === 'failed') return 'FALLIDO';
    return 'ENCOLADO';
  }

  private async procesar(job: Job<TrabajoBoletines>) {
    const { estudianteIds, usuario } = job.data;
    const lista = [];
    for (const [i, id] of estudianteIds.entries()) {
      lista.push(await this.boletines.datos(id, usuario));
      // El último 10 % queda para armar el PDF.
      await job.updateProgress(Math.floor(((i + 1) / estudianteIds.length) * 90));
    }
    const pdf = await generarPdfBoletines(lista);
    await this.redis.set(clavePdf(job.id as string), pdf, 'EX', DURACION_SEGUNDOS);
    return { total: lista.length };
  }
}
