/** Un correo listo para el proveedor. */
export interface MensajeCorreo {
  destinatario: string;
  asunto: string;
  texto: string;
  html: string;
}

export interface ConfiguracionCorreo {
  /** Clave de la API del proveedor; sin ella no se envía nada (el aviso queda solo dentro del sistema). */
  apiKey?: string;
  /** Endpoint de envío transaccional (por defecto, el de Brevo). */
  url: string;
  remitente: string;
  nombreRemitente: string;
  /** Fuera de producción, todos los correos van a esta dirección (los usuarios del seed tienen correos ficticios). */
  redirigirA?: string;
}

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

export function configuracionCorreo(env: NodeJS.ProcessEnv = process.env): ConfiguracionCorreo {
  const vacio = (v?: string) => (v && v.trim() !== '' ? v.trim() : undefined);
  return {
    apiKey: vacio(env.CORREO_API_KEY),
    url: vacio(env.CORREO_API_URL) ?? URL_BREVO,
    remitente: vacio(env.CORREO_REMITENTE) ?? 'no-responder@calisfacu.test',
    nombreRemitente: vacio(env.CORREO_NOMBRE_REMITENTE) ?? 'CalisFacu',
    redirigirA: vacio(env.CORREO_REDIRIGIR_A),
  };
}

/** Error del proveedor: se reintenta salvo que sea definitivo (por ejemplo, 400 por un destinatario inválido). */
export class ErrorProveedorCorreo extends Error {
  constructor(
    message: string,
    readonly definitivo: boolean,
  ) {
    super(message);
  }
}

/**
 * Envío por la API HTTP transaccional del proveedor (Brevo; SQAP, Tabla 25: Render gratuito bloquea SMTP). El formato
 * del cuerpo es el de Brevo (`sender`, `to`, `subject`, `htmlContent`, `textContent`).
 */
export async function enviarPorApi(
  m: MensajeCorreo,
  c: ConfiguracionCorreo,
  hacerFetch: typeof fetch = fetch,
): Promise<void> {
  if (!c.apiKey) throw new ErrorProveedorCorreo('Proveedor de correo sin configurar', true);
  const destinatario = c.redirigirA ?? m.destinatario;
  const asunto = c.redirigirA ? `[para ${m.destinatario}] ${m.asunto}` : m.asunto;
  let r: Response;
  try {
    r = await hacerFetch(c.url, {
      method: 'POST',
      headers: {
        'api-key': c.apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: c.remitente, name: c.nombreRemitente },
        to: [{ email: destinatario }],
        subject: asunto,
        htmlContent: m.html,
        textContent: m.texto,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new ErrorProveedorCorreo(`Sin respuesta del proveedor: ${(e as Error).message}`, false);
  }
  if (r.ok) return;
  // 4xx (salvo 429) no mejora reintentando; 429 y 5xx sí.
  const definitivo = r.status >= 400 && r.status < 500 && r.status !== 429;
  throw new ErrorProveedorCorreo(`El proveedor respondió ${r.status}`, definitivo);
}
