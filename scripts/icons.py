# Draws the toolbar/store icons with no dependencies: the reskin's own layout
# (a sidebar beside content lines) in white on a dark tile. Matches brandGlyph() in src/shell.js.
# Usage: python3 scripts/icons.py  ->  icons/icon-{16,32,48,128}.png and icons/store-icon-128.png
import os, struct, zlib

TILE = (15, 23, 42)
WHITE = (255, 255, 255)
ACCENT = (125, 211, 252)

def rrect(x, y, x0, y0, x1, y1, r):
    """Inside a rounded rectangle (coordinates in 0..1)."""
    if not (x0 <= x <= x1 and y0 <= y <= y1): return False
    cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def capsule(x, y, x0, x1, cy, half):
    """A horizontal line with round caps."""
    cx = min(max(x, x0), x1)
    return (x - cx) ** 2 + (y - cy) ** 2 <= half * half

def glyph(x, y, small):
    """Colour at (x, y) inside the tile, or None for the tile itself."""
    # 64-unit grid: frame 8,11 48x42 r7; panel 17 wide; three content lines.
    u = 1 / 64
    sw = (8 if small else 4.5) * u
    x0, y0, x1, y1, r = 8 * u, 11 * u, 56 * u, 53 * u, 7 * u
    frame = rrect(x, y, x0 - sw / 2, y0 - sw / 2, x1 + sw / 2, y1 + sw / 2, r + sw / 2) and not rrect(x, y, x0 + sw / 2, y0 + sw / 2, x1 - sw / 2, y1 - sw / 2, max(r - sw / 2, 0))
    panel = rrect(x, y, x0 - sw / 2, y0 - sw / 2, (25 + (2 if small else 0)) * u, y1 + sw / 2, r + sw / 2)
    if frame or panel: return WHITE
    lines = ((33, 46, 24), (33, 42, 32), (33, 44, 40))
    if not small and any(capsule(x, y, a * u, b * u, c * u, 2.3 * u) for a, b, c in lines): return ACCENT
    return None

def pixel(size, px, py, ss=6, pad=0.0):
    small = size <= 16
    acc = [0, 0, 0]; cover = 0
    for i in range(ss):
        for j in range(ss):
            x = (px + (i + .5) / ss) / size; y = (py + (j + .5) / ss) / size
            x = (x - pad) / (1 - 2 * pad); y = (y - pad) / (1 - 2 * pad)
            if rrect(x, y, 0, 0, 1, 1, 0.22):
                c = glyph(x, y, small) or TILE
                cover += 1
                for k in range(3): acc[k] += c[k]
    if cover == 0: return (0, 0, 0, 0)
    return tuple(round(a / cover) for a in acc) + (round(cover / (ss * ss) * 255),)

def png(size, path, pad=0.0):
    rows = b''.join(b'\0' + b''.join(bytes(pixel(size, x, y, pad=pad)) for x in range(size)) for y in range(size))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(root, exist_ok=True)
for s in (16, 32, 48, 128):
    png(s, os.path.join(root, 'icon-%d.png' % s))
# Chrome Web Store listing icon: 96px of artwork inside 128px, per the store's guidelines.
png(128, os.path.join(root, 'store-icon-128.png'), pad=0.125)
