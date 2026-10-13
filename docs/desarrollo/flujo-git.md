# Flujo de trabajo con Git (Git Flow)

> Resumen operativo de la Sección 10 del SQAP. Si este archivo y el SQAP no coinciden, manda el SQAP y se corrige este
> archivo en el mismo PR.

## Ramas

| Rama                             | Para qué                                  | Sale de          | Vuelve a               | Despliega                                         |
| -------------------------------- | ----------------------------------------- | ---------------- | ---------------------- | ------------------------------------------------- |
| `main`                           | Versiones liberadas (producción)          | —                | —                      | Producción, con la etiqueta `vX.Y.Z` y aprobación |
| `develop`                        | Integración                               | `main` (una vez) | `main` en cada release | Staging, en cada merge                            |
| `feature/US-NN-descripcion`      | Una tarea de una historia                 | `develop`        | `develop`              | —                                                 |
| `fix/CAL-NNN-descripcion`        | Un defecto encontrado antes de producción | `develop`        | `develop`              | —                                                 |
| `docs/...`, `ci/...`, `test/...` | Documentación, pipeline, pruebas          | `develop`        | `develop`              | —                                                 |
| `hotfix/CAL-NNN-descripcion`     | Un defecto en producción                  | `main`           | `main` **y** `develop` | Producción                                        |

Las ramas de trabajo duran uno o dos días. No se usan ramas `release/*`: el release candidate es una etiqueta.

## El día a día

```bash
git switch develop && git pull
git switch -c feature/US-01-registro-notas      # nombre: tipo/historia-descripcion

# ... TDD: prueba que falla → código → prueba en verde → refactor
git add -p
git commit                                       # Husky: lint-staged + commitlint
git push -u origin feature/US-01-registro-notas  # Husky: pruebas unitarias antes del push
# Abrir el PR hacia develop con la plantilla; asignar al revisor
```

## Mensajes de commit (Conventional Commits)

```
<tipo>(<ámbito>): <resumen en imperativo, minúsculas, sin punto>

<cuerpo opcional: qué y por qué>

Refs: US-01
```

- **Tipos:** `feat`, `fix`, `test`, `refactor`, `docs`, `style`, `perf`, `build`, `ci`, `chore`, `revert`.
- **Ámbitos:** `auth`, `academico`, `notas`, `calculo`, `auditoria`, `asistencia`, `importacion`, `boletin`, `panel`,
  `centralizacion`, `notificaciones`, `salud`, `api`, `web`, `e2e`, `perf`, `ci`, `deps`, `docs`, `sqap`, `repo`.
- **Referencia obligatoria** (commitlint la exige): `Refs: US-NN`, `Refs: CAL-NNN`, `Refs: T-NNN` o `Closes #23`.
- Un cambio que rompe compatibilidad lleva `!` (`feat(api)!: ...`) y `BREAKING CHANGE:` en el cuerpo.

Ejemplos:

```
feat(calculo): calcular la nota trimestral según la RM 001/2026
test(calculo): agregar los casos frontera 50,5 y 50,4 de la tabla firmada
fix(boletin): generar en cola los boletines de cursos de más de 50 estudiantes
docs(sqap): actualizar el umbral de M03 en las Secciones 5 y 7
```

## Pull requests

1. Destino: `develop` (o `main` solo para releases y hotfix).
2. Usar la plantilla: historia o defecto, qué cambia, cómo se probó, checklist de la DoD.
3. **Revisor** (SQAP, Sección 6): Galvan revisa módulos críticos y API; Lujan revisa interfaz, Jenkinsfile y scripts de
   prueba. **Nadie aprueba su propio PR.**
4. Debe pasar el check `continuous-integration/jenkins/pr-merge`.
5. Tamaño objetivo: 400 líneas cambiadas o menos.
6. Merge a `develop`: **squash** (el título del PR, en Conventional Commits, es el commit final). Se borra la rama.

## Release

```bash
# 1. Release candidate sobre develop (corre la prueba de carga en Jenkins: M03, M04)
git switch develop && git pull
git tag -a v1.0.0-rc.1 -m "v1.0.0-rc.1" && git push origin v1.0.0-rc.1

# 2. PR develop → main (lo aprueba quien no lo abrió); merge commit, no squash
# 3. Etiqueta de la versión en main: Jenkins pide la aprobación manual y despliega a producción
git switch main && git pull
git tag -a v1.0.0 -m "v1.0.0" && git push origin v1.0.0
```

Antes del PR a `main`, actualizar `CHANGELOG.md`. La aprobación de producción la da el integrante que **no** creó la
etiqueta; la auditoría lo verifica en la consola de Jenkins.

## Hotfix

```bash
git switch main && git pull && git switch -c hotfix/CAL-012-boletin-vacio
# corregir + prueba que reproduce el defecto
# PR → main; luego etiqueta v1.0.1; luego PR main → develop el mismo día
```

## Cambiar una historia de usuario (SQAP, Sección 10.7)

1. Abrir un issue con el formulario **Solicitud de cambio de historia**.
2. El Líder evalúa el impacto en 1 día hábil (puntos, sprint, pruebas, RNF o umbrales).
3. Lo aprueba el Líder con el cliente; si cambia el alcance aprobado, también el docente.
4. En **un mismo PR**: `docs/backlog/backlog_v2_4sprints.xlsx`, `docs/historias/US-NN-*.md` (regenerar con
   `python3 docs/herramientas/gen_backlog_md.py`), las pruebas y, si cambia un umbral, el SQAP y `matrices-sqap.xlsx`.
5. Los identificadores no se reutilizan: una historia descartada queda como "Descartada"; una dividida genera IDs nuevos.

## Protección de ramas (configurar una vez en GitHub)

_Settings → Rules → Rulesets → New branch ruleset_, aplicado a `main` y `develop`:

- [x] Restrict deletions · [x] Block force pushes
- [x] Require a pull request before merging: 1 aprobación, descartar aprobaciones con commits nuevos
- [x] Require status checks to pass: `continuous-integration/jenkins/pr-merge`; requerir rama actualizada
- Bypass list: **vacía** (sin excepción para administradores)
