import { correoAlertaPromedio, correoBoletinDisponible } from './plantillas';
import { configuracionCorreo, enviarPorApi, ErrorProveedorCorreo } from './proveedor';
import { escaparHtml, esperaReintentoMinutos, MAX_INTENTOS_CORREO } from './reglas-correo';

const respuesta = (status: number) => Promise.resolve(new Response(null, { status }));
const mensaje = { destinatario: 'profe@ue.test', asunto: 'Hola', texto: 'texto', html: '<p>x</p>' };
const config = configuracionCorreo({ CORREO_API_KEY: 'clave', CORREO_REMITENTE: 'avisos@ue.test' });

/** T-061 (ADR-0011): envío por la API HTTP del proveedor y reintentos. */
describe('Correo (T-061)', () => {
  it('debe enviar por la API con el formato del proveedor', async () => {
    const llamadas: [string, RequestInit][] = [];
    await enviarPorApi(mensaje, config, (url, init) => {
      llamadas.push([url as string, init as RequestInit]);
      return respuesta(201);
    });
    const [url, init] = llamadas[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe('clave');
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: 'avisos@ue.test', name: 'CalisFacu' },
      to: [{ email: 'profe@ue.test' }],
      subject: 'Hola',
      htmlContent: '<p>x</p>',
      textContent: 'texto',
    });
  });

  it('debe redirigir todos los correos a la dirección de pruebas si se configura', async () => {
    let cuerpo = '';
    await enviarPorApi(
      mensaje,
      configuracionCorreo({ CORREO_API_KEY: 'k', CORREO_REDIRIGIR_A: 'pruebas@ue.test' }),
      (_u, init) => {
        cuerpo = (init as RequestInit).body as string;
        return respuesta(201);
      },
    );
    expect(JSON.parse(cuerpo)).toMatchObject({
      to: [{ email: 'pruebas@ue.test' }],
      subject: '[para profe@ue.test] Hola',
    });
  });

  it('debe distinguir los errores que se reintentan de los definitivos', async () => {
    const error = async (status: number) =>
      enviarPorApi(mensaje, config, () => respuesta(status)).catch((e: ErrorProveedorCorreo) => e);
    expect(await error(400)).toMatchObject({ definitivo: true });
    expect(await error(429)).toMatchObject({ definitivo: false });
    expect(await error(503)).toMatchObject({ definitivo: false });
    const sinRed = await enviarPorApi(mensaje, config, () =>
      Promise.reject(new Error('ECONNRESET')),
    ).catch((e: ErrorProveedorCorreo) => e);
    expect(sinRed).toMatchObject({ definitivo: false });
    const sinClave = await enviarPorApi(mensaje, configuracionCorreo({}), () =>
      respuesta(201),
    ).catch((e: ErrorProveedorCorreo) => e);
    expect(sinClave).toMatchObject({
      definitivo: true,
      message: 'Proveedor de correo sin configurar',
    });
  });

  it('debe reintentar a los 1, 2, 4 y 8 minutos: sale en 5 minutos aunque fallen dos intentos', () => {
    expect([1, 2, 3, 4].map(esperaReintentoMinutos)).toEqual([1, 2, 4, 8]);
    expect(MAX_INTENTOS_CORREO).toBe(5);
    expect(esperaReintentoMinutos(1) + esperaReintentoMinutos(2)).toBeLessThanOrEqual(5);
  });

  it('debe escapar en el HTML lo que viene de los datos', () => {
    expect(escaparHtml(`<b>"O'Hara" & co</b>`)).toBe(
      '&lt;b&gt;&quot;O&#39;Hara&quot; &amp; co&lt;/b&gt;',
    );
    const c = correoAlertaPromedio({
      profesor: 'Ana',
      estudiante: '<script>x</script>',
      materia: 'Matemática',
      curso: 'Secundaria 3.º «A»',
      trimestre: 1,
      nota: 45,
      notaAnterior: 55,
      urlWeb: 'https://web',
    });
    expect(c.html).not.toContain('<script>');
    expect(c.texto).toContain(
      'quedó en 45, por debajo del mínimo de aprobación (51); antes era 55.',
    );
    expect(c.texto).toContain('https://web/profesor/alertas');
  });

  it('debe armar el aviso del boletín con el estudiante, el trimestre y el enlace', () => {
    const c = correoBoletinDisponible({
      padre: 'Juan',
      estudiante: 'Ana Quispe',
      curso: 'Secundaria 3.º «A»',
      trimestre: 1,
      gestion: 2026,
      urlWeb: 'https://web',
    });
    expect(c.asunto).toBe('Boletín disponible: Ana Quispe, trimestre 1 de 2026');
    expect(c.texto).toContain('https://web/padre/boletin');
  });
});
