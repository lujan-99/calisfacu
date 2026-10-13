# Jenkins de CalisFacu

Jenkins es el sistema de CI/CD del proyecto (SQAP, Secciones 9 y 10). Corre en Docker en la computadora de Lujan y
lee el `Jenkinsfile` de la raíz del repositorio como un **Multibranch Pipeline**.

## 1. Levantar Jenkins (una sola vez, ~15 min)

```bash
cp jenkins/.env.example jenkins/.env          # completar SONAR_SCANNER_VERSION y las URL de staging
docker compose -f jenkins/docker-compose.yml --env-file jenkins/.env up -d --build
docker compose -f jenkins/docker-compose.yml exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Abrir <http://localhost:8080>, pegar la contraseña, **omitir** la instalación de plugins sugeridos (ya vienen en
`plugins.txt`) y crear los usuarios `lujan` y `galvan`.

## 2. Seguridad

_Manage Jenkins → Security_: **Matrix-based security**. Solo `lujan` y `galvan` con todos los permisos; `Anonymous`
sin ninguno.

## 3. Credenciales (Manage Jenkins → Credentials → System → Global)

| ID                    | Tipo                   | Valor                                                                                                         |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `github-calisfacu`    | Username with password | usuario de GitHub + token _fine-grained_: Contents (read), Commit statuses (read/write), Pull requests (read) |
| `sonar-token`         | Secret text            | token de SonarQube Cloud                                                                                      |
| `render-hook-staging` | Secret text            | Deploy Hook del servicio de staging en Render                                                                 |
| `render-hook-prod`    | Secret text            | Deploy Hook del servicio de producción en Render                                                              |
| `vercel-token`        | Secret text            | token de Vercel                                                                                               |
| `vercel-org-id`       | Secret text            | `orgId` de `web/.vercel/project.json`                                                                         |
| `vercel-project-id`   | Secret text            | `projectId` de `web/.vercel/project.json`                                                                     |

## 4. Job Multibranch "calisfacu" (New Item → Multibranch Pipeline)

| Opción                             | Valor                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Branch Sources                     | GitHub · credencial `github-calisfacu` · `https://github.com/lujan-99/calisfacu`                                |
| Behaviours                         | Discover branches (excluir las que también son PR) · Discover pull requests from origin (merge) · Discover tags |
| Build strategies                   | Regular branches · Change requests · Tags (ignorar etiquetas de más de 7 días)                                  |
| Build Configuration                | by Jenkinsfile, ruta `Jenkinsfile`                                                                              |
| Scan Multibranch Pipeline Triggers | Periodically if not otherwise run: **1 minute** (Jenkins es local y no recibe webhooks)                         |

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
docker run --rm -v jenkins_jenkins_home:/data -v "$PWD":/backup alpine \
  tar czf /backup/jenkins_home-$(date +%F).tgz -C /data .
```

Para reinstalar en otra computadora: repetir el paso 1 y restaurar el `.tgz` en el volumen antes de iniciar Jenkins.
