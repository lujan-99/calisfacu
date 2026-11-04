import type { MensajeCorreo } from './proveedor';
import { escaparHtml } from './reglas-correo';

type Contenido = Omit<MensajeCorreo, 'destinatario'>;

function html(titulo: string, parrafos: string[], enlace?: { texto: string; url: string }) {
  const cuerpo = parrafos.map((p) => `<p>${escaparHtml(p)}</p>`).join('');
  const boton = enlace
    ? `<p><a href="${escaparHtml(enlace.url)}" style="background:#7a1c2e;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">${escaparHtml(enlace.texto)}</a></p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:560px"><h2 style="color:#7a1c2e">${escaparHtml(titulo)}</h2>${cuerpo}${boton}<p style="color:#777;font-size:12px">CalisFacu · Aviso automático, no responda a este correo.</p></div>`;
}

/** US-08: aviso al profesor de que un estudiante quedó por debajo de 51 (T-061). */
export function correoAlertaPromedio(d: {
  profesor: string;
  estudiante: string;
  materia: string;
  curso: string;
  trimestre: number;
  nota: number;
  notaAnterior: number | null;
  urlWeb: string;
}): Contenido {
  const asunto = `Alerta de promedio bajo: ${d.estudiante} (${d.materia})`;
  const parrafos = [
    `Estimado(a) ${d.profesor}:`,
    `La nota del trimestre ${d.trimestre} de ${d.estudiante} en ${d.materia} (${d.curso}) quedó en ${d.nota}, por debajo del mínimo de aprobación (51)` +
      (d.notaAnterior === null ? '.' : `; antes era ${d.notaAnterior}.`),
    'Puede ver la alerta y los datos del tutor en «Alertas tempranas».',
  ];
  return {
    asunto,
    texto: `${parrafos.join('\n\n')}\n\n${d.urlWeb}/profesor/alertas`,
    html: html(asunto, parrafos, { texto: 'Ver la alerta', url: `${d.urlWeb}/profesor/alertas` }),
  };
}

/** US-12: aviso al padre de que el boletín de su hijo está disponible (T-062). */
export function correoBoletinDisponible(d: {
  padre: string;
  estudiante: string;
  curso: string;
  trimestre: number;
  gestion: number;
  urlWeb: string;
}): Contenido {
  const asunto = `Boletín disponible: ${d.estudiante}, trimestre ${d.trimestre} de ${d.gestion}`;
  const parrafos = [
    `Estimado(a) ${d.padre}:`,
    `Ya está disponible el boletín del trimestre ${d.trimestre} de ${d.gestion} de ${d.estudiante} (${d.curso}).`,
    'Puede consultarlo y descargarlo en CalisFacu.',
  ];
  return {
    asunto,
    texto: `${parrafos.join('\n\n')}\n\n${d.urlWeb}/padre/boletin`,
    html: html(asunto, parrafos, { texto: 'Ver el boletín', url: `${d.urlWeb}/padre/boletin` }),
  };
}
