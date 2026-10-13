# ADR-0003: Jenkins Multibranch como CI/CD; respaldos en GitHub Actions

- **Estado:** Aceptada · **Fecha:** 13/10/2026 · **Decisores:** Lujan, Galvan
- **Relacionado con:** Prácticas 6 y 8, R04, RNF-07, SQAP Secciones 9 y 10

## Contexto

El curso enseñó Jenkins (Práctica 6) y GitHub Actions (Práctica 8). El equipo prefiere Jenkins y acepta el riesgo de
alojarlo en una computadora propia.

## Opciones consideradas

1. **GitHub Actions:** sin servidor, webhooks inmediatos · el equipo prefiere Jenkins.
2. **Jenkins con un job Pipeline simple:** el de la Práctica 6 · `BRANCH_NAME` no existe y `when { branch }` nunca se
   cumple, así que las etapas de despliegue no correrían (defecto de la versión 0.2 del SQAP).
3. **Jenkins Multibranch Pipeline:** builds de ramas, PR y etiquetas; publica el estado en GitHub.

## Decisión

Jenkins Multibranch en Docker (`jenkins/`), con escaneo del repositorio cada minuto porque GitHub no puede enviar
webhooks a una máquina local. Única excepción: el respaldo diario (`.github/workflows/backup.yml`) corre en GitHub
Actions, porque debe ejecutarse a las 03:00 aunque la computadora de Jenkins esté apagada.

## Consecuencias

- Si Jenkins está apagado, no se puede fusionar a `develop` ni a `main` (riesgo R04, alto). Contingencia en
  `jenkins/README.md` y `scripts/ci-local.sh`.
- Las etiquetas solo se construyen solas con el plugin basic-branch-build-strategies.
- Verificación: indicadores del build sano en cada auditoría (SQAP, Tabla 14).
