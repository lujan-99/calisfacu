import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { obtenerPlanilla } from '../../lib/api';
import { formatoNumero, nombreTrimestre } from '../../lib/formato';
import {
  confirmarImportacionNotas,
  generarPlantillaCsv,
  procesarTextoImportacion,
  type VistaPreviaImportacion,
} from '../../lib/importacionExcel';
import { useSesion } from '../../lib/sesion';
import { useCarga } from '../../lib/useCarga';

/**
 * Pantalla de Carga y Vista Previa de la Importación desde Excel (US-05, T-039).
 * Permite al profesor subir o pegar su planilla de calificaciones, previsualizar
 * las filas válidas y las filas con error, y confirmar el guardado con auditoría
 * de origen "IMPORTACION".
 */
export function ImportarNotas() {
  const { materiaId, actividadId } = useParams();
  const id = Number(actividadId);
  const navigate = useNavigate();
  const { usuario } = useSesion();

  const { carga, recargar } = useCarga(() => obtenerPlanilla(id), [id]);

  const [textoPegado, setTextoPegado] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
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

  const descargarPlantilla = () => {
    const csv = generarPlantillaCsv(planilla);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.setAttribute(
      'download',
      `Plantilla_${planilla.actividad.materia}_${planilla.actividad.nombre}.csv`,
    );
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  const alSeleccionarArchivo = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setErrorProceso(null);
    setProcesando(true);

    const lector = new FileReader();
    lector.onload = (evento) => {
      const contenido = evento.target?.result as string;
      const resultado = procesarTextoImportacion(contenido, planilla);
      setVistaPrevia(resultado);
      setProcesando(false);
      setTabVista(resultado.filasValidas.length > 0 ? 'validas' : 'errores');
    };
    lector.onerror = () => {
      setErrorProceso('No se pudo leer el archivo seleccionado.');
      setProcesando(false);
    };
    lector.readAsText(archivo);
  };

  const alProcesarTextoPegado = (e?: FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!textoPegado.trim()) {
      setErrorProceso('Pegue el contenido copiado de su planilla Excel.');
      return;
    }
    setErrorProceso(null);
    setProcesando(true);
    const resultado = procesarTextoImportacion(textoPegado, planilla);
    setVistaPrevia(resultado);
    setProcesando(false);
    setTabVista(resultado.filasValidas.length > 0 ? 'validas' : 'errores');
  };

  const confirmar = async () => {
    if (!vistaPrevia || vistaPrevia.filasValidas.length === 0 || !usuario) return;
    setImportando(true);
    setErrorProceso(null);

    try {
      await confirmarImportacionNotas(id, vistaPrevia.filasValidas, usuario.nombre);
      void navigate(volverA, {
        state: {
          mensajeExito: `Se importaron ${vistaPrevia.filasValidas.length} calificaciones con auditoría de origen importación.`,
        },
      });
    } catch (e) {
      setErrorProceso(e instanceof Error ? e.message : 'Error al confirmar la importación');
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
            Cargue su planilla Excel o pegue las notas directamente para migrarlas al sistema en un
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
            onClick={descargarPlantilla}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="tabla" tam={16} />
            Descargar plantilla Excel (CSV)
          </button>
        </div>
      </div>

      {errorProceso && (
        <Aviso tipo="error" cy="aviso-error-importacion">
          {errorProceso}
        </Aviso>
      )}

      {/* Selector de Método de Carga */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Opción 1: Archivo */}
        <div className="tarjeta" style={{ padding: 20 }}>
          <h3
            style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="documento" tam={18} />
            Opción 1: Subir archivo Excel o CSV
          </h3>
          <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 16 }}>
            Seleccione el archivo exportado o la plantilla prellenada con las notas.
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
              {nombreArchivo ?? 'Haga clic para buscar su archivo (.csv, .xlsx, .txt)'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--texto-3)', marginTop: 4 }}>
              Formatos soportados: CSV delimitado por comas, puntos y comas o tabulaciones
            </span>
            <input
              type="file"
              data-cy="input-archivo-excel"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={alSeleccionarArchivo}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Opción 2: Pegar texto directo */}
        <div className="tarjeta" style={{ padding: 20 }}>
          <h3
            style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icono nombre="tabla" tam={18} />
            Opción 2: Pegar directamente desde Excel
          </h3>
          <p style={{ fontSize: 13, color: 'var(--texto-2)', marginBottom: 8 }}>
            Copie las filas en Excel (Ctrl + C) y péguelas aquí directamente:
          </p>

          <form onSubmit={alProcesarTextoPegado}>
            <textarea
              data-cy="textarea-pegar-excel"
              aria-label="Pegar celdas copiadas desde Excel"
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 6,
                border: '1px solid var(--borde)',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
              placeholder={`Apaza Condori, Miguel\t85\nChoque Huanca, Rosa\t90\nFlores Quispe, Daniela\t78.5`}
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
            />
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <button
                type="submit"
                className="boton boton-secundario"
                data-cy="btn-analizar-texto"
                onClick={alProcesarTextoPegado}
                disabled={procesando}
              >
                Analizar filas copiadas
              </button>
            </div>
          </form>
        </div>
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
