# Draws the toolbar/store icons (a white "B" on a navy rounded square) with no dependencies.
# Usage: python3 scripts/icons.py  ->  icons/icon-{16,32,48,128}.png
import os, struct, zlib

NAVY = (18, 58, 107)
WHITE = (255, 255, 255)

def rrect(x, y, x0, y0, x1, y1, r):
    """Inside a rounded rectangle (coordinates in 0..1)."""
    if not (x0 <= x <= x1 and y0 <= y <= y1): return False
    cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def bowl(x, y, x0, y0, x1, y1):
    """A 'D' shape: flat left edge, fully rounded right side."""
    r = (y1 - y0) / 2
    return rrect(x, y, x0 - r, y0, x1, y1, r) and x >= x0

def glyph(x, y):
    s = 0.105  # stroke
    L, T, B = 0.30, 0.22, 0.78
    mid = 0.485
    stem = L <= x <= L + s and T <= y <= B
    top = bowl(x, y, L, T, 0.63, mid + s / 2) and not bowl(x, y, L + s, T + s, 0.63 - s * 0.9, mid - s / 2)
    bot = bowl(x, y, L, mid - s / 2, 0.70, B) and not bowl(x, y, L + s, mid + s / 2, 0.70 - s * 0.9, B - s)
    return stem or top or bot

def pixel(size, px, py, ss=6, pad=0.0):
    bg = fg = 0
    for i in range(ss):
        for j in range(ss):
            x = (px + (i + .5) / ss) / size; y = (py + (j + .5) / ss) / size
            x = (x - pad) / (1 - 2 * pad); y = (y - pad) / (1 - 2 * pad)
            if rrect(x, y, 0, 0, 1, 1, 0.22):
                bg += 1
                if glyph(x, y): fg += 1
    n = ss * ss
    a = bg / n
    if bg == 0: return (0, 0, 0, 0)
    t = fg / bg
    c = tuple(round(NAVY[k] * (1 - t) + WHITE[k] * t) for k in range(3))
    return c + (round(a * 255),)

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
