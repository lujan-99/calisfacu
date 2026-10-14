"""Sube las tareas del backlog (backlog_v2_4sprints.xlsx) como issues de GitHub y genera docs/backlog/issues-github.md.

Se puede volver a ejecutar: una tarea que ya tiene issue (título "T-NNN: …") no se duplica; solo se actualizan sus
etiquetas de estado, su responsable y su milestone. Una tarea en estado "Hecho" cierra su issue.
Requiere `gh` con sesión iniciada y permiso de escritura en el repositorio.

  python3 docs/herramientas/subir_issues.py            # crea o actualiza
  python3 docs/herramientas/subir_issues.py --simular  # muestra lo que haría, sin tocar GitHub
"""
import json
import pathlib
import subprocess
import sys
import time

import openpyxl

RAIZ = pathlib.Path(__file__).resolve().parents[2]
XLSX = RAIZ / 'docs/backlog/backlog_v2_4sprints.xlsx'
SALIDA = RAIZ / 'docs/backlog/issues-github.md'
REPO = 'lujan-99/calisfacu'
SIMULAR = '--simular' in sys.argv

# Cuentas de GitHub de cada integrante (confirmado por Lujan el 13/10/2026).
CUENTAS = {'Lujan': 'lujan-99', 'Galvan': 'JoelPorcel'}

AREAS = {
    'Backend': 'area:backend',
    'Backend (crítico)': 'area:backend',
    'Frontend': 'area:frontend',
    'Full stack': 'area:full-stack',
    'Prueba': 'area:pruebas',
    'Infra': 'area:infra',
    'Auditoría': 'area:calidad',
    'Revisión': 'area:calidad',
    'Calidad': 'area:calidad',
    'Aceptación': 'area:calidad',
    'Documentación': 'area:documentacion',
    'Diseño': 'area:documentacion',
    'Requerimientos': 'area:documentacion',
}
ESTADOS = {'Por hacer': None, 'En proceso': 'estado:en-proceso', 'En revisión': 'estado:en-revision', 'Hecho': None}
ETIQUETAS = {
    'tipo:tarea': ('1D4E89', 'Tarea de la pila del sprint'),
    'critico': ('B60205', 'Módulo crítico del SQAP: TDD y cobertura ≥ 90 %'),
    'area:backend': ('0E8A16', 'API NestJS'),
    'area:frontend': ('5319E7', 'Web React'),
    'area:full-stack': ('6F42C1', 'API y web'),
    'area:pruebas': ('FBCA04', 'E2E, carga y otras pruebas'),
    'area:infra': ('C5DEF5', 'Jenkins, Render, repositorio'),
    'area:calidad': ('F2B33D', 'Revisiones, inspecciones y auditorías del SQAP'),
    'area:documentacion': ('0075CA', 'SRS, SAD, actas y documentos'),
    'estado:en-proceso': ('D4C5F9', 'Alguien trabaja en la tarea'),
    'estado:en-revision': ('BFDADC', 'Terminada: espera la revisión del otro integrante y la demo (DoD)'),
}


def gh(*args, entrada=None):
    for intento in range(3):  # GitHub a veces corta una respuesta: se reintenta antes de rendirse
        r = subprocess.run(['gh', *args], input=entrada, capture_output=True, text=True)
        if r.returncode == 0:
            return r.stdout
        time.sleep(2 * (intento + 1))
    raise SystemExit(f"gh {' '.join(args[:3])} falló: {r.stderr.strip()}")


def api(ruta, metodo='GET', **campos):
    if SIMULAR and metodo != 'GET':
        print(f'[simulado] {metodo} {ruta}', campos.get('title', ''), campos.get('labels', ''), campos.get('assignees', ''))
        return {}
    if metodo != 'GET':
        time.sleep(1)  # límite secundario de GitHub para crear contenido
    args = ['api', f'repos/{REPO}/{ruta}', '-X', metodo] if metodo != 'GET' else ['api', '--paginate', f'repos/{REPO}/{ruta}']
    entrada = json.dumps(campos) if campos else None
    if entrada:
        args += ['--input', '-']
    salida = gh(*args, entrada=entrada)
    if metodo == 'GET':
        # --paginate concatena las páginas JSON una tras otra
        return json.loads(salida.replace('][', ',')) if salida.strip() else []
    return json.loads(salida or '{}')


