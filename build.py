"""Builds the Chrome Web Store package: dist/website-groups-<version>.zip.

The package contents come from manifest.json (icons and pages) plus every
script and stylesheet those pages load, so a file added to a page is always
packaged, and a page pointing at a missing file stops the build.
"""

import json
import os
import zipfile
from html.parser import HTMLParser


class PageReferences(HTMLParser):
    """Collects the local scripts and stylesheets an HTML page loads."""

    def __init__(self):
        super().__init__()
        self.files = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "script" and a.get("src"):
            self.files.append(a["src"])
        elif tag == "link" and a.get("rel") == "stylesheet" and a.get("href"):
            self.files.append(a["href"])


def page_references(page):
    parser = PageReferences()
    parser.feed(open(page, encoding="utf-8").read())
    for ref in parser.files:
        # Store policy forbids loading code from the internet.
        if "://" in ref or ref.startswith("//"):
            raise SystemExit(f"{page} loads {ref} from the internet. Bundle it in the package instead.")
    # References are relative to the page.
    base = os.path.dirname(page)
    return [os.path.normpath(os.path.join(base, ref)).replace(os.sep, "/") for ref in parser.files]


os.chdir(os.path.dirname(os.path.abspath(__file__)))
manifest = json.load(open("manifest.json", encoding="utf-8"))

pages = [manifest["action"]["default_popup"], manifest["options_ui"]["page"]]
files = {"manifest.json", *pages,
         *manifest["icons"].values(), *manifest["action"]["default_icon"].values()}
for page in pages:
    if os.path.exists(page):
        files.update(page_references(page))

missing = sorted(f for f in files if not os.path.exists(f))
if missing:
    raise SystemExit("Missing files: " + ", ".join(missing))

# "key" only keeps the unpacked development copy on the store's extension ID.
# The store already knows the key, so it's left out of the package.
store_manifest = {k: v for k, v in manifest.items() if k != "key"}

os.makedirs("dist", exist_ok=True)
out = f"dist/website-groups-{manifest['version']}.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(files):
        if f == "manifest.json":
            z.writestr(f, json.dumps(store_manifest, indent=2, ensure_ascii=False) + "\n")
        else:
            z.write(f, f)
print(f"Built {out} ({os.path.getsize(out):,} bytes, {len(files)} files)")
for f in sorted(files):
    print("  " + f)
