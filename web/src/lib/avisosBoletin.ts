import {
  listarNotificacionesPadreApi,
  marcarNotificacionPadreLeidaApi,
  type NotificacionBoletinPadreApi,
} from './api';
import { nombreTrimestre } from './formato';

/**
 * Lógica de negocio y modelos para el Aviso de Boletín Disponible (US-12, T-062).
 * Criterio de aceptación 1: Dado un boletín recién publicado, cada padre vinculado recibe
 * un correo en 15 minutos o menos.
 * Decisión D7 / RNF-01: Notificaciones automáticas por correo electrónico institucional.
 */

export const TIEMPO_MAXIMO_ENTREGA_MINUTOS = 15;

export type AvisoBoletinPadre = NotificacionBoletinPadreApi;

export interface ResumenAvisosPadre {
  total: number;
  noLeidas: number;
  leidas: number;
  correosEnviadosEnTiempo: number;
}

export interface PlantillaCorreoBoletin {
  asunto: string;
  cuerpoTexto: string;
  cuerpoHtml: string;
}

/**
 * Verifica si el tiempo de entrega del correo cumple el criterio de aceptación (<= 15 minutos).
 */
export function validarTiempoEntrega(tiempoMinutos: number): boolean {
  return (
    Number.isFinite(tiempoMinutos) &&
    tiempoMinutos >= 0 &&
    tiempoMinutos <= TIEMPO_MAXIMO_ENTREGA_MINUTOS
  );
}

/**
 * Genera el asunto y contenido reglamentario del correo de notificación de boletín disponible.
 */
export function generarPlantillaCorreoBoletin(datos: {
  estudianteNombre: string;
  cursoNombre: string;
  trimestreNumero: number;
  anioGestion: number;
  tutorNombre?: string;
  codigoSie?: string;
  enlacePortal?: string;
}): PlantillaCorreoBoletin {
  const trimestreNom = nombreTrimestre(datos.trimestreNumero);
  const saludo = datos.tutorNombre
    ? `Estimado(a) ${datos.tutorNombre}:`
    : 'Estimado Padre / Tutor de Familia:';
  const sieTexto = datos.codigoSie ? `(Código SIE: ${datos.codigoSie})` : '';
  const enlace = datos.enlacePortal ?? 'https://calisfacu.edu.bo/padre/boletin';

  const asunto = `CalisFacu · Boletín Disponible: ${datos.estudianteNombre} — ${trimestreNom} (${datos.anioGestion})`;

  const cuerpoTexto = [
    saludo,
    '',
    `Le comunicamos que el boletín oficial de calificaciones correspondiente al ${trimestreNom} de la gestión escolar ${datos.anioGestion} para el estudiante:`,
    `  • Estudiante: ${datos.estudianteNombre}`,
    `  • Curso: ${datos.cursoNombre} ${sieTexto}`,
    '',
    'Ya se encuentra publicado oficialmente conforme a las regulaciones de la RM 001/2026 del Ministerio de Educación de Bolivia.',
    '',
    `Puede ingresar al Sistema CalisFacu para consultar las calificaciones y descargar el boletín digital en formato PDF:`,
    `${enlace}`,
    '',
    'Atentamente,',
    'Dirección y Secretaría de la Unidad Educativa',
  ].join('\n');

  const cuerpoHtml = `
    <div style="font-family: sans-serif; line-height: 1.5; color: #1e293b;">
      <h2 style="color: #1e3a8a;">Boletín de Calificaciones Disponible</h2>
      <p>${saludo}</p>
      <p>
        Le comunicamos que el boletín oficial correspondiente al <strong>${trimestreNom}</strong> 
        de la gestión <strong>${datos.anioGestion}</strong> para su hijo(a) <strong>${datos.estudianteNombre}</strong> 
        del curso <em>${datos.cursoNombre}</em> ya se encuentra publicado y disponible.
      </p>
      <div style="margin: 20px 0; padding: 16px; background: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px;">
        <p style="margin: 0; color: #166534; font-weight: 600;">
          ✔ Calificaciones y asistencia debidamente centralizadas y validadas según RM 001/2026.
        </p>
      </div>
      <p>
        <a href="${enlace}" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Consultar y Descargar Boletín Oficial
        </a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <small style="color: #64748b;">
        Este es un mensaje institucional generado automáticamente por CalisFacu v1.0. Por favor, no responda a este correo.
      </small>
    </div>
  `.trim();

  return { asunto, cuerpoTexto, cuerpoHtml };
}

/**
 * Filtra la lista de avisos por estado de lectura y estudiante específico.
 */
export function filtrarNotificacionesPadre(
  avisos: NotificacionBoletinPadreApi[],
  soloNoLeidos: boolean,
  estudianteId: number | null,
): NotificacionBoletinPadreApi[] {
  return avisos.filter((aviso) => {
    if (soloNoLeidos && aviso.leido) return false;
    if (estudianteId !== null && aviso.estudianteId !== estudianteId) return false;
    return true;
  });
}

/**
 * Calcula el resumen cuantitativo de las notificaciones recibidas por el padre.
 */
export function calcularResumenNotificacionesPadre(
  avisos: NotificacionBoletinPadreApi[],
): ResumenAvisosPadre {
  let noLeidas = 0;
  let leidas = 0;
  let correosEnviadosEnTiempo = 0;

  for (const a of avisos) {
    if (a.leido) {
      leidas++;
    } else {
      noLeidas++;
    }

    if (
      a.estadoEnvio === 'ENVIADO' &&
      a.tiempoEntregaMinutos !== null &&
      a.tiempoEntregaMinutos <= TIEMPO_MAXIMO_ENTREGA_MINUTOS
    ) {
      correosEnviadosEnTiempo++;
    }
  }

  return {
    total: avisos.length,
    noLeidas,
    leidas,
    correosEnviadosEnTiempo,
  };
}

/**
 * Avisos de boletín del padre autenticado (US-12, T-062): los crea la API al publicar el boletín (decisión D23). Sin
 * datos armados en el navegador: si la API falla, la pantalla muestra el error.
 */
export function listarAvisosBoletinPadre(): Promise<NotificacionBoletinPadreApi[]> {
  return listarNotificacionesPadreApi<NotificacionBoletinPadreApi[]>();
}

/** Marca un aviso de boletín como leído. */
export function marcarAvisoBoletinLeido(notificacionId: number): Promise<void> {
  return marcarNotificacionPadreLeidaApi(notificacionId);
}
