from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "app" / "downloads" / "Aurora_Forge_Reader_Handbook.pdf"
OUT = ROOT / "qa" / "reader-handbook-final"
PAGE_DIR = OUT / "pages"
SHEET_DIR = OUT / "contact-sheets"


def main():
    PAGE_DIR.mkdir(parents=True, exist_ok=True)
    SHEET_DIR.mkdir(parents=True, exist_ok=True)

    document = pdfium.PdfDocument(PDF_PATH)
    rendered = []
    for index in range(len(document)):
        page = document[index]
        image = page.render(scale=1.55).to_pil().convert("RGB")
        page_path = PAGE_DIR / f"page-{index + 1:03d}.png"
        image.save(page_path, quality=92)
        rendered.append(page_path)

    for group_index in range(0, len(rendered), 4):
        paths = rendered[group_index:group_index + 4]
        thumbs = []
        for offset, path in enumerate(paths):
            image = Image.open(path).convert("RGB")
            image.thumbnail((930, 1240), Image.Resampling.LANCZOS)
            card = Image.new("RGB", (960, 1300), "#111827")
            x = (card.width - image.width) // 2
            card.paste(image, (x, 35))
            draw = ImageDraw.Draw(card)
            draw.text((24, 1265), f"Page {group_index + offset + 1}", fill="#f8fafc")
            thumbs.append(card)

        sheet = Image.new("RGB", (1920, 2600), "#030712")
        positions = [(0, 0), (960, 0), (0, 1300), (960, 1300)]
        for card, position in zip(thumbs, positions):
            sheet.paste(card, position)
        first = group_index + 1
        last = group_index + len(paths)
        sheet.save(SHEET_DIR / f"pages-{first:03d}-{last:03d}.jpg", quality=90)

    print(f"Rendered {len(rendered)} pages and {(len(rendered) + 3) // 4} contact sheets.")


if __name__ == "__main__":
    main()
