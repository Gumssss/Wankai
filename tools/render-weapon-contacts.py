"""Draw collision diagrams from exported live WEAPONS data; no gameplay simulation.

Input: docs/previews/weapon-contacts-2026-11-11/collision-data.json.
Dimensions are exact capsule bounds. Filled silhouettes are orthographic unions
of capsule projections, not artwork or an approximation of the visible mesh.
"""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/previews/weapon-contacts-2026-11-11'
DATA = json.loads((OUT / 'collision-data.json').read_text())
WEAPONS = {w['id']: w for w in DATA['weapons']}
BG, INK, MUTED = '#f5f4ee', '#172e35', '#566b70'
GREEN, FILL, OLD = '#007c70', '#9dd8c3', '#cb6e24'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                     'text.color': INK, 'axes.labelcolor': MUTED,
                     'xtick.color': MUTED, 'ytick.color': MUTED})

def bounds(shapes):
    lo = np.min([np.minimum(s['a'], s['b']) - s['radius'] for s in shapes], axis=0)
    hi = np.max([np.maximum(s['a'], s['b']) + s['radius'] for s in shapes], axis=0)
    return lo, hi

def mapped(shapes, axes=(0, 1, 2), signs=(1, 1, 1)):
    return [dict(s, a=(np.array(s['a'])[list(axes)] * signs).tolist(),
                 b=(np.array(s['b'])[list(axes)] * signs).tolist()) for s in shapes]

def field(shapes, xx, yy, axes, shift):
    result = np.full(xx.shape, np.inf)
    for s in shapes:
        a = np.array(s['a'])[list(axes)] - shift
        b = np.array(s['b'])[list(axes)] - shift
        d = b - a
        u = np.clip(((xx-a[0])*d[0] + (yy-a[1])*d[1]) / max(d @ d, 1e-12), 0, 1)
        result = np.minimum(result, np.hypot(xx-a[0]-u*d[0], yy-a[1]-u*d[1]) - s['radius'])
    return result

def draw(ax, shapes, axes, ylim, halfwidth=.65, ghost=None, previous=None):
    lo, hi = bounds(shapes)
    shift = np.array([(lo[axes[0]] + hi[axes[0]]) / 2, 0])
    x = np.linspace(-halfwidth, halfwidth, 400)
    y = np.linspace(*ylim, 720)
    xx, yy = np.meshgrid(x, y)
    ax.set_facecolor('#fffef9')
    if ghost:
        mask = field(ghost, xx, yy, axes, shift)
        ax.contourf(xx, yy, mask, levels=[-100, 0], colors=['#e0e3df'], zorder=1)
        ax.contour(xx, yy, mask, levels=[0], colors=['#aab5b1'], linewidths=.7, zorder=2)
    mask = field(shapes, xx, yy, axes, shift)
    ax.contourf(xx, yy, mask, levels=[-100, 0], colors=[FILL], zorder=3)
    for s in shapes:
        ax.contour(xx, yy, field([s], xx, yy, axes, shift), levels=[0],
                   colors=[GREEN], linewidths=.45, alpha=.5, zorder=4)
    ax.contour(xx, yy, mask, levels=[0], colors=[GREEN], linewidths=1.3, zorder=5)
    if previous:
        ax.contour(xx, yy, field(previous, xx, yy, axes, shift), levels=[0],
                   colors=[OLD], linestyles='--', linewidths=1.2, zorder=6)
    ax.set(xlim=(-halfwidth, halfwidth), ylim=ylim, aspect='equal')
    ax.xaxis.set_major_locator(MultipleLocator(.5))
    ax.yaxis.set_major_locator(MultipleLocator(.5))
    ax.xaxis.set_minor_locator(MultipleLocator(.25))
    ax.yaxis.set_minor_locator(MultipleLocator(.25))
    ax.grid(which='major', color='#d8dfda', linewidth=.6)
    ax.grid(which='minor', color='#e7ebe5', linewidth=.4)
    ax.tick_params(labelsize=7, length=2, pad=2)
    for spine in ax.spines.values(): spine.set_visible(False)

def dims(shapes):
    lo, hi = bounds(shapes)
    return hi-lo

def fmt(values):
    return ' × '.join(f'{n:.2f}' for n in values)

def header(fig, title, subtitle):
    fig.text(.04, .962, title, fontsize=22, weight='bold')
    fig.text(.04, .925, subtitle, fontsize=10, color=MUTED)
    fig.text(.04, .028, 'Green = actual contact volume projected onto the view. Grid = 0.25 game units. No character offset or swing reach included.',
             fontsize=9, color=MUTED)

