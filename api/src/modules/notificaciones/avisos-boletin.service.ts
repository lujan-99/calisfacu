import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import {
  AvisoBoletin,
  Curso,
  EstadoCorreo,
  Trimestre,
  VinculoPadre,
} from '../../database/entities';
import { nombreCurso } from '../academico/formato';
import { CorreosService, urlWeb } from './correo/correos.service';
import { correoBoletinDisponible } from './correo/plantillas';

/** Estado del envío como lo muestra la pantalla del padre. */
const ESTADO_ENVIO: Record<EstadoCorreo, 'ENVIADO' | 'PENDIENTE' | 'FALLIDO' | 'SIN_PROVEEDOR'> = {
  [EstadoCorreo.ENVIADO]: 'ENVIADO',
  [EstadoCorreo.PENDIENTE]: 'PENDIENTE',
  [EstadoCorreo.FALLIDO]: 'FALLIDO',
  [EstadoCorreo.SIN_PROVEEDOR]: 'SIN_PROVEEDOR',
};

/**
 * Aviso de boletín disponible (US-12, T-062; decisión D23). Al publicar el boletín de un curso y trimestre (US-11), cada
 * padre vinculado (US-20) a un estudiante del curso recibe un aviso dentro del sistema y un correo. Una publicación
 * repetida del mismo trimestre (después de despublicar) no repite el aviso.
 */
@Injectable()
export class AvisosBoletinService {
  constructor(
    private readonly correos: CorreosService,
    @InjectDataSource() private readonly db: DataSource,
  ) {}

  /** Lo llama PublicacionesService después de guardar la publicación. Devuelve cuántos avisos nuevos creó. */
  async alPublicar(cursoId: number, trimestreId: number): Promise<number> {
    const [curso, trimestre, vinculos] = await Promise.all([
      this.db.getRepository(Curso).findOneByOrFail({ id: cursoId }),
      this.db
        .getRepository(Trimestre)
        .findOneOrFail({ where: { id: trimestreId }, relations: { gestion: true } }),
      this.db.getRepository(VinculoPadre).find({
        where: { estudiante: { curso: { id: cursoId } }, padre: { activo: true } },
        relations: { padre: true, estudiante: true },
        order: { estudianteId: 'ASC', padreId: 'ASC' },
      }),
    ]);
    let creados = 0;
    for (const v of vinculos) {
      await this.db.transaction(async (m) => {
        const insertado = await m
          .createQueryBuilder()
          .insert()
          .into(AvisoBoletin)
          .values({ padre: { id: v.padreId }, estudiante: { id: v.estudianteId }, trimestre })
          .orIgnore()
          .returning('id')
          .execute();
        const id = (insertado.raw as { id: number }[])[0]?.id;
        if (!id) return; // ya se le avisó de este trimestre
        const correo = await this.correos.registrar(
          {
            destinatario: v.padre.email,
            ...correoBoletinDisponible({
              padre: v.padre.nombre,
              estudiante: `${v.estudiante.nombres} ${v.estudiante.apellidos}`,
              curso: nombreCurso(curso),
              trimestre: trimestre.numero,
              gestion: trimestre.gestion.anio,
              urlWeb: urlWeb(),
            }),
          },
          m,
        );
        await m.getRepository(AvisoBoletin).update(id, { correo });
        creados++;
      });
    }
    if (creados > 0) this.correos.despachar();
    return creados;
  }

  /** Los avisos del padre autenticado, el más reciente primero. */
  async delPadre(usuario: UsuarioToken) {
    const avisos = await this.db.getRepository(AvisoBoletin).find({
      where: { padre: { id: usuario.id } },
      relations: { estudiante: { curso: true }, trimestre: { gestion: true }, correo: true },
      order: { creadoEn: 'DESC', id: 'DESC' },
    });
    return avisos.map((a) => {
      const minutos = a.correo?.enviadoEn
        ? Math.round(((a.correo.enviadoEn.getTime() - a.creadoEn.getTime()) / 60_000) * 10) / 10
        : null;
      return {
        id: a.id,
        estudianteId: a.estudiante.id,
        estudianteNombre: `${a.estudiante.apellidos}, ${a.estudiante.nombres}`,
        codigoRude: a.estudiante.codigoRude,
        cursoId: a.estudiante.curso.id,
        cursoNombre: nombreCurso(a.estudiante.curso),
        trimestreId: a.trimestre.id,
        trimestreNumero: a.trimestre.numero,
        gestionAnio: a.trimestre.gestion.anio,
        fechaPublicacion: a.creadoEn.toISOString(),
        canalEnvio:
          a.correo?.estado === EstadoCorreo.ENVIADO ? ('EMAIL' as const) : ('SISTEMA' as const),
        correoDestinatario: a.correo?.destinatario,
        fechaEnvioCorreo: a.correo?.enviadoEn?.toISOString() ?? null,
        tiempoEntregaMinutos: minutos,
        leido: a.leidoEn !== null,
        estadoEnvio: a.correo ? ESTADO_ENVIO[a.correo.estado] : ('SIN_PROVEEDOR' as const),
      };
    });
  }

  /** Solo el padre dueño del aviso lo marca como leído; para cualquier otro, el aviso no existe. */
  async marcarLeido(avisoId: number, usuario: UsuarioToken) {
    const aviso = await this.db
      .getRepository(AvisoBoletin)
      .findOne({ where: { id: avisoId, padre: { id: usuario.id } } });
    if (!aviso) throw new NotFoundException('El aviso no existe');
    if (aviso.leidoEn === null) {
      await this.db.getRepository(AvisoBoletin).update(aviso.id, { leidoEn: new Date() });
    }
  }
}
