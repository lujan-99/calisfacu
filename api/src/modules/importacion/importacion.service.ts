import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import type { Repository } from 'typeorm';
import type { UsuarioToken } from '../../common/decoradores';
import { Estudiante, Nota, OrigenCambio } from '../../database/entities';
import { AccesoNotasService } from '../notas/acceso.service';
import { NotasService } from '../notas/notas.service';
import { type FilaLeida, validarFilas } from './reglas-importacion';

export const IMPORTACION_MAX_BYTES = 1024 * 1024;
export const IMPORTACION_MAX_FILAS = 1000;
const ENCABEZADOS = ['Código RUDE', 'Estudiante', 'Nota'];

/** Valor de una celda de exceljs: las fórmulas valen su resultado y el texto enriquecido, su texto. */
function valorCelda(valor: ExcelJS.CellValue): unknown {
  if (valor && typeof valor === 'object') {
    if ('result' in valor) return valor.result;
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('');
    if ('text' in valor) return valor.text;
  }
  return valor;
}

/** Texto de una celda de encabezado o de RUDE: un RUDE puede venir como número si Excel lo convirtió. */
function textoCelda(valor: ExcelJS.CellValue): string {
  const v = valorCelda(valor);
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
}

/**
 * Importación de notas desde la plantilla .xlsx (US-05, T-038). Las filas válidas se guardan con la misma
 * validación y auditoría que la planilla (US-01), con origen IMPORTACION (criterio 3; decisión D14).
 */
@Injectable()
export class ImportacionService {
  constructor(
    private readonly acceso: AccesoNotasService,
    private readonly notasService: NotasService,
    @InjectRepository(Estudiante) private readonly estudiantes: Repository<Estudiante>,
    @InjectRepository(Nota) private readonly notas: Repository<Nota>,
  ) {}

  private estudiantesDelCurso(cursoId: number) {
    return this.estudiantes.find({
      where: { curso: { id: cursoId } },
      order: { apellidos: 'ASC', nombres: 'ASC' },
    });
  }

  /** Plantilla con los estudiantes del curso de la actividad y la columna Nota vacía. */
  async plantilla(actividadId: number, usuario: UsuarioToken) {
    const actividad = await this.acceso.actividadDelProfesor(actividadId, usuario, false);
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Notas');
    hoja.columns = [{ width: 16 }, { width: 36 }, { width: 10 }];
    hoja.addRow(ENCABEZADOS).font = { bold: true };
    for (const e of await this.estudiantesDelCurso(actividad.materia.curso.id)) {
      hoja.addRow([e.codigoRude, `${e.apellidos}, ${e.nombres}`, null]);
    }
    const datos = Buffer.from(await libro.xlsx.writeBuffer());
    const nombre = `notas-${actividad.materia.nombre}-${actividad.nombre}`
      .normalize('NFD')
      .replace(/[^\w-]+/g, '-')
      .toLowerCase();
    return { datos, nombre: `${nombre}.xlsx` };
  }

  /** Filas de la primera hoja: la columna RUDE y la columna Nota se buscan por su encabezado. */
  private async leer(archivo: Buffer | undefined): Promise<FilaLeida[]> {
    if (!archivo?.length) throw new BadRequestException('Adjunte la planilla Excel (.xlsx)');
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(archivo as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('El archivo no es una planilla Excel (.xlsx) válida');
    }
    const hoja = libro.worksheets[0];
    if (!hoja) throw new BadRequestException('La planilla no tiene hojas');
    // values empieza en 1 y deja la posición 0 vacía: Array.from la convierte en undefined.
    const encabezados = Array.from(hoja.getRow(1).values as ExcelJS.CellValue[], (v) =>
      textoCelda(v).toLowerCase(),
    );
    const columnaRude = encabezados.findIndex((t) => t.includes('rude'));
    const columnaNota = encabezados.findIndex((t) => t === 'nota');
    if (columnaRude < 1 || columnaNota < 1) {
      throw new BadRequestException(
        'La planilla debe tener las columnas "Código RUDE" y "Nota" en la primera fila',
      );
    }
    const filas: FilaLeida[] = [];
    hoja.eachRow((fila, linea) => {
      if (linea === 1) return;
      const rude = textoCelda(fila.getCell(columnaRude).value);
      const nota = valorCelda(fila.getCell(columnaNota).value);
      if (rude === '' && (nota === null || nota === undefined)) return;
      filas.push({ linea, rude, nota });
    });
    if (filas.length > IMPORTACION_MAX_FILAS) {
      throw new BadRequestException(`La planilla tiene más de ${IMPORTACION_MAX_FILAS} filas`);
    }
    return filas;
  }

  /** Criterios 1 y 2: qué filas se guardarían y por qué se rechaza cada una de las demás. */
  async vistaPrevia(actividadId: number, archivo: Buffer | undefined, usuario: UsuarioToken) {
    const actividad = await this.acceso.actividadDelProfesor(actividadId, usuario, false);
    const filas = await this.leer(archivo);
    const [estudiantes, existentes] = await Promise.all([
      this.estudiantesDelCurso(actividad.materia.curso.id),
      this.notas.find({
        where: { actividad: { id: actividad.id } },
        relations: { estudiante: true },
      }),
    ]);
    return validarFilas(filas, estudiantes, new Set(existentes.map((n) => n.estudiante.id)));
  }

  /** Guarda las filas válidas en una transacción, con auditoría de origen IMPORTACION (criterio 3). */
  async confirmar(actividadId: number, archivo: Buffer | undefined, usuario: UsuarioToken) {
    await this.acceso.actividadDelProfesor(actividadId, usuario, true);
    const vista = await this.vistaPrevia(actividadId, archivo, usuario);
    if (vista.filasValidas.length === 0) {
      throw new UnprocessableEntityException('No hay filas válidas para importar');
    }
    const { guardadas } = await this.notasService.registrarPlanilla(
      {
        actividadId,
        notas: vista.filasValidas.map((f) => ({ estudianteId: f.estudianteId, valor: f.valor })),
      },
      usuario,
      OrigenCambio.IMPORTACION,
    );
    return {
      guardadas,
      rechazadas: vista.filasObservadas.length,
      filasObservadas: vista.filasObservadas,
    };
  }
}
