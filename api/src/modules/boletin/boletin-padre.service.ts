import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioToken } from '../../common/decoradores';
import { AccesoFamiliarService } from '../familias/acceso-familiar.service';
import { BoletinService } from './boletin.service';
import type { DatosBoletin } from './contenido';
import { generarPdfBoletines } from './pdf';
import { PublicacionesService } from './publicaciones.service';

const NO_PUBLICADO = 'El boletín todavía no fue publicado por la unidad educativa.';

/**
 * Consulta del boletín por el padre (US-11, T-050): solo de sus hijos vinculados (US-20, guard de pertenencia) y
 * solo los trimestres publicados (decisión D20).
 */
@Injectable()
export class BoletinPadreService {
  constructor(
    private readonly acceso: AccesoFamiliarService,
    private readonly boletines: BoletinService,
    private readonly publicaciones: PublicacionesService,
  ) {}

  async detalle(estudianteId: number, usuario: UsuarioToken) {
    const { datos, publicaciones } = await this.cargar(estudianteId, usuario);
    const publicado = publicaciones.length > 0;
    const visible = this.publicaciones.soloPublicado(
      datos,
      new Set(publicaciones.map((p) => p.trimestre.id)),
    );
    const numeros = publicaciones.map((p) => p.trimestre.numero).sort();
    const completo = numeros.length === datos.trimestres.length;
    return {
      estudiante: {
        id: datos.estudiante.id,
        nombres: datos.estudiante.nombres,
        apellidos: datos.estudiante.apellidos,
        codigoRude: datos.estudiante.codigoRude,
        ci: datos.estudiante.ci,
        curso: {
          id: datos.curso.id,
          nombre: datos.curso.nombre,
          nivel: datos.curso.nivel,
          paralelo: datos.curso.paralelo,
          anioEscolaridad: datos.curso.anioEscolaridad,
        },
        gestion: datos.gestion,
      },
      publicado,
      estadoPeriodo: publicado ? ('PUBLICADO' as const) : ('EN_ELABORACION' as const),
      mensajeEstado: publicado
        ? `Trimestres publicados: ${numeros.join(', ')} de ${datos.trimestres.length}.`
        : NO_PUBLICADO,
      fechaPublicacion: publicaciones[0]?.publicadoEn ?? null,
      // Criterio 2: sin publicar, el padre no ve ninguna nota.
      promedioAnual: publicado ? visible.promedioAnual : null,
      porcentajeAsistencia: publicado ? visible.porcentajeAsistencia : null,
      estadoAnual:
        completo && visible.promedioAnual !== null
          ? visible.estadoAnual === 'PROMOVIDO'
            ? ('PROMOVIDO' as const)
            : ('RETENIDO' as const)
          : ('EN_CURSO' as const),
      materias: publicado
        ? visible.materias.map((m) => ({
            materiaId: m.materiaId,
            nombre: m.nombre,
            profesorNombre: m.profesor ?? undefined,
            notaT1: m.notas[0] ?? null,
            notaT2: m.notas[1] ?? null,
            notaT3: m.notas[2] ?? null,
            promedioFinal: m.notaAnual,
            estado:
              m.aprobado === null
                ? ('EN_CURSO' as const)
                : m.aprobado
                  ? ('APROBADO' as const)
                  : ('REPROBADO' as const),
          }))
        : [],
    };
  }

  async pdf(estudianteId: number, usuario: UsuarioToken) {
    const { datos, publicaciones } = await this.cargar(estudianteId, usuario);
    if (publicaciones.length === 0) throw new NotFoundException(NO_PUBLICADO);
    const visible: DatosBoletin = this.publicaciones.soloPublicado(
      datos,
      new Set(publicaciones.map((p) => p.trimestre.id)),
    );
    return {
      datos: await generarPdfBoletines([visible]),
      nombre: `Boletin_${datos.estudiante.codigoRude}.pdf`,
    };
  }

  private async cargar(estudianteId: number, usuario: UsuarioToken) {
    await this.acceso.verificarHijo(estudianteId, usuario);
    const datos = await this.boletines.datos(estudianteId, usuario);
    const publicaciones = await this.publicaciones.publicadas(datos.curso.id);
    return { datos, publicaciones };
  }
}
