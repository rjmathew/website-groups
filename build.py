"""Builds the Chrome Web Store package: dist/website-groups-<version>.zip."""

import json
import os
import zipfile

FILES = [
    "manifest.json",
    "popup.html", "popup.js",
    "options.html", "options.js",
    "storage.js", "icons.js", "styles.css",
    "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png",
]

os.chdir(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open("manifest.json", encoding="utf-8"))

# Every file the manifest points at must be in the package.
referenced = (set(manifest["icons"].values())
              | set(manifest["action"]["default_icon"].values())
              | {manifest["action"]["default_popup"], manifest["options_ui"]["page"]})
missing = sorted(f for f in referenced | set(FILES) if not os.path.exists(f))
if missing:
    raise SystemExit("Missing files: " + ", ".join(missing))
if not referenced <= set(FILES):
    raise SystemExit("Add to FILES: " + ", ".join(sorted(referenced - set(FILES))))

os.makedirs("dist", exist_ok=True)
out = f"dist/website-groups-{manifest['version']}.zip"
# "key" only keeps the unpacked development copy on the store's extension ID.
# The store already knows the key, so it's left out of the package.
store_manifest = {k: v for k, v in manifest.items() if k != "key"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in FILES:
        if f == "manifest.json":
            z.writestr(f, json.dumps(store_manifest, indent=2, ensure_ascii=False) + "\n")
        else:
            z.write(f, f)
print(f"Built {out} ({os.path.getsize(out):,} bytes, {len(FILES)} files)")
