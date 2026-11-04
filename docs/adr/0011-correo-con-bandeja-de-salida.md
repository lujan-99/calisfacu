# ADR-0011: Correo por la API HTTP del proveedor con bandeja de salida en la base

- **Estado:** Aceptada (implementada el 03/11/2026 en T-061 y T-062) · **Fecha:** 03/11/2026 · **Decisores:** Lujan
- **Relacionado con:** US-08 (criterio 1, 5 minutos), US-12 (criterio 1, 15 minutos), D7, SQAP Tabla 25

## Contexto

Las alertas de promedio bajo y los avisos de boletín se envían dentro del sistema y por correo (D7). Render gratuito
bloquea los puertos SMTP 25, 465 y 587 (SQAP, Tabla 25), así que el correo sale por la API HTTP de un proveedor. El
proveedor puede fallar o no estar configurado, y el aviso dentro del sistema no puede depender de él.

## Opciones consideradas

1. **Enviar en la misma petición que crea el aviso**: simple · una caída del proveedor hace fallar o demorar el
   registro de notas, y un correo fallido se pierde.
2. **Cola BullMQ (como los boletines, ADR-0006)**: reintentos incluidos · el correo vive en Redis: si Redis se reinicia
   se pierde, y no queda registro consultable de qué se envió.
3. **Bandeja de salida en PostgreSQL (`correos`)**: el correo se guarda en la misma transacción que su aviso, se envía
   enseguida sin bloquear la petición y se reintenta; queda registro de cada envío · un proceso periódico más.

## Decisión

Opción 3. Cada aviso (alerta o aviso de boletín) guarda su fila en `correos` en la misma transacción. `CorreosService`
la envía enseguida por la API transaccional de Brevo y, si falla, reintenta a los 1, 2, 4 y 8 minutos (cada 30 s revisa
los pendientes) hasta 5 intentos; un 4xx distinto de 429 es definitivo. Sin `CORREO_API_KEY` el correo queda
`SIN_PROVEEDOR` y el aviso sigue dentro del sistema.

## Consecuencias

- Positivas: el aviso nunca depende del proveedor; con dos fallos seguidos el correo sale igual en 3 minutos (US-08 pide 5) y con tres, en 7 (US-12 pide 15); `correos` es la evidencia de cada envío (estado, intentos, último error y hora).
- Negativas o deuda asumida: hace falta una cuenta del proveedor y su clave en Render (`CORREO_API_KEY`,
  `CORREO_REMITENTE` verificado en Brevo). Fuera de producción, `CORREO_REDIRIGIR_A` manda todo a una casilla de prueba
  porque los usuarios del seed tienen correos ficticios. El destinatario no se escribe en el log.
- Cómo se verifica: `correo.spec.ts` (formato del proveedor, errores definitivos y reintentos) y
  `correo-avisos.e2e-spec.ts`, con un proveedor falso local: el correo de la alerta sale tras un 503 y su reintento, el
  del boletín llega al padre vinculado y la alerta funciona sin proveedor.
