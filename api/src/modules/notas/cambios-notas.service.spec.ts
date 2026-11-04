import { Logger } from '@nestjs/common';
import { CambiosNotasService, type CambioNotas } from './cambios-notas.service';

/** US-08 (T-060): las notas avisan cuando cambian; un oyente que falla no deshace el guardado. */
describe('CambiosNotasService (US-08)', () => {
  const cambio: CambioNotas = { actividadId: 1, estudianteIds: [2, 3] };

  it('debe avisar a cada oyente y esperar a que termine', async () => {
    const hub = new CambiosNotasService();
    const recibidos: CambioNotas[] = [];
    hub.suscribir(async (c) => {
      await Promise.resolve();
      recibidos.push(c);
    });
    hub.suscribir((c) => {
      recibidos.push(c);
    });
    await hub.notificar(cambio);
    expect(recibidos).toEqual([cambio, cambio]);
  });

  it('debe seguir con los demás oyentes si uno falla, sin propagar el error', async () => {
    const hub = new CambiosNotasService();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const recibidos: CambioNotas[] = [];
    hub.suscribir(() => {
      throw new Error('falla');
    });
    hub.suscribir((c) => {
      recibidos.push(c);
    });
    await expect(hub.notificar(cambio)).resolves.toBeUndefined();
    expect(recibidos).toEqual([cambio]);
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it('debe no hacer nada sin oyentes ni estudiantes', async () => {
    const hub = new CambiosNotasService();
    const oyente = jest.fn();
    await expect(hub.notificar(cambio)).resolves.toBeUndefined();
    hub.suscribir(oyente);
    await hub.notificar({ actividadId: 1, estudianteIds: [] });
    expect(oyente).not.toHaveBeenCalled();
  });
});
