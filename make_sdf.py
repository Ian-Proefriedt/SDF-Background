# ╔══════ CONFIG – tweak here only ═════╗
RES            = 1024          # texture resolution

CENTER_HALF    = 0.24          # half-width of centre square
CORNER_HALF    = CENTER_HALF   # full square on the corner gives ¼-area

CENTER_RADIUS  = 0.03          # outer rounding
INNER_RADIUS   = 0.03          # inner rounding
SMOOTH_K       = 0.20          # bridge thickness

EDGE_T         = 0.25          # threshold where squares sit flush
TARGET_DARKEST = 0.30
ENCODE_SCALE   = (0.5 - TARGET_DARKEST) / (CORNER_HALF * 0.5)



SAVE_FILES     = False
# ╚══════════════════════════════════════╝


# — helpers ------------------------------------------------------------
import numpy as np, matplotlib.pyplot as plt
from PIL import Image

def sd_round(px, py, hx, hy, r):
    qx = np.abs(px) - hx + r
    qy = np.abs(py) - hy + r
    return np.hypot(np.maximum(qx,0), np.maximum(qy,0)) + np.minimum(np.maximum(qx,qy),0) - r

def smin(a, b, k):
    h = np.clip(0.5 + 0.5*(b - a)/k, 0, 1)
    return (1-h)*b + h*a - k*h*(1-h)


# — 1. analytic SDF ----------------------------------------------------
u = np.linspace(-0.5, 0.5, RES, endpoint=False)
x, y = np.meshgrid(u, u)

# centre
d = sd_round(x, y, CENTER_HALF, CENTER_HALF, CENTER_RADIUS)

# corner-centred squares – flip axes so (+,+) is always the inner corner
corners = [(-0.5,-0.5, 1, 1), (0.5,-0.5,-1, 1),
           (-0.5, 0.5, 1,-1), (0.5, 0.5,-1,-1)]

for cx, cy, sx, sy in corners:
    lx, ly = (x - cx)*sx, (y - cy)*sy
    r = INNER_RADIUS * ((lx > 0) & (ly > 0))
    dc = sd_round(lx, ly, CORNER_HALF, CORNER_HALF, r)
    d  = smin(d, dc, SMOOTH_K)

# equal depth: darkest visible pixel is at (CORNER_HALF/2, CORNER_HALF/2)
d = np.maximum(d, -CORNER_HALF/2)

# encode 0‥1  (surface = 0.5)
sdf  = np.clip(d * ENCODE_SCALE + 0.5, 0, 1)
mask = (d <= 0).astype(float)

# — 2. inline display --------------------------------------------------
fig = plt.figure(figsize=(10,3), dpi=150)
gs  = fig.add_gridspec(1,3,width_ratios=[1,1,2])

ax = fig.add_subplot(gs[0]); ax.imshow(mask,cmap='gray',origin='lower')
ax.set_title("Binary mask"); ax.axis('off')

ax = fig.add_subplot(gs[1]); ax.imshow(sdf,cmap='gray',origin='lower')
ax.set_title("Encoded SDF"); ax.axis('off')

Ts = (0,0.25,0.5,0.75,1)
strip = np.concatenate([((sdf>=T-0.02)&(sdf<=T+0.02)).astype(float)
                        for T in Ts], axis=1)
ax = fig.add_subplot(gs[2]); ax.imshow(strip,cmap='gray',origin='lower')
ax.set_xticks([(i+0.5)*RES for i in range(len(Ts))])
ax.set_xticklabels([f"T={t}" for t in Ts]); ax.set_yticks([])
ax.set_title("Threshold band preview")
plt.tight_layout(); plt.show()

# — 3. optional PNGs ---------------------------------------------------
if SAVE_FILES:
    Image.fromarray((mask*255).astype(np.uint8)    ).save("tile_mask.png")
    Image.fromarray((sdf*255 ).astype(np.uint8)    ).save("tile_sdf.png")
    Image.fromarray((strip*255).astype(np.uint8)   ).save("tile_thresholds.png")
    print("Saved tile_mask.png  tile_sdf.png  tile_thresholds.png")

