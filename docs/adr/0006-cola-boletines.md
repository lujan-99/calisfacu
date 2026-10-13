# ADR-0006: Cola BullMQ + Redis para los boletines

- **Estado:** Propuesta (se implementa en la semana 3, T-046) · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** US-07, RNF-03, R05, CAL-001

## Contexto

Generar el PDF de un curso grande en la misma petición agota el tiempo de respuesta en el cierre de trimestre (CAL-001).

## Decisión

El boletín de un estudiante se genera en la petición (p95 ≤ 2000 ms, M03). Los de cursos de más de 50 estudiantes van a
una cola BullMQ sobre Redis, y el profesor recibe un aviso cuando están listos.

## Consecuencias

- Se agrega Redis (servicio Key Value de Render; en local y CI, el del docker-compose).
- La etapa Rendimiento mide el boletín individual; la cola se prueba con pruebas e2e.
