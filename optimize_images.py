from PIL import Image, ImageOps
from pathlib import Path
import shutil

ROOT = Path(__file__).parent
BACKUP = ROOT / "image_backup"

MAX_SIZE = 1800
JPEG_QUALITY = 82

image_extensions = {".jpg", ".jpeg", ".JPG", ".JPEG"}

for image_path in ROOT.rglob("*"):
    if image_path.suffix not in image_extensions:
        continue

    if BACKUP in image_path.parents:
        continue

    relative_path = image_path.relative_to(ROOT)
    backup_path = BACKUP / relative_path

    backup_path.parent.mkdir(parents=True, exist_ok=True)

    if not backup_path.exists():
        shutil.copy2(image_path, backup_path)

    with Image.open(image_path) as img:
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")

        img.thumbnail((MAX_SIZE, MAX_SIZE), Image.Resampling.LANCZOS)

        img.save(
            image_path,
            "JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True
        )

    print(f"Optimized: {relative_path}")

print("Done!")