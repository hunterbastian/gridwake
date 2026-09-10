#!/usr/bin/env python3
"""Generate Gridwake PWA icons: cyan/amber glyph on black. Stdlib only."""

from __future__ import annotations

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public")

BLACK = (0, 0, 0, 255)
CYAN = (90, 200, 250, 255)
CYAN_DIM = (40, 110, 150, 255)
AMBER = (255, 159, 10, 255)


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c0, c1, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(lerp(c0[i], c1[i], t)) for i in range(4))


def write_png(path, w, h, pixels):
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    for y in range(h):
        raw.append(0)
        row = y * w * 4
        raw.extend(pixels[row : row + w * 4])
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(
        b"IDAT", zlib.compress(bytes(raw), 9)
    ) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def point_in_poly(x, y, poly):
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi
        ):
            inside = not inside
        j = i
    return inside


def dist_to_segment(px, py, ax, ay, bx, by):
    abx, aby = bx - ax, by - ay
    apx, apy = px - ax, py - ay
    ab2 = abx * abx + aby * aby
    t = 0.0 if ab2 == 0 else max(0.0, min(1.0, (apx * abx + apy * aby) / ab2))
    dx, dy = px - (ax + abx * t), py - (ay + aby * t)
    return math.hypot(dx, dy)


def stroke_poly(x, y, poly, width):
    n = len(poly)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i + 1) % n]
        if dist_to_segment(x, y, ax, ay, bx, by) <= width:
            return True
    return False


def render_master(size=512):
    pixels = bytearray(size * size * 4)
    cx = cy = size * 0.5
    scale = size / 512.0

    # Light-cycle chevron (top-down): outer hull, inner cut, wake rails
    outer = [
        (cx, cy - 168 * scale),
        (cx + 118 * scale, cy + 72 * scale),
        (cx + 52 * scale, cy + 72 * scale),
        (cx, cy - 18 * scale),
        (cx - 52 * scale, cy + 72 * scale),
        (cx - 118 * scale, cy + 72 * scale),
    ]
    inner = [
        (cx, cy - 108 * scale),
        (cx + 58 * scale, cy + 36 * scale),
        (cx + 22 * scale, cy + 36 * scale),
        (cx, cy - 8 * scale),
        (cx - 22 * scale, cy + 36 * scale),
        (cx - 58 * scale, cy + 36 * scale),
    ]
    diamond = [
        (cx, cy + 108 * scale - 22 * scale),
        (cx + 18 * scale, cy + 108 * scale),
        (cx, cy + 108 * scale + 22 * scale),
        (cx - 18 * scale, cy + 108 * scale),
    ]
    # Thin wake lines behind the hull
    rail_l = [
        (cx - 36 * scale, cy + 88 * scale),
        (cx - 28 * scale, cy + 88 * scale),
        (cx - 44 * scale, cy + 176 * scale),
        (cx - 52 * scale, cy + 176 * scale),
    ]
    rail_r = [
        (cx + 28 * scale, cy + 88 * scale),
        (cx + 36 * scale, cy + 88 * scale),
        (cx + 52 * scale, cy + 176 * scale),
        (cx + 44 * scale, cy + 176 * scale),
    ]
    ring_r = 214 * scale
    ring_w = 3.2 * scale

    for y in range(size):
        for x in range(size):
            i = (y * size + x) * 4
            px, py = x + 0.5, y + 0.5
            dx, dy = px - cx, py - cy
            r = math.hypot(dx, dy)

            color = BLACK
            # Soft HUD ring
            if abs(r - ring_r) < ring_w:
                t = 1.0 - abs(r - ring_r) / ring_w
                color = mix(BLACK, CYAN_DIM, 0.35 + 0.65 * t)

            if point_in_poly(px, py, rail_l) or point_in_poly(px, py, rail_r):
                color = CYAN_DIM
            if point_in_poly(px, py, outer) and not point_in_poly(px, py, inner):
                color = CYAN
            elif stroke_poly(px, py, inner, 2.2 * scale) and point_in_poly(px, py, outer):
                color = CYAN
            if point_in_poly(px, py, diamond):
                color = AMBER

            pixels[i : i + 4] = bytes(color)
    return size, size, pixels


def downscale(src_w, src_h, src, dst_size):
    out = bytearray(dst_size * dst_size * 4)
    scale = src_w / dst_size
    for y in range(dst_size):
        y0 = int(y * scale)
        y1 = int((y + 1) * scale)
        y1 = min(src_h, max(y0 + 1, y1))
        for x in range(dst_size):
            x0 = int(x * scale)
            x1 = int((x + 1) * scale)
            x1 = min(src_w, max(x0 + 1, x1))
            acc = [0, 0, 0, 0]
            n = 0
            for sy in range(y0, y1):
                row = sy * src_w * 4
                for sx in range(x0, x1):
                    i = row + sx * 4
                    acc[0] += src[i]
                    acc[1] += src[i + 1]
                    acc[2] += src[i + 2]
                    acc[3] += src[i + 3]
                    n += 1
            o = (y * dst_size + x) * 4
            out[o] = acc[0] // n
            out[o + 1] = acc[1] // n
            out[o + 2] = acc[2] // n
            out[o + 3] = acc[3] // n
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    w, h, master = render_master(512)
    write_png(os.path.join(OUT, "icon-512.png"), w, h, master)
    write_png(os.path.join(OUT, "icon-192.png"), 192, 192, downscale(w, h, master, 192))
    write_png(
        os.path.join(OUT, "apple-touch-icon.png"),
        180,
        180,
        downscale(w, h, master, 180),
    )
    print("wrote icon-512.png, icon-192.png, apple-touch-icon.png")


if __name__ == "__main__":
    main()
