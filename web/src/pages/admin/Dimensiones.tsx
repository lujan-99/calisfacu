import { useEffect, useState } from 'react';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  configurarDimensiones,
  ErrorApi,
  listarDimensiones,
  listarGestiones,
  type DatosDimension,
} from '../../lib/api';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

type Fila = { codigo: string; nombre: string; puntajeMaximo: string; orden: string };

export function sumaPuntajes(filas: Fila[]): number {
  return filas.reduce((s, f) => s + (Number.parseInt(f.puntajeMaximo, 10) || 0), 0);
}

export function textoSuma(suma: number): string {
  if (suma === 100) return 'Suman 100 puntos';
  return suma < 100
    ? `Suman ${suma}; faltan ${100 - suma} puntos`
    : `Suman ${suma}; sobran ${suma - 100} puntos`;
}

/**
 * Dimensiones de evaluación de una gestión (US-18, criterios 6 y 7). Deben sumar 100; si la gestión ya tiene notas,
 * la API rechaza el cambio y la tabla queda de solo lectura.
 */
export function Dimensiones() {
  const { carga: gestiones } = useCarga(listarGestiones, []);
  const [gestionId, setGestionId] = useState<number | undefined>();
  const actual = gestionId ?? (gestiones.estado === 'datos' ? gestiones.datos[0]?.id : undefined);
  const anio =
    gestiones.estado === 'datos' ? gestiones.datos.find((g) => g.id === actual)?.anio : undefined;
  const { carga, recargar } = useCarga(
    () => (actual ? listarDimensiones(actual) : Promise.resolve([])),
    [actual],
  );
  const [filas, setFilas] = useState<Fila[]>([]);
  const [bloqueada, setBloqueada] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useMensaje();

  useEffect(() => {
    if (carga.estado !== 'datos') return;
    setFilas(
      carga.datos.map((d) => ({
        codigo: d.codigo,
        nombre: d.nombre,
        puntajeMaximo: String(d.puntajeMaximo),
        orden: String(d.orden),
      })),
    );
    setBloqueada(false);
    setErrorApi(null);
  }, [carga]);

  const suma = sumaPuntajes(filas);
  const completas = filas.length > 0 && filas.every((f) => f.codigo.trim() && f.nombre.trim());
  const cambiar = (i: number, cambios: Partial<Fila>) =>
    setFilas(filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  async function guardar() {
    if (!actual) return;
    setGuardando(true);
    setErrorApi(null);
    const datos: DatosDimension[] = filas.map((f, i) => ({
      codigo: f.codigo.trim().toUpperCase(),
      nombre: f.nombre.trim(),
      puntajeMaximo: Number.parseInt(f.puntajeMaximo, 10),
      orden: Number.parseInt(f.orden, 10) || i + 1,
    }));
    try {
      await configurarDimensiones(actual, datos);
      setMensaje(`Se guardaron las dimensiones de la gestión ${anio}`);
      recargar();
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 422 && e.message.includes('notas registradas'))
        setBloqueada(true);
      else setErrorApi(textoError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* Banner de bienvenida del administrador */}
      <section className="hero-rol hero-admin" aria-label="Resumen del administrador">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="ajustes" tam={16} />
            <span>Panel de Normativa y Gobierno · Administrador</span>
          </div>
          <h2>Configuración Curricular y Ponderaciones</h2>
          <p>
            Parámetros oficiales de evaluación según la RM 001/2026. Los puntajes de las dimensiones
            deben totalizar exactamente 100 puntos y quedan bloqueados ante notas registradas.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">100</span>
            <span className="hero-metrica-etiqueta">Puntaje total exigido</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{filas.length}</span>
            <span className="hero-metrica-etiqueta">Dimensiones activas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{bloqueada ? 'Protegida' : 'Editable'}</span>
            <span className="hero-metrica-etiqueta">Estado de edición</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Dimensiones de evaluación</h1>
          <span className="subtitulo">
            Los puntajes máximos de todas las dimensiones deben sumar 100.
          </span>
        </div>
        <label className="campo" style={{ minWidth: 160 }}>
          Gestión
          <select
            data-cy="select-gestion"
            value={actual ?? ''}
            onChange={(e) => setGestionId(Number(e.target.value))}
          >
            {gestiones.estado === 'datos' &&
              gestiones.datos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.anio}
                </option>
              ))}
          </select>
        </label>
      </div>
      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {bloqueada && (
        <Aviso tipo="advertencia" cy="aviso-dimensiones-bloqueadas">
          La gestión ya tiene notas registradas: no se pueden cambiar sus dimensiones
        </Aviso>
      )}
      {errorApi && <Aviso tipo="error">{errorApi}</Aviso>}
      {carga.estado === 'cargando' && (
        <Cargando texto="Cargando dimensiones…" filas={4} alto={52} />
      )}
      {carga.estado === 'error' && <ErrorCarga mensaje={carga.mensaje} reintentar={recargar} />}
      {carga.estado === 'datos' && (
        <>
          <div className="tabla-marco">
            <table className="tabla" data-cy="tabla-dimensiones">
              <caption className="solo-lector">Dimensiones</caption>
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col">Puntaje máximo</th>
                  <th scope="col">Orden</th>
                  <th scope="col" className="acciones">
                    <span className="solo-lector">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} data-cy="fila-dimension">
                    <td style={{ minWidth: 120 }}>
                      <div className="campo">
                        <input
                          aria-label={`Código de la dimensión ${i + 1}`}
                          data-cy="dimension-codigo"
                          value={f.codigo}
                          maxLength={20}
                          disabled={bloqueada}
                          onChange={(e) => cambiar(i, { codigo: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <div className="campo">
                        <input
                          aria-label={`Nombre de la dimensión ${i + 1}`}
                          data-cy="dimension-nombre"
                          value={f.nombre}
                          maxLength={60}
                          disabled={bloqueada}
                          onChange={(e) => cambiar(i, { nombre: e.target.value })}
                        />
                      </div>
                    </td>
                    <td style={{ minWidth: 110 }}>
                      <div className="campo">
                        <input
                          aria-label={`Puntaje máximo de ${f.nombre || `la dimensión ${i + 1}`}`}
                          data-cy="dimension-puntaje"
                          inputMode="numeric"
                          value={f.puntajeMaximo}
                          disabled={bloqueada}
                          style={{ textAlign: 'right', fontWeight: 700 }}
                          onChange={(e) =>
                            cambiar(i, { puntajeMaximo: e.target.value.replace(/\D/g, '') })
                          }
                        />
                      </div>
                    </td>
                    <td style={{ minWidth: 90 }}>
                      <div className="campo">
                        <input
                          aria-label={`Orden de ${f.nombre || `la dimensión ${i + 1}`}`}
                          data-cy="dimension-orden"
                          inputMode="numeric"
                          value={f.orden}
                          disabled={bloqueada}
                          style={{ textAlign: 'right' }}
                          onChange={(e) => cambiar(i, { orden: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>
                    </td>
                    <td className="acciones">
                      <button
                        type="button"
                        className="boton-icono peligro"
                        data-cy="btn-quitar-dimension"
                        aria-label={`Quitar ${f.nombre || `la dimensión ${i + 1}`}`}
                        disabled={bloqueada}
                        onClick={() => setFilas(filas.filter((_, j) => j !== i))}
                      >
                        <Icono nombre="basura" tam={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px' }}>
              <button
                type="button"
                className="boton boton-secundario"
                data-cy="btn-agregar-dimension"
                style={{ borderStyle: 'dashed' }}
                disabled={bloqueada}
                onClick={() =>
                  setFilas([
                    ...filas,
                    { codigo: '', nombre: '', puntajeMaximo: '', orden: String(filas.length + 1) },
                  ])
                }
              >
                <Icono nombre="mas" tam={18} />
                Agregar dimensión
              </button>
            </div>
          </div>
          <div
            className="tarjeta panel"
            style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong
                data-cy="dimensiones-suma"
                role="status"
                style={{ color: suma === 100 ? 'var(--exito)' : 'var(--aviso)' }}
              >
                {textoSuma(suma)}
              </strong>
              <span className="progreso" style={{ width: '100%', height: 8 }} aria-hidden="true">
                <span
                  style={{
                    width: `${Math.min(suma, 100)}%`,
                    background: suma === 100 ? 'var(--exito)' : 'var(--aviso-barra)',
                  }}
                />
              </span>
            </div>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-guardar-dimensiones"
              disabled={suma !== 100 || !completas || bloqueada || guardando}
              onClick={() => void guardar()}
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
