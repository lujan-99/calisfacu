export enum Rol {
  ADMINISTRADOR = 'ADMINISTRADOR',
  SECRETARIA = 'SECRETARIA',
  PROFESOR = 'PROFESOR',
  PADRE = 'PADRE',
}

export enum Nivel {
  INICIAL = 'INICIAL',
  PRIMARIA = 'PRIMARIA',
  SECUNDARIA = 'SECUNDARIA',
}

export enum OrigenCambio {
  REGISTRO = 'REGISTRO',
  CORRECCION = 'CORRECCION',
  IMPORTACION = 'IMPORTACION',
}

export enum EstadoAsistencia {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  LICENCIA = 'LICENCIA',
}

export enum EstadoSolicitud {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

/** Relación del padre de familia o tutor con el estudiante (US-20, decisión D17). */
export enum Parentesco {
  PADRE = 'PADRE',
  MADRE = 'MADRE',
  TUTOR_LEGAL = 'TUTOR_LEGAL',
  APODERADO = 'APODERADO',
  OTRO = 'OTRO',
}
