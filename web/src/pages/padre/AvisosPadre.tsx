import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Aviso, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { Icono } from '../../componentes/Icono';
import { listarHijosTutorApi, type HijoTutor } from '../../lib/api';
import {
  calcularResumenNotificacionesPadre,
  filtrarNotificacionesPadre,
  listarAvisosBoletinPadre,
  marcarAvisoBoletinLeido,
  type AvisoBoletinPadre,
} from '../../lib/avisosBoletin';
import { formatoFecha, nombreTrimestre } from '../../lib/formato';
import { useCarga } from '../../lib/useCarga';
import { textoError, useMensaje } from '../../lib/useMensaje';

/**
 * Pantalla de Avisos y Notificaciones de Boletines para Padres de Familia (US-12, T-062).
 * Criterio de aceptación 1: Dado un boletín recién publicado, cada padre vinculado recibe
 * un correo en 15 minutos o menos.
 * RN-09: Un padre solo ve la información de los estudiantes vinculados a su cuenta.
 */
export function AvisosPadre() {
  const navigate = useNavigate();
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [estudianteIdFiltro, setEstudianteIdFiltro] = useState<number | null>(null);
  const [mensaje, setMensaje] = useMensaje();
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [marcandoId, setMarcandoId] = useState<number | null>(null);

  // Carga de hijos vinculados para el filtro
  const { carga: hijosCarga } = useCarga(() => listarHijosTutorApi(), []);
  const hijos: HijoTutor[] = hijosCarga.estado === 'datos' ? hijosCarga.datos : [];

  // Carga de notificaciones
  const { carga, recargar } = useCarga(() => listarAvisosBoletinPadre(), []);
  const avisos: AvisoBoletinPadre[] = carga.estado === 'datos' ? carga.datos : [];

  const resumen = calcularResumenNotificacionesPadre(avisos);
  const avisosFiltrados = filtrarNotificacionesPadre(avisos, soloNoLeidos, estudianteIdFiltro);

  async function handleMarcarLeido(aviso: AvisoBoletinPadre) {
    if (aviso.leido) return;
    setMarcandoId(aviso.id);
    setErrorAccion(null);
    try {
      await marcarAvisoBoletinLeido(aviso.id);
      aviso.leido = true;
      setMensaje('Notificación marcada como leída.');
      void recargar();
    } catch (err) {
      setErrorAccion(textoError(err, 'No se pudo actualizar la notificación.'));
    } finally {
      setMarcandoId(null);
    }
  }

  function handleVerBoletin() {
    void navigate('/padre/boletin');
  }

  return (
    <>
      {/* Banner hero informativo */}
      <section className="hero-rol hero-padre" aria-label="Portal de avisos">
        <div className="hero-rol-contenido">
          <div className="hero-rol-insignia">
            <Icono nombre="alerta" tam={16} />
            <span>Notificaciones Oficiales · US-12</span>
          </div>
          <h2>Avisos de Boletines Publicados</h2>
          <p>
            Información en tiempo real cuando la Dirección y Secretaría de la Unidad Educativa
            publican un nuevo boletín de calificaciones oficial (RM 001/2026).
          </p>
        </div>
        <div className="hero-rol-metricas">
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{resumen.noLeidas}</span>
            <span className="hero-metrica-etiqueta">Nuevas sin leer</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">{resumen.total}</span>
            <span className="hero-metrica-etiqueta">Total recibidas</span>
          </div>
          <div className="hero-metrica-tarjeta">
            <span className="hero-metrica-numero">&le; 15 min</span>
            <span className="hero-metrica-etiqueta">Entrega garantizada</span>
          </div>
        </div>
      </section>

      <div className="titulo-pagina">
        <div>
          <h1>Avisos y notificaciones</h1>
          <span className="subtitulo">
            Alertas de boletines disponibles enviados por correo y en el portal (US-12)
          </span>
        </div>
      </div>

      {mensaje && <Aviso tipo="exito">{mensaje}</Aviso>}
      {errorAccion && <Aviso tipo="error">{errorAccion}</Aviso>}

      {/* Filtros */}
      <div
        className="filtros"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 20,
        }}
      >
        {hijos.length > 1 && (
          <label className="campo" style={{ maxWidth: 320 }}>
            Filtrar por estudiante
            <select
              data-cy="select-filtro-estudiante"
              value={estudianteIdFiltro ?? ''}
              onChange={(e) =>
                setEstudianteIdFiltro(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Todos los hijos vinculados</option>
              {hijos.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.apellidos}, {h.nombres}
                </option>
              ))}
            </select>
          </label>
        )}

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            height: 42,
          }}
        >
          <input
            type="checkbox"
            data-cy="check-solo-no-leidos"
            checked={soloNoLeidos}
            onChange={(e) => setSoloNoLeidos(e.target.checked)}
          />
          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Mostrar solo no leídas</span>
        </label>
      </div>

      {carga.estado === 'cargando' && <Cargando texto="Cargando notificaciones…" />}

      {carga.estado === 'error' && (
        <ErrorCarga
          mensaje={`No se pudieron cargar las notificaciones. ${carga.mensaje}`}
          reintentar={recargar}
        />
      )}

      {carga.estado === 'datos' && (
        <>
          {avisosFiltrados.length === 0 ? (
            <Vacio
              icono="correo"
              titulo="No hay notificaciones para mostrar"
              texto="Cuando la unidad educativa publique un nuevo boletín oficial de sus hijos vinculados, recibirá aquí y en su correo el aviso correspondiente."
            />
          ) : (
            <div
              className="lista-tarjetas"
              data-cy="contenedor-avisos-padre"
              style={{ display: 'grid', gap: 16 }}
            >
              {avisosFiltrados.map((aviso) => {
                const trimNombre = nombreTrimestre(aviso.trimestreNumero);
                const esNoLeido = !aviso.leido;

                return (
                  <article
                    key={aviso.id}
                    className="tarjeta panel"
                    data-cy="tarjeta-aviso-boletin"
                    style={{
                      padding: 20,
                      borderRadius: 10,
                      border: esNoLeido ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: esNoLeido ? '#eff6ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: esNoLeido ? '#dbeafe' : '#f1f5f9',
                            color: esNoLeido ? '#1d4ed8' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icono nombre="correo" tam={20} />
                        </span>
                        <div>
                          <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                            Boletín Disponible: {aviso.estudianteNombre}
                          </strong>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            {aviso.cursoNombre} · RUDE: {aviso.codigoRude}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {esNoLeido ? (
                          <span
                            className="insignia"
                            style={{ background: '#2563eb', color: '#ffffff', fontWeight: 600 }}
                          >
                            Nuevo aviso
                          </span>
                        ) : (
                          <span className="insignia insignia-plomo">Leído</span>
                        )}
                        <span className="insignia insignia-curso">
                          {trimNombre} {aviso.gestionAnio}
                        </span>
                      </div>
                    </div>

                    <p
                      style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.5 }}
                    >
                      El boletín oficial de calificaciones del <strong>{trimNombre}</strong> de la
                      gestión <strong>{aviso.gestionAnio}</strong> ya se encuentra disponible para
                      su consulta y descarga en formato PDF.
                    </p>

                    {/* Estado real del correo (US-12 CA 1: <= 15 min), según la API */}
                    {(() => {
                      const enviado = aviso.estadoEnvio === 'ENVIADO';
                      const texto = enviado
                        ? `Enviado a ${aviso.correoDestinatario ?? 'su correo'} ${
                            aviso.tiempoEntregaMinutos === null
                              ? ''
                              : `${aviso.tiempoEntregaMinutos} min después de la publicación`
                          }.`
                        : aviso.estadoEnvio === 'PENDIENTE'
                          ? 'El correo está en camino; el aviso ya está disponible aquí.'
                          : aviso.estadoEnvio === 'FALLIDO'
                            ? 'No se pudo entregar el correo; el aviso está disponible aquí.'
                            : 'Este aviso está solo dentro del sistema (el envío por correo no está activo).';
                      return (
                        <div
                          data-cy="estado-correo-aviso"
                          style={{
                            padding: '10px 14px',
                            borderRadius: 6,
                            background: enviado ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${enviado ? '#bbf7d0' : '#e2e8f0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                            fontSize: '0.88rem',
                            color: enviado ? '#166534' : '#334155',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icono nombre={enviado ? 'check' : 'correo'} tam={16} />
                            <span>
                              <strong>Notificación por correo:</strong> {texto}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.82rem' }}>
                            Publicado: {formatoFecha(aviso.fechaPublicacion)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Acciones */}
                    <div
                      style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}
                    >
                      {esNoLeido && (
                        <button
                          type="button"
                          className="boton boton-secundario"
                          data-cy="btn-marcar-leido"
                          disabled={marcandoId === aviso.id}
                          onClick={() => void handleMarcarLeido(aviso)}
                        >
                          {marcandoId === aviso.id ? 'Marcando…' : 'Marcar como leído'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="boton boton-primario"
                        data-cy="btn-ir-boletin"
                        onClick={handleVerBoletin}
                      >
                        <Icono nombre="documento" tam={16} />
                        Ver Boletín Oficial
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
