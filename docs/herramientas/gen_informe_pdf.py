#!/usr/bin/env python3
"""Genera el HTML del informe (mistune) para pasarlo a PDF con ~/practica10/herramientas/pdf.mjs."""
import pathlib, re, sys
import mistune
md_path = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
md = md_path.read_text()
html = mistune.create_markdown(escape=False, plugins=['table', 'strikethrough'])(md)
# Las rutas de las imágenes son relativas al .md
base = md_path.parent.resolve()
html = re.sub(r'src="(capturas/[^"]+)"', lambda m: f'src="file://{base}/{m.group(1)}"', html)
CSS = pathlib.Path('/home/lujan/practica10/herramientas/informe.py').read_text().split('CSS = """')[1].split('"""')[0]
CSS += "\nimg { max-height: 175mm; }\n"
out.write_text(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>CalisFacu — Informe de avance Sprint 4</title><style>{CSS}</style></head><body>{html}</body></html>')
print(out, len(html))
