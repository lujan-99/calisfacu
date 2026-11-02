import { afterEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import {
  TIEMPO_MAXIMO_ENTREGA_MINUTOS,
  calcularResumenNotificacionesPadre,
  filtrarNotificacionesPadre,
  generarPlantillaCorreoBoletin,
  listarAvisosBoletinPadre,
  marcarAvisoBoletinLeido,
  validarTiempoEntrega,
} from './avisosBoletin';

afterEach(() => vi.restoreAllMocks());

const AVISOS_PRUEBA: api.NotificacionBoletinPadreApi[] = [
  {
    id: 1,
    estudianteId: 15,
    estudianteNombre: 'Pérez Condori, Alejandro',
    codigoRude: '90000000015',
    cursoId: 1,
    cursoNombre: 'Secundaria 3.º «A»',
    trimestreId: 1,
    trimestreNumero: 1,
    gestionAnio: 2026,
    fechaPublicacion: '2026-11-02T10:00:00Z',
    canalEnvio: 'EMAIL',
    correoDestinatario: 'padre@calisfacu.edu.bo',
    tiempoEntregaMinutos: 9, // Cumple <= 15 min
    leido: false,
    estadoEnvio: 'ENVIADO',
  },
  {
    id: 2,
    estudianteId: 16,
    estudianteNombre: 'Pérez Condori, Lucía',
    codigoRude: '90000000016',
    cursoId: 2,
    cursoNombre: 'Primaria 5.º «B»',
    trimestreId: 1,
    trimestreNumero: 1,
    gestionAnio: 2026,
    fechaPublicacion: '2026-11-02T09:30:00Z',
    canalEnvio: 'EMAIL',
    correoDestinatario: 'padre@calisfacu.edu.bo',
    tiempoEntregaMinutos: 14, // Cumple <= 15 min
    leido: true,
    estadoEnvio: 'ENVIADO',
  },
  {
    id: 3,
    estudianteId: 15,
    estudianteNombre: 'Pérez Condori, Alejandro',
    codigoRude: '90000000015',
    cursoId: 1,
    cursoNombre: 'Secundaria 3.º «A»',
    trimestreId: 2,
    trimestreNumero: 2,
    gestionAnio: 2026,
    fechaPublicacion: '2026-11-02T08:00:00Z',
    canalEnvio: 'EMAIL',
    correoDestinatario: 'padre@calisfacu.edu.bo',
    tiempoEntregaMinutos: 25, // No cumplió (mayor a 15 min)
    leido: false,
    estadoEnvio: 'ENVIADO',
  },
];

describe('Avisos de Boletín Disponible (US-12, T-062)', () => {
  it('debe validar que la notificación por correo se entregue en 15 minutos o menos (US-12 CA 1)', () => {
    expect(TIEMPO_MAXIMO_ENTREGA_MINUTOS).toBe(15);
    expect(validarTiempoEntrega(0)).toBe(true);
    expect(validarTiempoEntrega(5)).toBe(true);
    expect(validarTiempoEntrega(15)).toBe(true);
    expect(validarTiempoEntrega(15.1)).toBe(false);
    expect(validarTiempoEntrega(20)).toBe(false);
    expect(validarTiempoEntrega(-1)).toBe(false);
  });

  it('debe generar el asunto y cuerpo del correo oficial conforme a la normativa del Ministerio', () => {
    const plantilla = generarPlantillaCorreoBoletin({
      estudianteNombre: 'Alejandro Pérez Condori',
      cursoNombre: 'Secundaria 3.º «A»',
      trimestreNumero: 1,
      anioGestion: 2026,
      tutorNombre: 'Juan Pérez',
      codigoSie: '80730001',
    });

    expect(plantilla.asunto).toContain('Boletín Disponible: Alejandro Pérez Condori');
    expect(plantilla.asunto).toContain('1.er trimestre');
    expect(plantilla.asunto).toContain('2026');

    expect(plantilla.cuerpoTexto).toContain('Estimado(a) Juan Pérez:');
    expect(plantilla.cuerpoTexto).toContain('Secundaria 3.º «A»');
    expect(plantilla.cuerpoTexto).toContain('RM 001/2026');
    expect(plantilla.cuerpoTexto).toContain('https://calisfacu.edu.bo/padre/boletin');

    expect(plantilla.cuerpoHtml).toContain('Boletín de Calificaciones Disponible');
    expect(plantilla.cuerpoHtml).toContain('Alejandro Pérez Condori');
  });

  it('debe filtrar adecuadamente avisos no leídos y por estudiante vinculado (RN-09)', () => {
    const todos = filtrarNotificacionesPadre(AVISOS_PRUEBA, false, null);
    expect(todos).toHaveLength(3);

    const soloNoLeidos = filtrarNotificacionesPadre(AVISOS_PRUEBA, true, null);
    expect(soloNoLeidos).toHaveLength(2);
    expect(soloNoLeidos.every((a) => !a.leido)).toBe(true);

    const soloAlejandro = filtrarNotificacionesPadre(AVISOS_PRUEBA, false, 15);
    expect(soloAlejandro).toHaveLength(2);
    expect(soloAlejandro.every((a) => a.estudianteId === 15)).toBe(true);

    const luciaNoLeidos = filtrarNotificacionesPadre(AVISOS_PRUEBA, true, 16);
    expect(luciaNoLeidos).toHaveLength(0); // Lucía tiene solo id 2 y está leído
  });

  it('debe calcular el resumen de avisos recibidos y entregados a tiempo', () => {
    const resumen = calcularResumenNotificacionesPadre(AVISOS_PRUEBA);

    expect(resumen.total).toBe(3);
    expect(resumen.noLeidas).toBe(2);
    expect(resumen.leidas).toBe(1);
    expect(resumen.correosEnviadosEnTiempo).toBe(2); // IDs 1 y 2 (9 min y 14 min)
  });

  it('debe listar avisos del padre utilizando la API si está disponible', async () => {
    const apiSpy = vi.spyOn(api, 'listarNotificacionesPadreApi').mockResolvedValue(AVISOS_PRUEBA);

    const resultado = await listarAvisosBoletinPadre();
    expect(apiSpy).toHaveBeenCalled();
    expect(resultado).toEqual(AVISOS_PRUEBA);
  });

  it('debe generar avisos de respaldo si la API aún no está disponible pero el boletín está publicado', async () => {
    vi.spyOn(api, 'listarNotificacionesPadreApi').mockRejectedValue(new Error('Endpoint no listo'));
    vi.spyOn(api, 'listarHijosTutorApi').mockResolvedValue([
      {
        id: 20,
        nombres: 'Sofía',
        apellidos: 'Vargas',
        codigoRude: '90000000020',
        curso: {
          id: 3,
          nombre: 'Primaria 1.º «A»',
          nivel: 'PRIMARIA',
          paralelo: 'A',
          anioEscolaridad: 1,
        },
        gestion: { id: 1, anio: 2026 },
      },
    ]);
    vi.spyOn(api, 'obtenerBoletinHijoApi').mockResolvedValue({
      estudiante: {
        id: 20,
        nombres: 'Sofía',
        apellidos: 'Vargas',
        codigoRude: '90000000020',
        curso: {
          id: 3,
          nombre: 'Primaria 1.º «A»',
          nivel: 'PRIMARIA',
          paralelo: 'A',
          anioEscolaridad: 1,
        },
      },
      publicado: true,
      estadoPeriodo: 'PUBLICADO',
      promedioAnual: 90,
      porcentajeAsistencia: 100,
      estadoAnual: 'PROMOVIDO',
      materias: [],
    });

    const resultado = await listarAvisosBoletinPadre();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].estudianteNombre).toBe('Vargas, Sofía');
    expect(resultado[0].tiempoEntregaMinutos).toBeLessThanOrEqual(TIEMPO_MAXIMO_ENTREGA_MINUTOS);
    expect(resultado[0].canalEnvio).toBe('EMAIL');
  });

  it('debe marcar una notificación como leída invocando la API correspondiente', async () => {
    const apiSpy = vi.spyOn(api, 'marcarNotificacionPadreLeidaApi').mockResolvedValue(undefined);

    await marcarAvisoBoletinLeido(42);
    expect(apiSpy).toHaveBeenCalledWith(42);
  });
});
