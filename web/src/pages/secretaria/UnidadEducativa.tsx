import { useEffect, useState, type FormEvent } from 'react';
import { Campo } from '../../componentes/Campo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { ErrorApi, guardarUnidadEducativa, obtenerUnidadEducativa } from '../../lib/api';
import { useInstitucion } from '../../lib/institucion';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

/** Una respuesta 404 significa que la institución todavía no se registró: se muestra el formulario vacío. */
async function cargarDatos() {
  try {
    return await obtenerUnidadEducativa();
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 404) return null;
    throw e;
  }
}

/** Nombre y código SIE que salen en boletines y centralizadores (US-18, criterio 5; T-017). */
export function UnidadEducativa() {
  const institucion = useInstitucion();
  const { carga, recargar } = useCarga(cargarDatos, []);
  const [nombre, setNombre] = useState('');
  const [codigoSie, setCodigoSie] = useState('');
  const [errores, setErrores] = useState<{ nombre?: string; codigoSie?: string }>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useMensaje();

  useEffect(() => {
    if (carga.estado === 'datos' && carga.datos) {
      setNombre(carga.datos.nombre);
      setCodigoSie(carga.datos.codigoSie);
    }
  }, [carga]);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const err: typeof errores = {};
    if (!nombre.trim()) err.nombre = 'Escriba el nombre de la unidad educativa';
    if (!/^\d{8}$/.test(codigoSie.trim())) err.codigoSie = 'El código SIE debe tener 8 dígitos';
    setErrores(err);
    if (Object.keys(err).length > 0) return;
    setGuardando(true);
    setErrorApi(null);
    try {
      await guardarUnidadEducativa({ nombre: nombre.trim(), codigoSie: codigoSie.trim() });
      setMensaje('Se guardaron los datos de la unidad educativa');
      institucion.recargar();
    } catch (ex) {
      setErrorApi(textoError(ex));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="titulo-pagina">
        <div>
          <h1>Unidad educativa</h1>
          <span className="subtitulo">
            Estos datos aparecen en los boletines y centralizadores.
          </span>
        </div>
      </div>
      {mensaje && (
        <Aviso tipo="exito" cy="mensaje-exito">
          {mensaje}
        </Aviso>
      )}
      {carga.estado === 'cargando' && <Cargando texto="Cargando datos…" filas={2} />}
      {carga.estado === 'error' && (
        <ErrorCarga
          mensaje={`No se pudieron cargar los datos. ${carga.mensaje}`}
          reintentar={recargar}
        />
      )}
      {carga.estado === 'datos' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <form
            className="tarjeta panel"
            data-cy="form-unidad-educativa"
            style={{ flex: '1 1 340px', maxWidth: 560 }}
            onSubmit={(e) => void guardar(e)}
            noValidate
          >
            {carga.datos === null && (
              <Aviso tipo="info" cy="lista-vacia">
                Todavía no hay datos de la unidad educativa. Complételos para que salgan en
                boletines y centralizadores.
              </Aviso>
            )}
            {errorApi && <Aviso tipo="error">{errorApi}</Aviso>}
            <Campo etiqueta="Nombre" error={errores.nombre}>
              <input
                data-cy="ue-nombre"
                value={nombre}
                maxLength={120}
                aria-invalid={!!errores.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Campo>
            <Campo
              etiqueta="Código SIE"
              error={errores.codigoSie}
              ayuda="8 dígitos, asignado por el Ministerio"
            >
              <input
                data-cy="ue-codigo-sie"
                value={codigoSie}
                inputMode="numeric"
                maxLength={8}
                aria-invalid={!!errores.codigoSie}
                onChange={(e) => setCodigoSie(e.target.value.replace(/\D/g, ''))}
              />
            </Campo>
            <div className="dialogo-acciones">
              <button
                type="submit"
                className="boton boton-primario"
                data-cy="btn-guardar-unidad"
                disabled={guardando}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
          <section
            aria-label="Vista previa del boletín"
            style={{ flex: '1 1 300px', maxWidth: 460 }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--texto-3)',
              }}
            >
              ASÍ SE VERÁ EN EL BOLETÍN
            </span>
            <div
              className="tarjeta"
              style={{
                marginTop: 8,
                padding: 20,
                textAlign: 'center',
                fontFamily: 'Georgia, serif',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {nombre || 'Nombre de la unidad educativa'}
              </div>
              <div style={{ fontSize: 14, color: 'var(--texto-3)', marginTop: 4 }}>
                Código SIE: {codigoSie || '________'}
              </div>
              <hr
                style={{ border: 0, borderTop: '1px solid var(--borde)', margin: '14px 0 10px' }}
              />
              <div style={{ fontSize: 13, color: 'var(--texto-3)' }}>Boletín de calificaciones</div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
