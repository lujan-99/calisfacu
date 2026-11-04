#!/usr/bin/env bash
# Completa la RC3 cuando termine su build en Jenkins: baja las estadísticas de JMeter, escribe el README de
# docs/evidencias/v1.0.0-rc.3/, llena la tabla de la sección 12 del informe del Sprint 4 y regenera el PDF.
# Uso: scripts/completar-rc3.sh   (desde la raíz del repositorio, con Jenkins en localhost:8080)
set -euo pipefail
P=$(tr -d '\n' < jenkins/secretos/clave-lujan)
B=http://localhost:8080/job/calisfacu/job/v1.0.0-rc.3/1
estado=$(curl -sf -u "lujan:$P" "$B/api/json?tree=result,building")
echo "$estado" | grep -q '"building":false' || { echo "La RC3 todavía corre; espere."; exit 1; }
D=docs/evidencias/v1.0.0-rc.3; mkdir -p "$D"
for x in boletin planilla; do curl -sf -u "lujan:$P" "$B/artifact/perf/$x/statistics.json" -o "$D/jmeter-$x-statistics.json"; done
python3 - "$D" "$(echo "$estado" | python3 -c 'import json,sys;print(json.load(sys.stdin)["result"])')" <<'PY'
import json, sys, pathlib
d, resultado = pathlib.Path(sys.argv[1]), sys.argv[2]
t = {x: json.load(open(d / f'jmeter-{x}-statistics.json'))['Total'] for x in ('boletin', 'planilla')}
ms = lambda v: f"{round(v):,} ms".replace(',', ' ')
(d / 'README.md').write_text(f"""# RC3 · v1.0.0-rc.3 (T-063)

- **Commit:** `86b4f59` · **Jenkins:** `calisfacu » v1.0.0-rc.3` #1, {resultado}
- Corrige la regresión de la planilla de la RC2 (ver `../v1.0.0-rc.2/README.md`).

| Plan     | Muestras | Errores (M04) | p95 | Media | Peticiones/s |
| -------- | -------- | ------------- | --- | ----- | ------------ |
""" + ''.join(f"| {n} | {t[x]['sampleCount']} | {t[x]['errorPct']} % | {ms(t[x]['pct2ResTime'])} | {ms(t[x]['meanResTime'])} | {round(t[x]['throughput'],1)} |\n"
              for x, n in (('boletin', 'Boletín'), ('planilla', 'Planilla'))))
inf = pathlib.Path('docs/evidencias/sprint4/backend/informe-backend-sprint4.md')
s = inf.read_text()
# La tabla tiene dos «en curso»: el primero es el boletín y el segundo la planilla.
s = s.replace('| en curso', f"| {ms(t['boletin']['pct2ResTime'])}", 1)
s = s.replace('| en curso', f"| {ms(t['planilla']['pct2ResTime'])}", 1)
s = s.replace('lo mide con la carga completa: al terminar, sus resultados quedan en los artefactos de ese build.',
              f"lo midió con la carga completa ({resultado}): planilla p95 {ms(t['planilla']['pct2ResTime'])}, "
              f"{round(t['planilla']['throughput'],1)} peticiones/s y {t['planilla']['errorPct']} % de errores.")
inf.write_text(s)
print('RC3:', resultado, {x: ms(t[x]['pct2ResTime']) for x in t})
PY
npx prettier --write docs/evidencias/v1.0.0-rc.3 docs/evidencias/sprint4/backend/informe-backend-sprint4.md >/dev/null
python3 docs/herramientas/gen_informe_pdf.py docs/evidencias/sprint4/backend/informe-backend-sprint4.md /tmp/informe-sprint4.html
node ~/practica10/herramientas/pdf.mjs /tmp/informe-sprint4.html "$PWD/docs/evidencias/sprint4/backend/informe-backend-sprint4.pdf"
cp docs/evidencias/sprint4/backend/informe-backend-sprint4.pdf ~/Downloads/Informe_Avance_Sprint4_Backend_CalisFacu.pdf
echo "Listo. Revise y haga commit: git add docs/evidencias && git commit -m 'test(perf): evidencias de la RC3' -m 'Refs: T-063'"
