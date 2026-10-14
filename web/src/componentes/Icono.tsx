// Íconos del diseño (trazo de 24 × 24). Son decorativos: el texto del botón o su aria-label dice qué hacen.
const TRAZOS = {
  libro: (
    <>
      <path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z" />
      <path d="M4 17a3 3 0 0 1 3-3h11" />
    </>
  ),
  salir: <path d="M15 4h4v16h-4M10 16l-4-4 4-4M6 12h10" />,
  capas: <path d="M12 4 3 9l9 5 9-5zM3 14l9 5 9-5" />,
  personas: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6 6 0 0 1 3 6" />
    </>
  ),
  portapapeles: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4" />
    </>
  ),
  edificio: <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M3 20h18" />,
  ajustes: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8M4 12h4M12 12h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
      <circle cx="10" cy="12" r="2" />
    </>
  ),
  documento: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  mas: <path d="M12 5v14M5 12h14" />,
  lapiz: <path d="m4 20 1-4L16 5l3 3L8 19zM14 7l3 3" />,
  basura: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  flechaIzq: <path d="M19 12H5M11 6l-6 6 6 6" />,
  flechaDer: <path d="M9 6l6 6-6 6" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  cruz: <path d="M6 6l12 12M18 6 6 18" />,
  tabla: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 4v16" />
    </>
  ),
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tam = 20 }: { nombre: NombreIcono; tam?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
