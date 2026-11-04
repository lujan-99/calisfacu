# RC2 · v1.0.0-rc.2 (T-063)

- **Commit:** `ec8ed74` · **Jenkins:** `calisfacu » v1.0.0-rc.2` #1, SUCCESS (04/11/2026, 23 min)
- **Pruebas del build:** 560 en verde, 0 fallos (API unitarias y e2e, web)
- **JMeter** (100 usuarios, 10 minutos por plan, base `seed:perf`):

| Plan     | Muestras | Errores (M04) | p95                   | Media     | Peticiones/s | RC1 (p95) |
| -------- | -------- | ------------- | --------------------- | --------- | ------------ | --------- |
| Boletín  | 56 017   | 0 %           | 25 ms (M03 ≤ 2000 ms) | 17 ms     | 93,3         | 39 ms     |
| Planilla | 2 851    | 0 %           | **51 548 ms**         | 19 793 ms | 4,4          | 178 ms    |

M03 y M04 se cumplen, así que el pipeline quedó en verde, pero la planilla tuvo una **regresión de rendimiento**: el SQAP
no tiene umbral de tiempo para «registrar planilla» (solo de errores). La causa fue T-060: después de cada registro las
alertas cargaban todas las notas de los estudiantes en la materia, y en esta prueba (actividades sin límite en una
misma materia) cada petición tardaba más que la anterior. Se corrigió en `86b4f59` (sumas en PostgreSQL); en local, con
100 usuarios durante 3 minutos, el p95 quedó estable en 478 ms. La medición de 10 minutos en Jenkins es la RC3
(`docs/evidencias/v1.0.0-rc.3/`).

**Propuesta de cambio al SQAP (Sección 16):** agregar a M03 un umbral de p95 para «registrar planilla» en la etapa
Rendimiento, para que una regresión así detenga el pipeline. Como es un cambio de umbral, lo deciden los dos
integrantes con el procedimiento del SQAP.
