import { ESCALA_MAX, ESCALA_MIN } from '../calculo/reglas';

/** Una fila de la plantilla tal como viene del archivo: la línea de Excel, el código RUDE y la celda de la nota. */
export interface FilaLeida {
  linea: number;
  rude: string;
  nota: unknown;
}

export interface EstudianteCurso {
  id: number;
  codigoRude: string;
  nombres: string;
  apellidos: string;
}

export interface FilaValida {
  estudianteId: number;
  codigoRude: string;
  estudiante: string;
  valor: number;
  valida: true;
}

export interface FilaObservada {
  linea: number;
  identificador: string;
  valorIngresado: string;
  motivo: string;
  valida: false;
}

export interface VistaPrevia {
  totalFilas: number;
  filasValidas: FilaValida[];
  filasObservadas: FilaObservada[];
  resumen: { total: number; validas: number; errores: number };
}

const NUMERO = /^\d+(?:[.,]\d{1,2})?$/;

/** Nota de la escala oficial (1 a 100, sin 0 por la decisión D1) con hasta dos decimales; null si no lo es. */
export function leerNota(celda: unknown): number | null {
  let valor: number;
  if (typeof celda === 'number') {
    valor = celda;
    if (!Number.isFinite(valor) || Number(valor.toFixed(2)) !== valor) return null;
  } else if (typeof celda === 'string' && NUMERO.test(celda.trim())) {
    valor = Number(celda.trim().replace(',', '.'));
  } else {
    return null;
  }
  return valor >= ESCALA_MIN && valor <= ESCALA_MAX ? valor : null;
}

const vacia = (celda: unknown) =>
  celda === null || celda === undefined || (typeof celda === 'string' && celda.trim() === '');

/**
 * US-05, criterios 1 y 2: cada fila es válida o se rechaza con su motivo. Una nota ya registrada no se reemplaza
 * desde un archivo: se corrige con motivo (US-04, decisión D14).
 */
export function validarFilas(
  filas: readonly FilaLeida[],
  estudiantes: readonly EstudianteCurso[],
  conNota: ReadonlySet<number>,
): VistaPrevia {
  const porRude = new Map(estudiantes.map((e) => [e.codigoRude.toUpperCase(), e]));
  const vistos = new Map<number, number>();
  const filasValidas: FilaValida[] = [];
  const filasObservadas: FilaObservada[] = [];

  for (const f of filas) {
    const rude = f.rude.trim().toUpperCase();
    const observar = (motivo: string) =>
      filasObservadas.push({
        linea: f.linea,
        identificador: rude,
        valorIngresado: vacia(f.nota) ? '' : String(f.nota),
        motivo,
        valida: false,
      });
    if (!rude) {
      observar('Falta el código RUDE');
      continue;
    }
    const estudiante = porRude.get(rude);
    if (!estudiante) {
      observar('El estudiante no existe en este curso');
      continue;
    }
    if (vacia(f.nota)) {
      observar('Falta la nota');
      continue;
    }
    const valor = leerNota(f.nota);
    if (valor === null) {
      observar(
        `La nota debe ser un número entre ${ESCALA_MIN} y ${ESCALA_MAX}, con hasta dos decimales`,
      );
      continue;
    }
    const primera = vistos.get(estudiante.id);
    if (primera !== undefined) {
      observar(
        `El estudiante aparece más de una vez en el archivo (primera vez en la fila ${primera})`,
      );
      continue;
    }
    vistos.set(estudiante.id, f.linea);
    if (conNota.has(estudiante.id)) {
      observar('Ya tiene nota en esta actividad: corríjala con motivo');
      continue;
    }
    filasValidas.push({
      estudianteId: estudiante.id,
      codigoRude: estudiante.codigoRude,
      estudiante: `${estudiante.apellidos}, ${estudiante.nombres}`,
      valor,
      valida: true,
    });
  }

  return {
    totalFilas: filas.length,
    filasValidas,
    filasObservadas,
    resumen: { total: filas.length, validas: filasValidas.length, errores: filasObservadas.length },
  };
}
