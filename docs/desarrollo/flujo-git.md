# Flujo de trabajo con Git

> Resumen operativo de la Sección 10 del SQAP y de [ADR-0008](../adr/0008-desarrollo-directo-en-develop.md). Si este
> archivo y el SQAP no coinciden, manda el SQAP y se corrige este archivo en el mismo commit.

## Ramas

| Rama                         | Para qué                         | Cómo se cambia                                      | Despliega                                         |
| ---------------------------- | -------------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| `develop`                    | Desarrollo e integración diaria  | Commits directos (con los hooks de Husky)           | Staging, en cada push                             |
| `main`                       | Versiones liberadas (producción) | Solo PR `develop → main` (release) o un hotfix      | Producción, con la etiqueta `vX.Y.Z` y aprobación |
| `hotfix/CAL-NNN-descripcion` | Un defecto en producción         | Sale de `main`, PR a `main`; luego `main → develop` | Producción                                        |

No hay ramas `feature/`, `fix/` ni `release/*`: el release candidate es una etiqueta sobre `develop`.

## El día a día

```bash
git switch develop && git pull --rebase           # traer lo último antes de empezar

# ... TDD: prueba que falla → código → prueba en verde → refactor
git add -p
git commit                                        # Husky: lint-staged + commitlint
git pull --rebase && git push                     # Husky: todas las pruebas unitarias (API y web) antes del push
```

Después del push:

1. Mire el build de `develop` en Jenkins. **Si queda en rojo, arreglarlo es lo primero**; nadie sube otra cosa encima.
2. El otro integrante revisa el commit en 1 día hábil y deja sus observaciones como comentario del commit en GitHub
   (SQAP, Sección 6): Galvan revisa módulos críticos y API; Lujan revisa interfaz, Jenkinsfile y scripts de prueba.
   Una observación se corrige con un commit nuevo que la cite.
3. `git pull --rebase` solo reordena sus commits locales que todavía no subió; nunca use `push --force` en `develop`.

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
- **Issues:** cada tarea del backlog tiene su issue en GitHub, con el mismo número (T-016 es #16; la tabla está en
  `docs/backlog/issues-github.md`). Cite los dos: `Refs: US-18, T-016, #16`. No use `Closes`: una tarea se cierra
  cuando el revisor la aprueba y se muestra en la demo (DoD), no cuando se sube el commit. El estado se cambia en el
  Excel del backlog y se sincroniza con `python3 docs/herramientas/subir_issues.py`.
- Un cambio que rompe compatibilidad lleva `!` (`feat(api)!: ...`) y `BREAKING CHANGE:` en el cuerpo.

Ejemplos:

```
feat(calculo): calcular la nota trimestral según la RM 001/2026
test(calculo): agregar los casos frontera 50,5 y 50,4 de la tabla firmada
fix(boletin): generar en cola los boletines de cursos de más de 50 estudiantes
docs(sqap): actualizar el umbral de M03 en las Secciones 5 y 7
```

## Pull request de release (`develop → main`)

1. Es el único PR del flujo. Usa la plantilla: qué historias entran, cómo se probó, checklist de la DoD.
2. Lo aprueba el integrante que **no** lo abrió, después de comprobar que todos los commits del release tienen revisión.
3. Debe pasar el check `continuous-integration/jenkins/pr-merge`.
4. Merge commit (no squash), para conservar la historia de la versión.

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
# PR → main; luego etiqueta v1.0.1; luego, el mismo día:
git switch develop && git pull && git merge main && git push
```

## Cambiar una historia de usuario (SQAP, Sección 10.7)

1. Abrir un issue con el formulario **Solicitud de cambio de historia**.
2. El Líder evalúa el impacto en 1 día hábil (puntos, sprint, pruebas, RNF o umbrales).
3. Lo aprueba el Líder con el cliente; si cambia el alcance aprobado, también el docente.
4. En **un mismo commit**: `docs/backlog/backlog_v2_4sprints.xlsx`, `docs/historias/US-NN-*.md` (regenerar con
   `python3 docs/herramientas/gen_backlog_md.py`), las pruebas y, si cambia un umbral, el SQAP y `matrices-sqap.xlsx`.
5. Los identificadores no se reutilizan: una historia descartada queda como "Descartada"; una dividida genera IDs nuevos.

## Protección de ramas (configurar una vez en GitHub)

_Settings → Rules → Rulesets → New branch ruleset_:

**`main`**

- [x] Restrict deletions · [x] Block force pushes
- [x] Require a pull request before merging: 1 aprobación, descartar aprobaciones con commits nuevos
- [x] Require status checks to pass: `continuous-integration/jenkins/pr-merge`; requerir rama actualizada
- Bypass list: **vacía** (sin excepción para administradores)

**`develop`**

- [x] Restrict deletions · [x] Block force pushes
- Sin PR obligatorio ni check obligatorio (ADR-0008): la protección son los hooks de Husky, el build de Jenkins de cada
  push y la revisión de commits.
