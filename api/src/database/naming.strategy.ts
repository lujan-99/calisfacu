import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

const aSnake = (texto: string) => texto.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Tablas y columnas en snake_case (SQAP, Sección 5: convenciones de nombres). */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  columnName(propiedad: string, nombre: string | undefined, prefijos: string[]): string {
    return aSnake(prefijos.concat(nombre ?? propiedad).join('_'));
  }

  relationName(propiedad: string): string {
    return aSnake(propiedad);
  }

  joinColumnName(relacion: string, columnaReferenciada: string): string {
    return aSnake(`${relacion}_${columnaReferenciada}`);
  }

  joinTableColumnName(tabla: string, propiedad: string, columna?: string): string {
    return aSnake(`${tabla}_${columna ?? propiedad}`);
  }
}