def leer_backlog():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    historias = {
        r[0]: r[2]
        for r in wb['Historias de Usuario'].iter_rows(min_row=5, max_row=24, min_col=2, max_col=4, values_only=True)
        if r[0]
    }
    tareas = []
    for r in wb['Tareas (Sprint Backlog)'].iter_rows(min_row=5, values_only=True):
        if r[0]:
            tareas.append(dict(id=r[0], sprint=r[1], historia=r[2], tarea=r[3], tipo=r[4], resp=r[5], rev=r[6],
                               horas=r[7], estado=r[8], cubre=r[9] or ''))
    return historias, tareas


def cuerpo(t, historias):
    historia = f"{t['historia']} · {historias[t['historia']]}" if t['historia'] in historias else t['historia']
    enlace = (f"[docs/historias](../tree/develop/docs/historias) (`{t['historia']}-*.md`)"
              if t['historia'].startswith('US-') else '[tareas transversales](../tree/develop/docs/backlog/tareas-transversales.md)')
    return '\n'.join([
        f"**{t['tarea']}**", '',
        '| Campo | Valor |', '| --- | --- |',
        f"| Historia | {historia} |",
        f"| Sprint | {t['sprint']} |",
        f"| Tipo | {t['tipo']} |",
        f"| Responsable | {t['resp']} ({CUENTAS[t['resp']]}) |",
        f"| Revisor | {t['rev']} ({CUENTAS[t['rev']]}) |",
        f"| Horas estimadas | {t['horas']} |",
        f"| Cubre | {t['cubre'] or '—'} |", '',
        f"Criterios de aceptación y detalle: {enlace}.", '',
        '**Definición de hecho (DoD):** el revisor la revisa (regla de independencia del SQAP), queda en `develop` con el '
        'build verde y se muestra en la demo del sprint. Los commits la citan en el pie: '
        f"`Refs: {t['historia']}, {t['id']}`.", '',
        '_Issue generado desde `docs/backlog/backlog_v2_4sprints.xlsx` con `docs/herramientas/subir_issues.py`; '
        'el Excel es la fuente: los cambios de estado se hacen ahí y se vuelve a ejecutar el script._',
    ])


def etiquetas_de(t):
    lista = ['tipo:tarea', AREAS.get(t['tipo'], 'area:calidad')]
    if 'crítico' in (t['tipo'] or ''):
        lista.append('critico')
    if ESTADOS.get(t['estado']):
        lista.append(ESTADOS[t['estado']])
    return lista


def main():
    historias, tareas = leer_backlog()

    existentes = {e['name'] for e in api('labels?per_page=100')}
    for nombre, (color, descripcion) in ETIQUETAS.items():
        if nombre not in existentes:
            api('labels', 'POST', name=nombre, color=color, description=descripcion)

    milestones = {m['title']: m['number'] for m in api('milestones?state=all&per_page=100')}
    for n in range(1, 5):
        titulo = f'Sprint {n}'
        if titulo not in milestones:
            m = api('milestones', 'POST', title=titulo, description=f'Semana {n} de construcción (docs/backlog/backlog.md)')
            milestones[titulo] = m.get('number', 0)

    issues = {}
    for i in api('issues?state=all&per_page=100'):
        if 'pull_request' not in i and i['title'][:6].startswith('T-') and i['title'][5] == ':':
            issues[i['title'][:5]] = i

    filas = []
    for t in tareas:
        datos = dict(
            title=f"{t['id']}: {t['tarea']}",
            body=cuerpo(t, historias),
            labels=etiquetas_de(t),
            assignees=[CUENTAS[t['resp']]],
            milestone=milestones[t['sprint']],
        )
        if t['id'] in issues:
            numero = issues[t['id']]['number']
            api(f'issues/{numero}', 'PATCH', **datos, state='closed' if t['estado'] == 'Hecho' else 'open')
        else:
            numero = api('issues', 'POST', **datos).get('number', 0)
            if t['estado'] == 'Hecho':
                api(f'issues/{numero}', 'PATCH', state='closed')
        filas.append(f"| {t['id']} | [#{numero}](https://github.com/{REPO}/issues/{numero}) | {t['sprint']} | "
                     f"{t['historia']} | {t['resp']} | {t['rev']} | {t['estado']} |")
        print(t['id'], '→', numero)

    SALIDA.write_text('\n'.join([
        '# Issues de GitHub de cada tarea', '',
        '> Generado con `python3 docs/herramientas/subir_issues.py` desde `backlog_v2_4sprints.xlsx`. El Excel es la',
        '> fuente: cambie el estado ahí, regenere el Markdown del backlog y vuelva a ejecutar el script.', '',
        '| Tarea | Issue | Sprint | Historia | Responsable | Revisor | Estado |',
        '| --- | --- | --- | --- | --- | --- | --- |',
        *filas,
    ]) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
