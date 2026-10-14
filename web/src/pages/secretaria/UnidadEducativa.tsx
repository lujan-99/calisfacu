import { useEffect, useState, type FormEvent } from 'react';
import { Campo } from '../../componentes/Campo';
import { Aviso, Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
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
      {/* Banner Hero Institucional de Unidad Educativa (US-18) */}
      <section className="hero-rol hero-secretaria" aria-label="Resumen de la institución">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="edificio" tam={16} />
            <span>Datos Maestros · Ministerio de Educación</span>
          </div>
          <h2>Identidad Institucional y Acreditación SIE</h2>
          <p>
            Parámetros oficiales del establecimiento que encabezan boletines trimestrales,
            centralizadores y certificaciones académicas.
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{codigoSie || '—'}</span>
            <span className="hero-metrica-etiqueta">Código SIE Oficial</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">MinEdu</span>
            <span className="hero-metrica-etiqueta">Acreditación Regular</span>
          </div>
        </div>
      </section>

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
          <form
            className="tarjeta panel form-unidad-educativa"
            data-cy="form-unidad-educativa"
            style={{ flex: '1 1 360px', maxWidth: 560 }}
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
                placeholder="Nombre oficial del colegio"
                aria-invalid={!!errores.nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Campo>
            <Campo
              etiqueta="Código SIE"
              error={errores.codigoSie}
              ayuda="8 dígitos, asignado por el Ministerio de Educación"
            >
              <input
                data-cy="ue-codigo-sie"
                value={codigoSie}
                inputMode="numeric"
                maxLength={8}
                placeholder="80980123"
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
            className="vista-previa-boletin-contenedor"
            style={{ flex: '1 1 320px', maxWidth: 480 }}
          >
            <span className="vista-previa-etiqueta">VISTA PREVIA DEL ENCABEZADO OFICIAL</span>
            <div className="tarjeta vista-previa-documento">
              <div className="documento-franja-guindo" />
              <div className="documento-cuerpo-previa">
                <div className="documento-emblema">
                  <Icono nombre="escudo" tam={28} />
                </div>
                <div className="documento-titulo">{nombre || 'Nombre de la unidad educativa'}</div>
                <div className="documento-sie">Código SIE: {codigoSie || '________'}</div>
                <div className="documento-separador" />
                <div className="documento-subtitulo">Boletín de calificaciones</div>
                <span className="documento-norma-pie">
                  Subsistema de Educación Regular · Gestión 2026
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
