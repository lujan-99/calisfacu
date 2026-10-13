"""Dibuja la Figura 4 del SQAP (recorrido de un cambio en develop, ADR-0008). Uso: fig_flujo_develop.py salida.png"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

AZUL, BORDE, GRIS, VERDE, NARANJA = "#deebf7", "#1f4e79", "#f2f2f2", "#c6e0b4", "#f8cbad"
fig, ax = plt.subplots(figsize=(20, 3.9), dpi=144)
ax.set_xlim(0, 20); ax.set_ylim(0, 3.9); ax.axis("off")

def caja(x, y, w, h, texto, color):
    ax.add_patch(FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0,rounding_size=0.18",
                                fc=color, ec=BORDE, lw=2))
    ax.text(x, y, texto, ha="center", va="center", fontsize=15, family="DejaVu Sans", color="#1a1a1a")
    return (x, y, w, h)

def flecha(a, b, lado_a, lado_b, **kw):
    def punto(c, lado):
        x, y, w, h = c
        return {"r": (x + w/2, y), "l": (x - w/2, y), "b": (x, y - h/2), "t": (x, y + h/2)}[lado]
    estilo = dict(arrowstyle="-|>", mutation_scale=22, color=BORDE, lw=2)
    estilo.update(kw)
    ax.add_patch(FancyArrowPatch(punto(a, lado_a), punto(b, lado_b), **estilo))

arriba, abajo = 2.95, 0.95
c1 = caja(2.3, arriba, 3.3, 0.8, "1. Issue / tarea\nUS-01 · T-018", GRIS)
c2 = caja(6.9, arriba, 3.9, 1.1, "2. Commit en develop\nfeat(notas): …\nRefs: US-01", AZUL)
c3 = caja(11.7, arriba, 3.9, 0.8, "3. Hooks de Husky\nlint, formato y unitarias", AZUL)
c4 = caja(16.9, arriba, 4.3, 0.8, "4. Push a develop → Jenkins\nlint, pruebas, build", AZUL)
c5 = caja(16.9, abajo, 4.3, 0.8, "5. Despliegue a staging\nsmoke test + E2E", VERDE)
c6 = caja(11.7, abajo, 3.9, 0.8, "6. Revisión del commit\npor el otro integrante", NARANJA)
c7 = caja(5.0, abajo, 6.0, 0.8, "7. RC en develop; PR develop → main\netiqueta v1.0.0 = producción", VERDE)

flecha(c1, c2, "r", "l"); flecha(c2, c3, "r", "l"); flecha(c3, c4, "r", "l")
flecha(c4, c5, "b", "t"); flecha(c5, c6, "l", "r"); flecha(c6, c7, "l", "r")
ax.add_patch(FancyArrowPatch((c6[0] - 0.9, abajo + 0.4), (c2[0] + 1.2, arriba - 0.56),
             arrowstyle="-|>", mutation_scale=18, color="#c55a11", lw=2, linestyle=(0, (5, 4))))
ax.text(11.3, 1.95, "cambios solicitados:\nnuevo commit", ha="left", va="center", fontsize=13, color="#1a1a1a")
fig.savefig(sys.argv[1], bbox_inches="tight", pad_inches=0.15, facecolor="white")
