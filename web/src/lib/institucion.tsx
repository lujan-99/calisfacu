import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { obtenerInstitucion, urlLogo, type Institucion } from './api';

export const INSTITUCION_PREDETERMINADA: Institucion = {
  nombre: null,
  codigoSie: null,
  colores: { marca: '#13283F', primario: '#1D4E89', acento: '#F2B33D' },
  logoVersion: null,
};

interface ContextoInstitucion extends Institucion {
  logoUrl: string | null;
  iniciales: string;
  /** Vuelve a leer la institución, por ejemplo después de que la secretaria cambia el nombre. */
  recargar: () => void;
}

const Contexto = createContext<ContextoInstitucion | null>(null);

/** "Unidad Educativa Juana Azurduy" → "JA"; sin nombre, "UE" como en el diseño. */
export function iniciales(nombre: string | null): string {
  const palabras = (nombre ?? '')
    .replace(/^(unidad educativa|u\.\s*e\.)\s*/i, '')
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p));
  // Con una sola palabra significativa ("U. E. de Prueba") se queda el "UE" del diseño.
  if (palabras.length < 2) return 'UE';
  return palabras
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/** Aplica los colores de la institución como variables CSS en <html> (ADR-0010). */
export function aplicarColores(colores: Institucion['colores'], raiz = document.documentElement) {
  raiz.style.setProperty('--color-marca', colores.marca);
  raiz.style.setProperty('--color-primario', colores.primario);
  raiz.style.setProperty('--color-acento', colores.acento);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colores.marca);
}

export function InstitucionProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Institucion>(INSTITUCION_PREDETERMINADA);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    // Si la API no responde, la aplicación sigue con la apariencia predeterminada.
    obtenerInstitucion()
      .then((i) => {
        if (!vigente) return;
        setDatos(i);
        aplicarColores(i.colores);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [version]);

  const valor: ContextoInstitucion = {
    ...datos,
    logoUrl: datos.logoVersion ? urlLogo(datos.logoVersion) : null,
    iniciales: iniciales(datos.nombre),
    recargar: () => setVersion((v) => v + 1),
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useInstitucion(): ContextoInstitucion {
  const c = useContext(Contexto);
  if (!c) throw new Error('useInstitucion debe usarse dentro de InstitucionProvider');
  return c;
}
