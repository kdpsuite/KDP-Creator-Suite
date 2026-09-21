#!/usr/bin/env python3
"""Generate license-clean conversion QA fixtures (images + PDFs).

Writes to repo tests/fixtures/conversion/ plus manifest.json.
No third-party images — Pillow + ReportLab only.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas as pdf_canvas

REPO_ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = REPO_ROOT / "tests" / "fixtures" / "conversion"


def _save(img: Image.Image, name: str) -> Path:
    path = OUT_DIR / name
    img.save(path)
    return path


def lineart_black_on_white() -> None:
    img = Image.new("RGB", (900, 1200), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((150, 200, 750, 800), outline=(0, 0, 0), width=4)
    d.ellipse((300, 350, 420, 470), outline=(0, 0, 0), width=3)
    d.ellipse((480, 350, 600, 470), outline=(0, 0, 0), width=3)
    d.arc((320, 520, 580, 700), 20, 160, fill=(0, 0, 0), width=3)
    d.polygon([(450, 100), (500, 180), (400, 180)], outline=(0, 0, 0))
    d.rectangle((100, 950, 800, 1100), outline=(0, 0, 0), width=3)
    d.line([(100, 950), (800, 1100)], fill=(0, 0, 0), width=2)
    d.line([(800, 950), (100, 1100)], fill=(0, 0, 0), width=2)
    _save(img, "lineart_black_on_white.png")


def lineart_thin_hairlines() -> None:
    img = Image.new("RGB", (800, 1000), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for i in range(20):
        y = 50 + i * 45
        d.line([(40, y), (760, y)], fill=(0, 0, 0), width=1)
    for i in range(15):
        x = 50 + i * 50
        d.line([(x, 40), (x, 960)], fill=(0, 0, 0), width=1)
    d.ellipse((200, 250, 600, 650), outline=(0, 0, 0), width=1)
    _save(img, "lineart_thin_hairlines.png")


def lineart_white_on_black() -> None:
    img = Image.new("RGB", (900, 1200), (0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((150, 200, 750, 800), outline=(255, 255, 255), width=4)
    d.ellipse((300, 350, 420, 470), outline=(255, 255, 255), width=3)
    d.ellipse((480, 350, 600, 470), outline=(255, 255, 255), width=3)
    d.arc((320, 520, 580, 700), 20, 160, fill=(255, 255, 255), width=3)
    _save(img, "lineart_white_on_black.png")


def filled_cartoon() -> None:
    img = Image.new("RGB", (900, 1100), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((200, 150, 700, 650), fill=(180, 140, 100), outline=(0, 0, 0), width=4)
    d.ellipse((320, 300, 400, 380), fill=(80, 80, 80), outline=(0, 0, 0), width=2)
    d.ellipse((500, 300, 580, 380), fill=(80, 80, 80), outline=(0, 0, 0), width=2)
    d.polygon([(450, 400), (480, 480), (420, 480)], fill=(200, 100, 80), outline=(0, 0, 0))
    d.rectangle((280, 700, 620, 950), fill=(60, 100, 180), outline=(0, 0, 0), width=4)
    d.rectangle((350, 780, 550, 950), fill=(140, 90, 40), outline=(0, 0, 0), width=3)
    _save(img, "filled_cartoon.png")


def photo_gradient() -> None:
    img = Image.new("RGB", (1000, 750), (0, 0, 0))
    pixels = img.load()
    for y in range(750):
        for x in range(1000):
            r = int(40 + 180 * (x / 999) + 20 * math.sin(y / 40))
            g = int(60 + 120 * (y / 749) + 30 * math.cos(x / 50))
            b = int(80 + 100 * ((x + y) / 1749))
            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
    # Soft "subject" blob
    d = ImageDraw.Draw(img)
    d.ellipse((300, 200, 700, 550), fill=(90, 110, 140))
    d.ellipse((380, 280, 480, 380), fill=(50, 60, 80))
    d.ellipse((520, 280, 620, 380), fill=(50, 60, 80))
    img = img.filter(ImageFilter.GaussianBlur(radius=3))
    _save(img, "photo_gradient.png")


def low_contrast_gray() -> None:
    img = Image.new("L", (800, 1000), 140)
    d = ImageDraw.Draw(img)
    d.ellipse((150, 200, 650, 700), outline=110, width=8)
    d.rectangle((200, 800, 600, 920), outline=155, width=6)
    d.line([(100, 100), (700, 900)], fill=120, width=4)
    _save(img.convert("RGB"), "low_contrast_gray.png")


def high_contrast_hard() -> None:
    img = Image.new("RGB", (800, 1000), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((80, 80, 720, 920), outline=(0, 0, 0), width=6)
    d.ellipse((200, 250, 600, 650), outline=(0, 0, 0), width=5)
    d.polygon([(400, 120), (500, 220), (300, 220)], fill=(0, 0, 0))
    d.line([(100, 800), (700, 800)], fill=(0, 0, 0), width=4)
    _save(img, "high_contrast_hard.png")


def rgba_on_transparent() -> None:
    img = Image.new("RGBA", (800, 1000), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((150, 200, 650, 700), outline=(0, 0, 0, 255), width=5)
    d.ellipse((280, 350, 380, 450), outline=(0, 0, 0, 255), width=3)
    d.ellipse((420, 350, 520, 450), outline=(0, 0, 0, 255), width=3)
    d.arc((300, 500, 500, 620), 10, 170, fill=(0, 0, 0, 255), width=3)
    d.rectangle((250, 780, 550, 900), outline=(20, 20, 180, 255), width=4)
    _save(img, "rgba_on_transparent.png")


def palette_p_mode() -> None:
    img = Image.new("RGB", (600, 800), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((100, 150, 500, 550), outline=(0, 0, 0), width=4)
    d.rectangle((150, 600, 450, 720), fill=(200, 50, 50), outline=(0, 0, 0), width=3)
    pal = img.convert("P", palette=Image.Palette.ADAPTIVE, colors=16)
    _save(pal, "palette_p_mode.png")


def grayscale_L() -> None:
    img = Image.new("L", (700, 900), 255)
    d = ImageDraw.Draw(img)
    d.ellipse((100, 150, 600, 650), outline=0, width=4)
    d.rectangle((200, 700, 500, 820), outline=40, width=3)
    img.save(OUT_DIR / "grayscale_L.png")


def jpeg_artifacts() -> None:
    img = Image.new("RGB", (900, 700), (240, 240, 245))
    d = ImageDraw.Draw(img)
    for i in range(12):
        d.ellipse((50 + i * 60, 80, 200 + i * 60, 400), outline=(30, 30, 30), width=2)
    d.text((50, 500), "JPEG ARTIFACT TEST", fill=(20, 20, 20))
    # Heavy compression to introduce blocking/noise
    img.save(OUT_DIR / "jpeg_artifacts.jpg", quality=8, optimize=True)


def saturated_primaries() -> None:
    img = Image.new("RGB", (900, 600), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((50, 50, 280, 280), fill=(255, 0, 0), outline=(0, 0, 0), width=3)
    d.rectangle((310, 50, 540, 280), fill=(0, 255, 0), outline=(0, 0, 0), width=3)
    d.rectangle((570, 50, 800, 280), fill=(0, 0, 255), outline=(0, 0, 0), width=3)
    d.ellipse((150, 320, 450, 550), fill=(255, 255, 0), outline=(0, 0, 0), width=3)
    d.ellipse((450, 320, 750, 550), fill=(255, 0, 255), outline=(0, 0, 0), width=3)
    img.save(OUT_DIR / "saturated_primaries.jpg", quality=90)


def aspect_landscape() -> None:
    img = Image.new("RGB", (1280, 720), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((40, 40, 1240, 680), outline=(0, 0, 0), width=4)
    d.ellipse((440, 160, 840, 560), outline=(0, 0, 0), width=3)
    d.text((500, 340), "16:9 LANDSCAPE", fill=(0, 0, 0))
    _save(img, "aspect_landscape.png")


def aspect_portrait_tall() -> None:
    img = Image.new("RGB", (540, 960), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((30, 30, 510, 930), outline=(0, 0, 0), width=4)
    d.ellipse((120, 250, 420, 650), outline=(0, 0, 0), width=3)
    d.text((160, 480), "9:16 TALL", fill=(0, 0, 0))
    _save(img, "aspect_portrait_tall.png")


def aspect_square() -> None:
    img = Image.new("RGB", (900, 900), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((40, 40, 860, 860), outline=(0, 0, 0), width=5)
    d.ellipse((200, 200, 700, 700), outline=(0, 0, 0), width=4)
    d.text((360, 430), "SQUARE", fill=(0, 0, 0))
    _save(img, "aspect_square.png")


def aspect_exact_6x9() -> None:
    # 2:3 aspect → fills 6x9 without letterbox
    img = Image.new("RGB", (800, 1200), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle((20, 20, 780, 1180), outline=(0, 0, 0), width=4)
    d.ellipse((150, 250, 650, 950), outline=(0, 0, 0), width=4)
    d.text((280, 580), "EXACT 6x9 (2:3)", fill=(0, 0, 0))
    _save(img, "aspect_exact_6x9.png")


def edge_markers() -> None:
    img = Image.new("RGB", (900, 1200), (255, 255, 255))
    d = ImageDraw.Draw(img)
    # Corner L-marks
    for x0, y0 in [(20, 20), (880, 20), (20, 1180), (880, 1180)]:
        sx = 1 if x0 < 450 else -1
        sy = 1 if y0 < 600 else -1
        d.line([(x0, y0), (x0 + sx * 60, y0)], fill=(0, 0, 0), width=3)
        d.line([(x0, y0), (x0, y0 + sy * 60)], fill=(0, 0, 0), width=3)
    # Center cross
    d.line([(430, 600), (470, 600)], fill=(0, 0, 0), width=3)
    d.line([(450, 580), (450, 620)], fill=(0, 0, 0), width=3)
    # Mid-edge ticks
    d.line([(450, 40), (450, 80)], fill=(200, 0, 0), width=2)
    d.line([(450, 1120), (450, 1160)], fill=(200, 0, 0), width=2)
    d.line([(40, 600), (80, 600)], fill=(200, 0, 0), width=2)
    d.line([(820, 600), (860, 600)], fill=(200, 0, 0), width=2)
    _save(img, "edge_markers.png")


def dark_scene() -> None:
    img = Image.new("RGB", (900, 700), (15, 15, 20))
    d = ImageDraw.Draw(img)
    d.ellipse((200, 150, 700, 550), outline=(200, 200, 220), width=3)
    d.line([(250, 350), (650, 350)], fill=(180, 180, 200), width=2)
    d.ellipse((350, 250, 420, 320), outline=(220, 220, 240), width=2)
    d.ellipse((480, 250, 550, 320), outline=(220, 220, 240), width=2)
    _save(img, "dark_scene.png")


def speckle_noise() -> None:
    import random

    rng = random.Random(42)
    img = Image.new("RGB", (800, 800), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((150, 150, 650, 650), outline=(0, 0, 0), width=4)
    pixels = img.load()
    for _ in range(4000):
        x, y = rng.randint(0, 799), rng.randint(0, 799)
        pixels[x, y] = (0, 0, 0) if rng.random() < 0.5 else (255, 255, 255)
    _save(img, "speckle_noise.png")


def mandala_dense() -> None:
    img = Image.new("RGB", (1000, 1000), (255, 255, 255))
    d = ImageDraw.Draw(img)
    cx, cy = 500, 500
    for r in range(40, 460, 25):
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(0, 0, 0), width=2)
    for angle_deg in range(0, 360, 15):
        rad = math.radians(angle_deg)
        x2 = cx + int(450 * math.cos(rad))
        y2 = cy + int(450 * math.sin(rad))
        d.line([(cx, cy), (x2, y2)], fill=(0, 0, 0), width=1)
    for r in (120, 240, 360):
        for a in range(0, 360, 30):
            rad = math.radians(a)
            px = cx + int(r * math.cos(rad))
            py = cy + int(r * math.sin(rad))
            d.ellipse((px - 20, py - 20, px + 20, py + 20), outline=(0, 0, 0), width=1)
    _save(img, "mandala_dense.png")


def text_geometry() -> None:
    img = Image.new("RGB", (900, 1100), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((80, 60), "ABCDEFG 12345", fill=(0, 0, 0))
    d.text((80, 120), "KDP CONVERT QA", fill=(0, 0, 0))
    for i, r in enumerate((80, 160, 240, 320)):
        d.ellipse((450 - r, 550 - r, 450 + r, 550 + r), outline=(0, 0, 0), width=2 + i)
    d.rectangle((100, 900, 800, 1050), outline=(0, 0, 0), width=3)
    d.line([(100, 900), (800, 1050)], fill=(0, 0, 0), width=2)
    _save(img, "text_geometry.png")


def tiny_32() -> None:
    img = Image.new("RGB", (32, 32), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((4, 4, 28, 28), outline=(0, 0, 0), width=1)
    d.line([(8, 16), (24, 16)], fill=(0, 0, 0), width=1)
    _save(img, "tiny_32.png")


def _pdf_page(path: Path, pagesize: tuple[float, float], label: str, page_index: int = 0) -> None:
    c = pdf_canvas.Canvas(str(path), pagesize=pagesize)
    w, h = pagesize
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(w / 2, h / 2 + 20, label)
    c.setFont("Helvetica", 12)
    c.drawCentredString(w / 2, h / 2 - 10, f"{w:.0f}x{h:.0f} pt  page {page_index + 1}")
    c.rect(36, 36, w - 72, h - 72)
    c.showPage()
    c.save()


def pdf_1page_letter() -> None:
    _pdf_page(OUT_DIR / "pdf_1page_letter.pdf", letter, "LETTER 8.5x11")


def pdf_1page_6x9() -> None:
    _pdf_page(OUT_DIR / "pdf_1page_6x9.pdf", (6 * 72, 9 * 72), "TRIM 6x9")


def pdf_3page_odd() -> None:
    path = OUT_DIR / "pdf_3page_odd.pdf"
    pagesize = (6 * 72, 9 * 72)
    c = pdf_canvas.Canvas(str(path), pagesize=pagesize)
    for i in range(3):
        w, h = pagesize
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(w / 2, h / 2, f"ODD COUNT PAGE {i + 1}/3")
        c.rect(36, 36, w - 72, h - 72)
        c.showPage()
    c.save()


def pdf_landscape() -> None:
    _pdf_page(OUT_DIR / "pdf_landscape.pdf", (11 * 72, 8.5 * 72), "LANDSCAPE 11x8.5")


def pdf_mixed_page_sizes() -> None:
    path = OUT_DIR / "pdf_mixed_page_sizes.pdf"
    c = pdf_canvas.Canvas(str(path))
    for pagesize, label in [
        (letter, "PAGE1 LETTER"),
        ((6 * 72, 9 * 72), "PAGE2 6x9"),
        ((5 * 72, 8 * 72), "PAGE3 5x8"),
    ]:
        c.setPageSize(pagesize)
        w, h = pagesize
        c.setFont("Helvetica-Bold", 16)
        c.drawCentredString(w / 2, h / 2, label)
        c.rect(24, 24, w - 48, h - 48)
        c.showPage()
    c.save()


MANIFEST = [
    {"file": "lineart_black_on_white.png", "tool": "coloring", "purpose": "Happy-path outlines; both engines should keep lines"},
    {"file": "lineart_thin_hairlines.png", "tool": "coloring", "purpose": "Enhanced morphology may drop <5px components"},
    {"file": "lineart_white_on_black.png", "tool": "coloring", "purpose": "Inverted art → mostly-black page under dark-as-line"},
    {"file": "filled_cartoon.png", "tool": "coloring", "purpose": "Filled regions become black blobs"},
    {"file": "photo_gradient.png", "tool": "coloring", "purpose": "Soft tones; legacy threshold 127 lottery"},
    {"file": "low_contrast_gray.png", "tool": "coloring", "purpose": "Values near 127"},
    {"file": "high_contrast_hard.png", "tool": "coloring", "purpose": "Already B&W; should stay clean"},
    {"file": "rgba_on_transparent.png", "tool": "coloring", "purpose": "Legacy black halo vs enhanced white flatten"},
    {"file": "palette_p_mode.png", "tool": "coloring", "purpose": "Indexed PNG mode P"},
    {"file": "grayscale_L.png", "tool": "coloring", "purpose": "Grayscale mode L"},
    {"file": "jpeg_artifacts.jpg", "tool": "coloring", "purpose": "JPEG compression noise as false edges"},
    {"file": "saturated_primaries.jpg", "tool": "coloring", "purpose": "Color → gray conversion"},
    {"file": "aspect_landscape.png", "tool": "coloring", "purpose": "16:9 letterbox bars"},
    {"file": "aspect_portrait_tall.png", "tool": "coloring", "purpose": "9:16 side bars"},
    {"file": "aspect_square.png", "tool": "coloring", "purpose": "Square vs portrait trim"},
    {"file": "aspect_exact_6x9.png", "tool": "coloring", "purpose": "2:3 should fill 6x9"},
    {"file": "edge_markers.png", "tool": "coloring", "purpose": "Corner/center ticks for bleed vs trim"},
    {"file": "dark_scene.png", "tool": "coloring", "purpose": "Mostly dark with light lines"},
    {"file": "speckle_noise.png", "tool": "coloring", "purpose": "Salt-pepper vs edge=strong"},
    {"file": "mandala_dense.png", "tool": "coloring", "purpose": "detail_level low vs high"},
    {"file": "text_geometry.png", "tool": "coloring", "purpose": "Letters + concentric circles measurable"},
    {"file": "tiny_32.png", "tool": "coloring", "purpose": "Extreme upscale"},
    {"file": "pdf_1page_letter.pdf", "tool": "format-kdp", "purpose": "8.5x11 1 page → pad to 24 even"},
    {"file": "pdf_1page_6x9.pdf", "tool": "format-kdp", "purpose": "Already 6x9"},
    {"file": "pdf_3page_odd.pdf", "tool": "format-kdp", "purpose": "Odd count + min pages"},
    {"file": "pdf_landscape.pdf", "tool": "format-kdp", "purpose": "Landscape source on portrait trim"},
    {"file": "pdf_mixed_page_sizes.pdf", "tool": "format-kdp", "purpose": "Per-page fit"},
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generators = [
        lineart_black_on_white,
        lineart_thin_hairlines,
        lineart_white_on_black,
        filled_cartoon,
        photo_gradient,
        low_contrast_gray,
        high_contrast_hard,
        rgba_on_transparent,
        palette_p_mode,
        grayscale_L,
        jpeg_artifacts,
        saturated_primaries,
        aspect_landscape,
        aspect_portrait_tall,
        aspect_square,
        aspect_exact_6x9,
        edge_markers,
        dark_scene,
        speckle_noise,
        mandala_dense,
        text_geometry,
        tiny_32,
        pdf_1page_letter,
        pdf_1page_6x9,
        pdf_3page_odd,
        pdf_landscape,
        pdf_mixed_page_sizes,
    ]
    for fn in generators:
        fn()
    (OUT_DIR / "manifest.json").write_text(json.dumps(MANIFEST, indent=2) + "\n")
    print(f"Wrote {len(generators)} fixtures + manifest to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
