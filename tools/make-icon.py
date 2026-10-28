"""Composites the app icon from the 奶蛙 render (tools/make-icon.mjs runs this).

    python tools/make-icon.py .local/icon/naiwa-render.png .local/icon/naiwa-bust.png build

Writes, into the output folder:
  icon.png       1024 px master (rounded cream tile, full bleed; Windows / Linux / favicon)
  icon.ico       16, 24, 32, 48, 64, 128, 256 px
  icon.icns      macOS layout (tile inset to Apple's 824 px grid, soft shadow)
  icon-mac.png   the macOS layout as a PNG
and public/favicon.png (64 px, the page icon in index.html).
Sizes up to 48 px are drawn from the head close-up (a bolder rim and outline),
not just shrunk, so they still read at 16-32 px.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

CREAM = (246, 236, 214, 255)
CREAM_DEEP = (236, 220, 188, 255)
INK = (40, 46, 41, 255)
SAGE = (178, 196, 160, 255)


def rounded_mask(size, box, radius, scale=4):
    """Anti-aliased rounded-rectangle mask."""
    big = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle([v * scale for v in box], radius=radius * scale, fill=255)
    return big.resize((size, size), Image.LANCZOS)


def ellipse_mask(size, box, scale=4):
    big = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(big).ellipse([v * scale for v in box], fill=255)
    return big.resize((size, size), Image.LANCZOS)


def solid(size, colour):
    return Image.new('RGBA', (size, size), colour)


def sticker(subject, outline):
    """The subject with an ink outline around its silhouette (toy-sticker look)."""
    pad = outline * 2 + 4
    canvas = Image.new('RGBA', (subject.width + pad * 2, subject.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(subject, (pad, pad))
    alpha = canvas.getchannel('A').point(lambda a: 255 if a > 40 else 0)
    # Blur-and-threshold grows the silhouette with round, even corners.
    grown = alpha.filter(ImageFilter.GaussianBlur(outline * 0.55)).point(lambda a: max(0, min(255, (a - 10) * 10)))
    ink = Image.new('RGBA', canvas.size, INK)
    ink.putalpha(grown)
    ink.alpha_composite(canvas)
    return ink


def tile(size, subject, *, inset=0.0, radius=0.22, border=0.035, fill=0.86, outline=0.012, shadow=False, floor=True, bottom=0.085, centre=None):
    """One icon image: rounded cream tile, ink rim, sage floor disc, the frog sticker."""
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    left = round(size * inset)
    box = (left, left, size - left - 1, size - left - 1)
    side = box[2] - box[0]
    r = side * radius
    if shadow:
        drop = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        drop.putalpha(rounded_mask(size, (box[0], box[1] + side * 0.02, box[2], box[3] + side * 0.02), r).point(lambda a: a * 0.35))
        image.alpha_composite(drop.filter(ImageFilter.GaussianBlur(side * 0.025)))
    rim = max(1, round(side * border))
    # Ink rim, then the cream face with a soft top-to-bottom warmth.
    image.alpha_composite(Image.composite(solid(size, INK), Image.new('RGBA', (size, size), (0, 0, 0, 0)), rounded_mask(size, box, r)))
    inner = (box[0] + rim, box[1] + rim, box[2] - rim, box[3] - rim)
    gradient = Image.new('RGBA', (size, size))
    draw = ImageDraw.Draw(gradient)
    for y in range(size):
        t = min(1, max(0, (y - inner[1]) / max(1, inner[3] - inner[1])))
        draw.line([(0, y), (size, y)], fill=tuple(round(CREAM[i] + (CREAM_DEEP[i] - CREAM[i]) * t) for i in range(3)) + (255,))
    face = rounded_mask(size, inner, max(1, r - rim))
    image.alpha_composite(Image.composite(gradient, Image.new('RGBA', (size, size), (0, 0, 0, 0)), face))
    # A sage floor disc under the feet grounds the figure.
    if floor:
        ground = (inner[0] + side * 0.14, inner[3] - side * 0.27, inner[2] - side * 0.14, inner[3] - side * 0.07)
        disc = Image.new('RGBA', (size, size), SAGE)
        disc.putalpha(ImageChops.multiply(ellipse_mask(size, ground), face))
        image.alpha_composite(disc)

    # The frog, outlined, scaled to `fill` of the face and sitting on the disc.
    target = (inner[2] - inner[0]) * fill
    scale = target / max(subject.width, subject.height)
    shrunk = subject.resize((max(1, round(subject.width * scale)), max(1, round(subject.height * scale))), Image.LANCZOS)
    stick = sticker(shrunk, max(1, round(side * outline)))
    x = round((inner[0] + inner[2]) / 2 - stick.width / 2)
    y = round(inner[3] - side * bottom - stick.height + stick.height * 0.03) if centre is None         else round(inner[1] + (inner[3] - inner[1]) * centre - stick.height / 2)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    layer.alpha_composite(stick, (max(-stick.width, x), max(-stick.height, y)))
    # Keep everything inside the tile face.
    layer.putalpha(ImageChops.multiply(layer.getchannel('A'), face))
    image.alpha_composite(layer)
    return image


def main():
    source, close_up, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3] if len(sys.argv) > 3 else 'build')
    out.mkdir(parents=True, exist_ok=True)
    render = Image.open(source).convert('RGBA')
    subject = render.crop(render.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())

    master = tile(1024, subject, inset=0.02)
    master.save(out / 'icon.png')
    mac = tile(1024, subject, inset=100 / 1024, radius=0.225, shadow=True)
    mac.save(out / 'icon-mac.png')

    # Big sizes come from the master. Small ones use the head close-up, which
    # fills the tile (the ink outline and rim separate it from the cream).
    bust = Image.open(close_up).convert('RGBA')

    def small(px):
        art = tile(px * 8, bust, inset=0.0, radius=0.2, border=max(0.05, 1.2 / px), fill=1.0, outline=0.022, floor=False, centre=0.5)
        # A touch of sharpening keeps the eyes and the outline crisp after the shrink.
        return art.resize((px, px), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.8, percent=70, threshold=2))
    frames = {px: (small(px) if px <= 48 else master.resize((px, px), Image.LANCZOS)) for px in (16, 24, 32, 48, 64, 128, 256)}
    frames[256].save(out / 'icon.ico', format='ICO', sizes=[(px, px) for px in frames], append_images=[frames[px] for px in frames if px != 256])
    # Pillow writes ICNS from the largest image it is given (it adds the smaller ones itself).
    mac.save(out / 'icon.icns', format='ICNS')
    frames[64].save(Path(__file__).resolve().parent.parent / 'public' / 'favicon.png')
    # Previews of every .ico frame next to the render, for checking by eye.
    for px, frame in frames.items():
        frame.save(source.parent / f'preview-{px}.png')
    print(f'wrote {out / "icon.png"}, icon.ico, icon.icns, icon-mac.png and public/favicon.png')


if __name__ == '__main__':
    main()
