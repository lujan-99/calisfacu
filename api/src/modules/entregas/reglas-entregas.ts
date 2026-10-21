export interface ConteoEntrega {
  totalActividades: number;
  totalEstudiantes: number;
  totalNotasRegistradas: number;
}

export interface RequisitosEntrega {
  puedeEntregar: boolean;
  totalNotasRequeridas: number;
  notasFaltantes: number;
  razon?: string;
}

/**
 * US-10, criterio 2: una materia se entrega solo si cada estudiante del curso tiene nota en cada actividad del
 * trimestre. Una materia sin actividades o un curso sin estudiantes no tienen nada que entregar.
 */
export function requisitosEntrega(c: ConteoEntrega): RequisitosEntrega {
  const totalNotasRequeridas = c.totalActividades * c.totalEstudiantes;
  const notasFaltantes = Math.max(0, totalNotasRequeridas - c.totalNotasRegistradas);
  const rechazo = (razon: string) => ({
    puedeEntregar: false,
    totalNotasRequeridas,
    notasFaltantes,
    razon: `No se puede marcar como entregada: ${razon}`,
  });
  if (c.totalActividades === 0)
    return rechazo('la materia no tiene actividades en este trimestre.');
  if (c.totalEstudiantes === 0) return rechazo('el curso no tiene estudiantes.');
  if (notasFaltantes > 0) {
    const falta = notasFaltantes === 1 ? 'falta 1 nota' : `faltan ${notasFaltantes} notas`;
    return rechazo(
      `${falta} por registrar. Todos los estudiantes deben tener nota en todas las actividades.`,
    );
  }
  return { puedeEntregar: true, totalNotasRequeridas, notasFaltantes: 0 };
}
