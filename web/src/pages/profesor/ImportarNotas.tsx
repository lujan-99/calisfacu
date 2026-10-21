import { useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import {
  confirmarImportacion,
  descargarPlantillaImportacion,
  obtenerPlanilla,
  vistaPreviaImportacion,
  type VistaPreviaImportacion,
} from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';

/**
 * Pantalla de Carga y Vista Previa de la Importación desde Excel (US-05, T-039).
 * El profesor descarga la plantilla .xlsx, la sube con las notas y ve qué filas son válidas y cuáles tienen error.
 * La API lee y valida el archivo (T-038); al confirmar, vuelve a validarlo y guarda las filas válidas con auditoría
 * de origen "IMPORTACION" en la misma transacción.
 */
export function ImportarNotas() {
  const { materiaId, actividadId } = useParams();
  const id = Number(actividadId);
  const navigate = useNavigate();

  const { carga, recargar } = useCarga(() => obtenerPlanilla(id), [id]);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaImportacion | null>(null);
  const [tabVista, setTabVista] = useState<'validas' | 'errores'>('validas');
  const [procesando, setProcesando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [errorProceso, setErrorProceso] = useState<string | null>(null);

  if (carga.estado === 'cargando') {
    return <Cargando texto="Cargando información de la planilla…" filas={6} alto={48} />;
  }

  if (carga.estado === 'error') {
    return (
      <ErrorCarga
        mensaje={`No se pudo cargar la actividad para importación. ${carga.mensaje}`}
        reintentar={recargar}
      />
    );
  }

  const planilla = carga.datos;
  const volverA = `/profesor/materias/${materiaId}/actividades/${id}`;

  const mensajeDe = (e: unknown, porDefecto: string) =>
    e instanceof Error ? e.message : porDefecto;

  const descargarPlantilla = async () => {
    setErrorProceso(null);
    try {
      const datos = await descargarPlantillaImportacion(id);
      const url = URL.createObjectURL(datos);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Plantilla_${planilla.actividad.materia}_${planilla.actividad.nombre}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    } catch (e) {
      setErrorProceso(mensajeDe(e, 'No se pudo descargar la plantilla.'));
    }
  };

  const alSeleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0];
    e.target.value = '';
    if (!elegido) return;
    setArchivo(elegido);
    setVistaPrevia(null);
    setErrorProceso(null);
    setProcesando(true);
    try {
      const resultado = await vistaPreviaImportacion(id, elegido);
      setVistaPrevia(resultado);
      setTabVista(resultado.filasValidas.length > 0 ? 'validas' : 'errores');
    } catch (err) {
      setErrorProceso(mensajeDe(err, 'No se pudo leer el archivo seleccionado.'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmar = async () => {
    if (!archivo || !vistaPrevia || vistaPrevia.filasValidas.length === 0) return;
    setImportando(true);
    setErrorProceso(null);
    try {
      const { guardadas } = await confirmarImportacion(id, archivo);
      void navigate(volverA, {
        state: {
          mensajeExito: `Se importaron ${guardadas} calificaciones con auditoría de origen importación.`,
        },
      });
    } catch (e) {
      setErrorProceso(mensajeDe(e, 'Error al confirmar la importación'));
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      {/* Banner Hero Institucional (US-05) */}
      <section className="hero-rol hero-profesor" aria-label="Importación de calificaciones">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="documento" tam={16} />
            <span>Migración Ágil de Calificaciones · US-05</span>
          </div>
          <h2>Importar Notas desde Excel</h2>
          <p>
            Descargue la plantilla, complete la columna Nota y súbala para migrar las notas en un
            solo paso. Cada nota importada quedará registrada en auditoría con origen oficial
            "IMPORTACIÓN".
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{planilla.filas.length}</span>
            <span className="hero-metrica-etiqueta">Estudiantes</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {vistaPrevia ? vistaPrevia.resumen.validas : '0'}
            </span>
            <span className="hero-metrica-etiqueta">Válidas para migrar</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">
              {vistaPrevia ? vistaPrevia.resumen.errores : '0'}
            </span>
            <span className="hero-metrica-etiqueta">Observadas</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <Link to={volverA} className="volver" data-cy="link-volver">
            <Icono nombre="flechaIzq" tam={16} />
            Volver a la planilla
          </Link>
          <h1 data-cy="importar-titulo">{planilla.actividad.nombre}</h1>
          <span className="subtitulo">
            {planilla.actividad.materia} · {planilla.actividad.curso} ·{' '}
            {nombreTrimestre(planilla.actividad.trimestre.numero)} ·{' '}
            <strong style={{ color: 'var(--color-primario, #78192a)' }}>
              {planilla.actividad.dimension}
            </strong>
          </span>
        </div>
        <div>
          <button
            type="button"
            className="boton boton-secundario"
            data-cy="btn-descargar-plantilla"
            onClick={() => void descargarPlantilla()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="tabla" tam={16} />
            Descargar plantilla Excel
          </button>
        </div>
      </div>

      {errorProceso && (
        <Aviso tipo="error" cy="aviso-error-importacion">
          {errorProceso}
        </Aviso>
      )}

      {/* Carga del archivo (US-05, criterio 1) */}
      <div className="tarjeta" style={{ padding: 20, marginBottom: 24 }}>
        <h3
          style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Icono nombre="documento" tam={18} />
          Subir la planilla Excel
        </h3>
        <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 16 }}>
          Use la plantilla descargada: cada fila lleva el código RUDE del estudiante y su nota de 1
          a 100. Las notas que ya están registradas no se reemplazan: se corrigen con motivo.
        </p>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            border: '2px dashed var(--borde)',
            borderRadius: 8,
            backgroundColor: '#fafafa',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <Icono nombre="portapapeles" tam={28} />
          <span style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
            {procesando
              ? 'Analizando la planilla…'
              : (archivo?.name ?? 'Haga clic para buscar su archivo (.xlsx)')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--texto-3)', marginTop: 4 }}>
            Formato: Excel .xlsx, hasta 1 MB y 1000 filas
          </span>
          <input
            type="file"
            data-cy="input-archivo-excel"
            aria-label="Planilla Excel con las notas"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => void alSeleccionarArchivo(e)}
            disabled={procesando || importando}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Sección de Vista Previa (US-05, Criterio 1 y 2) */}
      {vistaPrevia && (
        <section
          className="tabla-marco"
          data-cy="seccion-vista-previa"
          style={{ marginBottom: 32 }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--borde)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ fontSize: 16 }}>Vista Previa de Importación</h2>
              <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
                {vistaPrevia.resumen.total} filas analizadas ·{' '}
                <strong style={{ color: '#166534' }}>{vistaPrevia.resumen.validas} válidas</strong>{' '}
                ·{' '}
                <strong style={{ color: '#991b1b' }}>
                  {vistaPrevia.resumen.errores} observadas
                </strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={
                  tabVista === 'validas' ? 'boton boton-primario' : 'boton boton-secundario'
                }
                data-cy="tab-ver-validas"
                onClick={() => setTabVista('validas')}
              >
                Válidas ({vistaPrevia.resumen.validas})
              </button>
              <button
                type="button"
                className={
                  tabVista === 'errores' ? 'boton boton-primario' : 'boton boton-secundario'
                }
                data-cy="tab-ver-errores"
                onClick={() => setTabVista('errores')}
              >
                Observadas ({vistaPrevia.resumen.errores})
              </button>
            </div>
          </div>

          {/* Tab de Filas Válidas */}
          {tabVista === 'validas' && (
            <div>
              {vistaPrevia.filasValidas.length === 0 ? (
                <div style={{ padding: 24 }}>
                  <Vacio titulo="No se encontraron notas válidas para importar" />
                </div>
              ) : (
                <table className="tabla" data-cy="tabla-filas-validas">
                  <thead>
                    <tr>
                      <th className="col-n">N.º</th>
                      <th>Estudiante</th>
                      <th className="numero">Nota a Asentar (1–100)</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistaPrevia.filasValidas.map((f, i) => (
                      <tr key={f.estudianteId} data-cy="fila-valida">
                        <td className="col-n">
                          <span className="insignia-plomo">{i + 1}</span>
                        </td>
                        <td>
                          <strong>{f.estudiante}</strong>
                        </td>
                        <td className="numero">
                          <strong style={{ color: 'var(--color-primario, #78192a)' }}>
                            {formatoNumero(f.valor)}
                          </strong>
                        </td>
                        <td>
                          <span className="insignia insignia-exito" style={{ fontSize: 11 }}>
                            <Icono nombre="check" tam={12} /> Lista para migrar
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab de Filas Observadas (US-05, Criterio 2) */}
          {tabVista === 'errores' && (
            <div>
              {vistaPrevia.filasObservadas.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#166534', fontSize: 14 }}>
                  ✓ ¡Excelente! No se registraron filas observadas. Todas las calificaciones son
                  válidas.
                </div>
              ) : (
                <table className="tabla" data-cy="tabla-filas-errores">
                  <thead>
                    <tr>
                      <th className="col-n">Línea</th>
                      <th>Identificador / Estudiante</th>
                      <th>Valor ingresado</th>
                      <th>Motivo de rechazo (No se guardará)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vistaPrevia.filasObservadas.map((f, i) => (
                      <tr key={i} data-cy="fila-error">
                        <td className="col-n">{f.linea}</td>
                        <td>
                          <strong>{f.identificador || 'Desconocido'}</strong>
                        </td>
                        <td>
                          <code>{f.valorIngresado || '—'}</code>
                        </td>
                        <td>
                          <span className="insignia insignia-error" style={{ fontSize: 11 }}>
                            <Icono nombre="cruz" tam={12} />
                            <span>{f.motivo}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Barra de Confirmación Inferior (US-05, Criterio 3) */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--borde)',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
              Solo se guardarán las <strong>{vistaPrevia.resumen.validas} notas válidas</strong>.
              Las notas observadas serán descartadas.
            </span>
            <button
              type="button"
              className="boton boton-primario"
              data-cy="btn-confirmar-importacion"
              disabled={vistaPrevia.resumen.validas === 0 || importando}
              onClick={() => void confirmar()}
            >
              {importando
                ? 'Importando calificaciones…'
                : `Confirmar e Importar (${vistaPrevia.resumen.validas} notas)`}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