def old_blades(id, shapes):
    # Only the blade capsules changed in this update; keep prior edges for comparison.
    changed = {'sword': {1: .13}, 'polearm': {1: .16, 2: .11}, 'axe': {1: .15},
               'hammer': {1: .17}, 'mace': {1: .27}, 'yellow-staff': {0: .115}}
    return [dict(shapes[i], radius=r) for i, r in changed.get(id, {}).items()] or None

def standard_sheet(ids, title, filename):
    fig = plt.figure(figsize=(14, 11), facecolor=BG)
    header(fig, title, 'All drawings at 1×, at the same drawing scale. W × H × D below are collision bounds; 3× is reached at 60 seconds.')
    for i, id in enumerate(ids):
        row, col = divmod(i, 3)
        x, top = .045 + col*.322, .87 - row*.395
        w = WEAPONS[id]
        axes = (2, 1, 0) if id in ['pan', 'takeout-box', 'happy-paws', 'crowned-heart', 'maodie-paw'] else (0, 1, 2)
        shapes = mapped(w['colliders'], axes)
        old = old_blades(id, shapes)
        sizes = dims(shapes)
        fig.text(x, top, w['name'], fontsize=13, weight='bold')
        fig.text(x, top-.024, f'1×: {fmt(sizes)}    |    {len(shapes)} shapes', fontsize=9)
        fig.text(x, top-.046, f'3×: {fmt(sizes * DATA["maxScale"])}', fontsize=9, color=MUTED)
        for j, (projection, label) in enumerate([((0, 1), 'FACE'), ((2, 1), 'EDGE')]):
            ax = fig.add_axes([x + j*.143, top-.325, .132, .263])
            draw(ax, shapes, projection, (-.2, 2.4), previous=old)
            ax.set_xlabel(label, fontsize=8, labelpad=3)
        if old:
            fig.text(x, top-.366, 'Orange dashed: before this widening', fontsize=8, color=OLD)
    fig.savefig(OUT / filename, dpi=190, facecolor=BG)
    plt.close(fig)

standard_sheet(['sword', 'polearm', 'hammer', 'axe', 'mace', 'pan'],
               '01 / Shared weapons · current contact shapes', '01-common-weapons.png')
standard_sheet(['yellow-staff', 'takeout-box', 'happy-paws', 'soccer-ball', 'crowned-heart', 'maodie-paw'],
               '02 / Signature weapons · current contact shapes', '02-signature-weapons.png')

fig = plt.figure(figsize=(14, 11), facecolor=BG)
header(fig, '03 / Paired animal weapons · current contact shapes',
       'Left and right shown separately in a straightened local frame. Same scale within each row; W × H × D is per ear / paw.')
for row, id in enumerate(['long-ears', 'cat-paws']):
    top = .87 - row*.4
    fig.text(.045, top, WEAPONS[id]['name'], fontsize=14, weight='bold')
    note = 'Grey = visible inner ear with no weapon contact. Only the outer half (local length 1.8–3.6) is physical.' if row == 0 else 'Green = normal 1× paws. Orange dashed = F skill 1.3× (8 seconds / 30-second cooldown). Match growth multiplies both.'
    fig.text(.045, top-.026, note, fontsize=10, color=MUTED)
    for col, side in enumerate(['L', 'R']):
        key = 'ear' if row == 0 else 'side'
        shapes = [s for s in WEAPONS[id]['colliders'] if s[key] == side]
        ghost = [s for s in WEAPONS[id].get('visualColliders', []) if s[key] == side]
        if row == 1:
            shapes = mapped(shapes, (2, 0, 1), (1, -1, 1))
        boosted = mapped([s for s in WEAPONS[id].get('skillColliders', []) if s['side'] == side], (2, 0, 1), (1, -1, 1)) if row == 1 else None
        size = dims(shapes)
        x = .045 + col*.48
        label = f'{"LEFT" if side == "L" else "RIGHT"}  |  1×: {fmt(size)}  |  '
        label += f'Skill 1.3×: {fmt(dims(boosted))}' if boosted else f'3×: {fmt(size*DATA["maxScale"])}'
        fig.text(x, top-.052, label, fontsize=9)
        for j, (projection, label) in enumerate([((0, 1), 'FACE'), ((2, 1), 'EDGE')]):
            ax = fig.add_axes([x+j*.224, top-.342, .208, .27])
            draw(ax, shapes, projection, (-.25, 3.8) if row == 0 else (-.45, 2.35),
                 halfwidth=.8 if row == 0 else 1.5, ghost=ghost, previous=boosted)
            ax.set_xlabel(label, fontsize=8, labelpad=3)
fig.savefig(OUT / '03-animal-weapons.png', dpi=190, facecolor=BG)
plt.close(fig)
print('Wrote three collision sheets to', OUT)
