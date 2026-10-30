# Jenkins de CalisFacu

Jenkins es el sistema de CI/CD del proyecto (SQAP, Secciones 9 y 10). Corre en Docker en la computadora de Lujan y
lee el `Jenkinsfile` de la raíz del repositorio como un **Multibranch Pipeline**.

## 1. Levantar Jenkins (una sola vez, ~20 min la primera construcción)

Toda la configuración está en código (`casc.yaml`, plugin Configuration as Code): usuarios `lujan` y `galvan`,
permisos (sin acceso anónimo), credenciales y el job Multibranch **calisfacu**. No hay que configurar nada a mano.

```bash
cp jenkins/.env.example jenkins/.env          # URL de staging y SONAR_HABILITADO
# Secretos, uno por archivo y sin salto de línea final (jenkins/secretos/ no se versiona):
#   clave-lujan, clave-galvan       contraseñas de los usuarios de Jenkins
#   github-token                    token de GitHub con lectura del repositorio y estados de commit
#   render-hook-staging             Deploy Hook de calisfacu-api-staging
#   render-hook-web-staging         Deploy Hook de calisfacu-web-staging
#   sonar-token                     token de SonarQube Cloud (sonarcloud.io/account/security)
docker compose -f jenkins/docker-compose.yml --env-file jenkins/.env -p calisfacu-jenkins up -d --build
```

Abrir <http://localhost:8080> y entrar como `lujan` o `galvan`. Si se cambia `casc.yaml` o un secreto, volver a correr
el mismo comando: Jenkins recarga la configuración al reiniciar. **No reinicie Jenkins con un build en curso**: el
build se interrumpe.

## 2. Qué define `casc.yaml`

| Qué              | Valor                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Seguridad        | Usuarios locales `lujan` y `galvan`, ambos administradores; anónimo sin permisos (SQAP, Sección 3)                  |
| Credenciales     | `github-calisfacu`, `render-hook-staging`, `render-hook-web-staging`, `sonar-token` (leídas de `jenkins/secretos/`) |
| Job              | Multibranch `calisfacu` sobre `lujan-99/calisfacu`: ramas, PR y etiquetas de menos de 7 días                        |
| Disparo          | Escaneo del repositorio cada minuto (Jenkins es local y GitHub no puede enviarle webhooks)                          |
| Límite de la API | `ThrottleOnOver`: con token hay 5000 consultas por hora; solo frena cerca del límite                                |

En el release (T-069) se agregan a `casc.yaml` `render-hook-prod` y `render-hook-web-prod`. `sonar-token` está desde
el 30/10/2026 (T-030).

## 3. Variables de entorno (`jenkins/.env`)

| Variable                | Valor                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `STAGING_API_URL`       | URL pública de la API de staging, **sin** `/api` (los scripts lo agregan)           |
| `STAGING_WEB_URL`       | URL pública de la web de staging                                                    |
| `SONAR_HABILITADO`      | `true` cuando SonarQube Cloud esté configurado (T-030); mientras, la etapa se omite |
| `SONAR_SCANNER_VERSION` | versión del SonarScanner CLI (solo cuando se habilite SonarQube)                    |

**Etiquetas de versión:** créelas anotadas (`git tag -a v1.0.0 -m "..."`). La etapa Aprobar producción lee quién creó la
etiqueta y rechaza que esa misma persona apruebe el despliegue.

## 4. Check obligatorio de `main`

Después del primer escaneo, Jenkins publica en cada PR el estado `continuous-integration/jenkins/pr-merge`. Ese es el
**check obligatorio** de la protección de `main` (ver `docs/desarrollo/flujo-git.md`).

## 5. Comprobar que el build está sano (SQAP, Tabla 14)

- El build de `main` termina en **SUCCESS** en la Stage View.
- **Test Result** muestra más de cero pruebas y 0 fallos.
- **Build Artifacts** contiene `calisfacu-<commit>.tgz`.
- Un push inicia un build sin clic en 3 minutos o menos.

## 6. Respaldar y reinstalar (riesgo R04)

Cada viernes (día 5):

```bash
docker run --rm -v calisfacu-jenkins_jenkins_home:/data -v "$PWD":/backup alpine \
  tar czf /backup/jenkins_home-$(date +%F).tgz -C /data .
```

Para reinstalar en otra computadora: repetir el paso 1 y restaurar el `.tgz` en el volumen antes de iniciar Jenkins.
