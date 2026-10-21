import { guardarPlanilla, type Planilla } from './api';
import type { RegistroAuditoriaDetallado } from './auditoriaNotas';
import { validarNota } from './notas';

const CLAVE_AUDITORIA_LOCAL = 'calisfacu_auditoria_notas_v1';
const EVENTO_AUDITORIA = 'calisfacu_auditoria_actualizada';

export interface FilaImportacionValida {
  estudianteId: number;
  codigoRude: string;
  estudiante: string;
  valor: number;
  valida: true;
}

export interface FilaImportacionError {
  linea: number;
  identificador: string;
  valorIngresado: string;
  motivo: string;
  valida: false;
}

export interface VistaPreviaImportacion {
  totalFilas: number;
  filasValidas: FilaImportacionValida[];
  filasObservadas: FilaImportacionError[];
  resumen: {
    total: number;
    validas: number;
    errores: number;
  };
}

/**
 * Normaliza cadenas para comparación insensible a mayúsculas y acentos.
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parsea y valida el contenido de una planilla importada (US-05, criterios 1 y 2).
 * Acepta formatos CSV o texto tabulado (copiar y pegar de Excel).
 * Columnas esperadas: [Identificador (RUDE o N.º), Nombre (opcional), Nota]
 */
export function procesarTextoImportacion(
  contenido: string,
  planilla: Planilla,
): VistaPreviaImportacion {
  const lineas = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const filasValidas: FilaImportacionValida[] = [];
  const filasObservadas: FilaImportacionError[] = [];

  // Mapeos de búsqueda para los estudiantes del curso
  const mapaPorRude = new Map<string, (typeof planilla.filas)[0]>();
  const mapaPorNombre = new Map<string, (typeof planilla.filas)[0]>();

  for (const f of planilla.filas) {
    mapaPorNombre.set(normalizar(f.estudiante), f);
  }

  // Detectar si la primera fila es encabezado (ej. RUDE, Estudiante, Nota)
  let inicio = 0;
  if (lineas.length > 0) {
    const primera = normalizar(lineas[0]);
    if (
      primera.includes('rude') ||
      primera.includes('estudiante') ||
      primera.includes('nota') ||
      primera.includes('apellidos')
    ) {
      inicio = 1;
    }
  }

  for (let idx = inicio; idx < lineas.length; idx++) {
    const numLinea = idx + 1;
    const linea = lineas[idx];

    // Detectar separador: tabulador, punto y coma, o coma
    let columnas: string[];
    if (linea.includes('\t')) {
      columnas = linea.split('\t').map((c) => c.trim());
    } else if (linea.includes(';')) {
      columnas = linea.split(';').map((c) => c.trim());
    } else {
      columnas = linea.split(',').map((c) => c.trim());
    }

    if (columnas.length === 0 || (columnas.length === 1 && columnas[0] === '')) {
      continue;
    }

    let estudianteEncontrado: (typeof planilla.filas)[0] | undefined;
    let valorTexto = '';
    let identificadorTexto = '';

    if (columnas.length >= 3) {
      // Formato típico: [RUDE, Nombre, Nota]
      identificadorTexto = columnas[0];
      const nombreCol = columnas[1];
      valorTexto = columnas[2];

      estudianteEncontrado =
        mapaPorRude.get(identificadorTexto) ?? mapaPorNombre.get(normalizar(nombreCol));
      if (!estudianteEncontrado) {
        // Buscar coincidencia parcial de nombre
        const normNombre = normalizar(nombreCol);
        for (const [nom, est] of mapaPorNombre.entries()) {
          if (nom.includes(normNombre) || normNombre.includes(nom)) {
            estudianteEncontrado = est;
            break;
          }
        }
      }
    } else if (columnas.length === 2) {
      // Formato: [Estudiante o RUDE, Nota]
      identificadorTexto = columnas[0];
      valorTexto = columnas[1];

      estudianteEncontrado =
        mapaPorRude.get(identificadorTexto) ?? mapaPorNombre.get(normalizar(identificadorTexto));
      if (!estudianteEncontrado) {
        const normId = normalizar(identificadorTexto);
        for (const [nom, est] of mapaPorNombre.entries()) {
          if (nom.includes(normId) || normId.includes(nom)) {
            estudianteEncontrado = est;
            break;
          }
        }
      }
    } else {
      // 1 sola columna: no tiene nota
      filasObservadas.push({
        linea: numLinea,
        identificador: columnas[0],
        valorIngresado: '',
        motivo: 'Formato inválido: se requiere al menos columna de estudiante y nota',
        valida: false,
      });
      continue;
    }

    // 1. Validar existencia del estudiante (US-05, criterio 2)
    if (!estudianteEncontrado) {
      filasObservadas.push({
        linea: numLinea,
        identificador: identificadorTexto,
        valorIngresado: valorTexto,
        motivo: `El estudiante "${identificadorTexto}" no existe o no pertenece a este curso`,
        valida: false,
      });
      continue;
    }

    // 2. Validar valor de la nota (US-05, criterio 2: 1 a 100)
    const resNota = validarNota(valorTexto);
    if (!resNota.valida) {
      filasObservadas.push({
        linea: numLinea,
        identificador: estudianteEncontrado.estudiante,
        valorIngresado: valorTexto,
        motivo: resNota.error,
        valida: false,
      });
      continue;
    }

    // Fila completamente válida
    filasValidas.push({
      estudianteId: estudianteEncontrado.estudianteId,
      codigoRude: identificadorTexto,
      estudiante: estudianteEncontrado.estudiante,
      valor: resNota.valor,
      valida: true,
    });
  }

  return {
    totalFilas: filasValidas.length + filasObservadas.length,
    filasValidas,
    filasObservadas,
    resumen: {
      total: filasValidas.length + filasObservadas.length,
      validas: filasValidas.length,
      errores: filasObservadas.length,
    },
  };
}

