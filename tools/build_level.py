"""Level builder: build level data + graph-paper art from a hitbox PNG.
usage: python3 tools/build_level.py [hitbox.png [level_js [art_png]]]
defaults build the rough draft map."""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src = sys.argv[1] if len(sys.argv) > 1 else 'public/Assets/Images/Levels/Hitboxes/RoughDraft.png'
lvl_js = sys.argv[2] if len(sys.argv) > 2 else 'public/js/levels/level_rough_draft.js'
art_png = sys.argv[3] if len(sys.argv) > 3 else 'public/Assets/Images/Levels/RoughDraft.png'
lvl_name = 'LEVEL_' + os.path.splitext(os.path.basename(lvl_js))[0].replace('level_', '').upper()

img_arr = np.array(Image.open(src))
# Alpha marks solid
m = img_arr[:, :, 3] > 128
art_mask = m.copy()
# Red pixels mark semisolids
semi = (img_arr[:, :, 0] == 255) & (img_arr[:, :, 1] == 0) & (img_arr[:, :, 2] == 0) & (img_arr[:, :, 3] == 255)
# Green Hill uses semisolids
is_greenhill = 'greenhill' in src.lower() or 'greenhill' in lvl_js.lower()
if is_greenhill:
    above = np.zeros_like(m)
    above[1:] = m[:-1]
    semi = m & ~above
    left_open = np.ones_like(m)
    right_open = np.ones_like(m)
    left_open[:, 1:] = ~m[:, :-1]
    right_open[:, :-1] = ~m[:, 1:]
    left_edges = m & left_open
    right_edges = m & right_open
    walls = np.zeros_like(m)
    for x in range(m.shape[1]):
        for edge in (left_edges[:, x], right_edges[:, x]):
            changes = np.diff(np.concatenate([[0], edge.astype(np.int8), [0]]))
            starts = np.where(changes == 1)[0]
            ends = np.where(changes == -1)[0]
            for start, end in zip(starts, ends):
                if end - start >= 8:
                    walls[start:end, x] = True
    m = walls
H, W = m.shape

def extract_rects(mask):
    rects = []; prev = {}
    for y in range(H):
        d = np.diff(np.concatenate([[0], mask[y].astype(np.int8), [0]]))
        s = np.where(d == 1)[0]; e = np.where(d == -1)[0]
        cur = {}
        for a, b in zip(s, e):
            k = (int(a), int(b))
            cur[k] = prev.pop(k) if k in prev else y
        for k, y0 in prev.items(): rects.append([k[0], y0, k[1] - k[0], y - y0])
        prev = cur
    for k, y0 in prev.items(): rects.append([k[0], y0, k[1] - k[0], H - y0])
    return rects

# Collision rectangles
rects = extract_rects(m)
# Semisolid rectangles
semi_rects = extract_rects(semi)

open(lvl_js, 'w').write(
    '// generated level data\n'
    f'const {lvl_name} = {{ w: {W}, h: {H}, rects: {json.dumps(rects, separators=(",", ":"))}, semi: {json.dumps(semi_rects, separators=(",", ":"))} }};\n')

# Graph paper art
BLUE = np.array([0x96, 0xAD, 0xE9], float)
SP, LW, OUT = 28, 1.2, 4.0          # grid and outline sizes
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def band(v):
    mm = np.mod(v, SP); return np.minimum(mm, SP - mm) / np.sqrt(2)
d = np.minimum(band(xx + yy), band(xx - yy))
grid = np.clip(LW + 0.5 - d, 0, 1) * 0.55           # soft diagonal lines

pad = np.pad(art_mask, 1, constant_values=False)
inside = ndi.distance_transform_edt(pad)[1:-1, 1:-1]  # distance to nearest empty pixel
outline = np.clip(OUT + 0.5 - inside, 0, 1)
cover = np.clip(inside, 0, 1)                          # shape coverage (0 outside)

paper = np.array([0xF4, 0xF8, 0xFF], float)
a_line = np.maximum(grid, outline)
rgb = paper[None, None, :] * (1 - a_line[..., None]) + BLUE[None, None, :] * a_line[..., None]
img = np.dstack([rgb, cover * 255]).astype(np.uint8)
Image.fromarray(img, 'RGBA').save(art_png)
print(W, H, len(rects), 'rects,', len(semi_rects), 'semi')
