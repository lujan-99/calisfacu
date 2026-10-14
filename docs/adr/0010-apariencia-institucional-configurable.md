# ADR-0010: Apariencia de la institución configurable desde la API

- **Estado:** Aceptada
- **Fecha:** 13/10/2026
- **Decisores:** Lujan (autor), Galvan (revisor)
- **Relacionado con:** US-18 criterio 5 (datos de la unidad educativa), diseño de las 12 pantallas, RNF de usabilidad en
  celular, RNF-04 (seguridad)

## Contexto

El diseño de las pantallas usa una paleta (azul marino, azul, ámbar) y un logo "UE" provisional. La unidad educativa
piloto todavía no está confirmada (SQAP, Anexo F) y otra institución querrá sus propios colores y su logo. Si los colores
y el logo se escriben en el código de la web, cada cambio exige programar, probar y desplegar.

## Opciones consideradas

1. **Colores y logo fijos en la web**: lo más simple · cada institución necesita un cambio de código y un despliegue.
2. **Variables de entorno del build de la web**: sin base de datos · igual exige reconstruir y desplegar, y no hay
   pantalla para cambiarlos.
3. **La API los guarda y los publica**: la web los aplica al cargar como variables CSS · hay que validar los colores y
   el archivo del logo.

## Decisión

Opción 3. La tabla `unidades_educativas` guarda tres colores (`marca`, `primario`, `acento`) y el logo (`bytea`).
`GET /api/institucion` es pública: la pantalla de ingreso los necesita antes de la sesión. Devuelve el nombre, el código
SIE, los colores y `logoVersion`, y la imagen se pide a `GET /api/institucion/logo?v=<logoVersion>`. El administrador los
cambia con `PUT /api/unidad-educativa/colores` y `PUT|DELETE /api/unidad-educativa/logo`.

Una instalación de CalisFacu atiende a **una** unidad educativa: la API usa la primera fila de la tabla.

Reglas:

- **Colores** `#RRGGBB`, guardados en mayúsculas (`CHECK` en la base). El texto blanco sobre `marca` y sobre `primario`
  debe tener contraste ≥ 4,5:1, y el `acento` sobre `marca` ≥ 3:1 (WCAG 2.1 AA). Así ningún cambio de colores deja la
  interfaz ilegible, tampoco en el celular al sol.
- **Logo:** solo PNG, JPEG o WebP, reconocidos por los primeros bytes del archivo y no por su nombre o su Content-Type.
  **SVG no**, porque puede llevar código. Máximo 256 KB (413 si se excede). Se sirve con la cabecera
  `X-Content-Type-Options: nosniff` y con caché de un día; cada logo nuevo cambia `logoVersion` y, con ella, la URL.
- **Sin logo,** la web muestra las iniciales sobre el color de acento, como en el diseño.

En la web, los tres colores se aplican como variables CSS (`--color-marca`, `--color-primario`, `--color-acento`) sobre
la paleta neutra del diseño. Ningún componente escribe un color de marca fijo.

## Consecuencias

- **Positivas:** cambiar la identidad de la institución no requiere código ni despliegue. La validación de contraste
  protege la accesibilidad.
- **Negativas o deuda asumida:** el logo vive en la base y entra en el respaldo diario, pero es pequeño (256 KB como
  máximo). Para varias instituciones en una misma instalación haría falta un identificador de institución por usuario,
  fuera del alcance de la v1.0.
- **Cómo se verifica:** `apariencia.spec.ts` (formato, contraste y tipo de imagen) y `academico.e2e-spec.ts`
  (institución pública, colores ilegibles rechazados, logo falso o grande rechazado). Las rutas están en la matriz M09
  de `autorizacion.e2e-spec.ts`.
