import { BadRequestException, Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { NOTA_MINIMA_APROBACION, SUMA_DIMENSIONES } from './reglas';

export interface ConfigDimension {
  codigo: string;
  puntajeMaximo: number;
}

export interface ResultadoDimension {
  codigo: string;
  puntajeMaximo: number;
  promedio: number | null;
  puntos: number | null;
}

export interface ResultadoTrimestral {
  dimensiones: ResultadoDimension[];
  /** Suma sin redondear (para auditoría y depuración). null si falta alguna dimensión. */
  sinRedondear: number | null;
  /** Nota trimestral oficial, redondeada al entero. null si falta alguna dimensión. */
  nota: number | null;
  aprobado: boolean | null;
  /** Dimensiones sin ninguna actividad con nota (❓ regla provisional: la nota queda pendiente). */
  pendientes: string[];
}

const dec = (n: number) => new Decimal(String(n));

/**
 * Módulo crítico: cálculo de la nota trimestral según el reglamento vigente (RNF-01, US-02).
 * Aritmética decimal exacta: un 50,5 nunca se convierte en 50,4999… (riesgo R02).
 */
@Injectable()
export class CalculoService {
  /** Las dimensiones de una gestión deben sumar 100 y tener puntajes positivos (US-18, criterio 6). */
  validarDimensiones(dimensiones: readonly ConfigDimension[]): void {
    if (dimensiones.length === 0) throw new BadRequestException('La gestión no tiene dimensiones');
    const codigos = new Set(dimensiones.map((d) => d.codigo));
    if (codigos.size !== dimensiones.length) {
      throw new BadRequestException('Hay dimensiones repetidas');
    }
    if (dimensiones.some((d) => !Number.isInteger(d.puntajeMaximo) || d.puntajeMaximo <= 0)) {
      throw new BadRequestException('Cada dimensión debe tener un puntaje entero mayor que 0');
    }
    const suma = dimensiones.reduce((s, d) => s + d.puntajeMaximo, 0);
    if (suma !== SUMA_DIMENSIONES) {
      const diferencia = SUMA_DIMENSIONES - suma;
      throw new BadRequestException(
        `Las dimensiones suman ${suma}; ${diferencia > 0 ? 'faltan' : 'sobran'} ${Math.abs(diferencia)} puntos`,
      );
    }
  }

  /** Promedio exacto de las notas de las actividades de una dimensión. */
  promedio(notas: readonly number[]): Decimal | null {
    if (notas.length === 0) return null;
    return notas.reduce((s, n) => s.plus(dec(n)), new Decimal(0)).dividedBy(notas.length);
  }

  /** Puntos = promedio × puntaje máximo / 100. Ej.: Saber con promedio 80 → 80 × 45 / 100 = 36. */
  puntosDimension(promedio: Decimal, puntajeMaximo: number): Decimal {
    return promedio.times(puntajeMaximo).dividedBy(100);
  }

  /** Redondeo al entero más cercano, 0,5 hacia arriba (❓ confirmar con el cliente). */
  redondear(valor: Decimal): number {
    return valor.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  }

  aprobado(nota: number): boolean {
    return nota >= NOTA_MINIMA_APROBACION;
  }

  /** Nota trimestral = suma de los puntos de cada dimensión, redondeada al entero. */
  notaTrimestral(
    dimensiones: readonly ConfigDimension[],
    notasPorDimension: Readonly<Record<string, readonly number[]>>,
  ): ResultadoTrimestral {
    this.validarDimensiones(dimensiones);
    const resultado: ResultadoDimension[] = dimensiones.map((d) => {
      const prom = this.promedio(notasPorDimension[d.codigo] ?? []);
      return {
        codigo: d.codigo,
        puntajeMaximo: d.puntajeMaximo,
        promedio: prom ? prom.toDecimalPlaces(2).toNumber() : null,
        puntos: prom
          ? this.puntosDimension(prom, d.puntajeMaximo).toDecimalPlaces(2).toNumber()
          : null,
      };
    });
    const pendientes = resultado.filter((r) => r.puntos === null).map((r) => r.codigo);
    if (pendientes.length > 0) {
      return { dimensiones: resultado, sinRedondear: null, nota: null, aprobado: null, pendientes };
    }
    const suma = dimensiones.reduce((s, d) => {
      const prom = this.promedio(notasPorDimension[d.codigo]) as Decimal;
      return s.plus(this.puntosDimension(prom, d.puntajeMaximo));
    }, new Decimal(0));
    const nota = this.redondear(suma);
    return {
      dimensiones: resultado,
      sinRedondear: suma.toDecimalPlaces(4).toNumber(),
      nota,
      aprobado: this.aprobado(nota),
      pendientes,
    };
  }

  /** Nota anual = promedio de las notas trimestrales, redondeado (❓ confirmar con el reglamento vigente). */
  notaAnual(trimestrales: readonly number[]): number {
    if (trimestrales.length === 0) throw new BadRequestException('No hay notas trimestrales');
    return this.redondear(this.promedio(trimestrales) as Decimal);
  }
}