/**
 * Lee un archivo File seleccionado por el usuario y genera su vista previa.
 */
export async function leerArchivoImportacion(
  archivo: File,
  planilla: Planilla,
): Promise<VistaPreviaImportacion> {
  const texto = await archivo.text();
  return procesarTextoImportacion(texto, planilla);
}

/**
 * Confirma la importación de notas válidas y registra la auditoría con origen "IMPORTACION" (US-05, criterio 3).
 */
export async function confirmarImportacionNotas(
  actividadId: number,
  filasValidas: FilaImportacionValida[],
  usuarioNombre: string,
): Promise<{ guardadas: number }> {
  if (filasValidas.length === 0) {
    throw new Error('No hay notas válidas para importar');
  }

  const notasPayload = filasValidas.map((f) => ({
    estudianteId: f.estudianteId,
    valor: f.valor,
  }));

  // Guardar en la base a través de la API
  const respuesta = await guardarPlanilla(actividadId, notasPayload);

  // Registrar cada nota importada en la auditoría con origen "IMPORTACION" (criterio 3)
  try {
    const raw = localStorage.getItem(CLAVE_AUDITORIA_LOCAL);
    const lista: RegistroAuditoriaDetallado[] = raw
      ? (JSON.parse(raw) as RegistroAuditoriaDetallado[])
      : [];

    for (const f of filasValidas) {
      const id = `AUD-${new Date().getFullYear()}-${String(lista.length + 1).padStart(3, '0')}`;
      lista.push({
        id,
        actividadId,
        estudianteId: f.estudianteId,
        estudianteNombre: f.estudiante,
        notaId: null,
        fecha: new Date().toISOString(),
        usuario: usuarioNombre,
        valorAnterior: null,
        valorNuevo: f.valor,
        motivo: 'Importación inicial desde planilla Excel',
        origen: 'IMPORTACION',
      });
    }

    localStorage.setItem(CLAVE_AUDITORIA_LOCAL, JSON.stringify(lista));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENTO_AUDITORIA));
    }
  } catch {
    // Si no está disponible localStorage, no interrumpe el guardado
  }

  return respuesta;
}

/**
 * Genera el contenido CSV de la plantilla oficial descargable para el profesor.
 */
export function generarPlantillaCsv(planilla: Planilla): string {
  const encabezado = 'N.º,Apellidos y Nombres,Nota (1-100)\n';
  const filas = planilla.filas
    .map((f, i) => `${i + 1},"${f.estudiante}",${f.valor !== null ? f.valor : ''}`)
    .join('\n');
  return encabezado + filas;
}
