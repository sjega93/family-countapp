"""Rendert die App-Icons (PNG) aus public/favicon.svg.

Aufruf: python3 scripts/render-icons.py
Nur nötig, wenn sich das Icon ändert; die PNGs liegen im Repo.
"""

import pathlib

from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
svg = (root / "public" / "favicon.svg").read_text()

targets = [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-512-maskable.png", 512, True),
    ("apple-touch-icon.png", 180, True),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, size, full_bleed in targets:
        page = browser.new_page(viewport={"width": size, "height": size})
        # Maskierbare Icons und das Apple-Icon brauchen einen vollflächigen Hintergrund ohne Rundung.
        body = svg.replace('rx="112"', 'rx="0"') if full_bleed else svg
        background = "#7cc8ff" if full_bleed else "transparent"
        page.set_content(
            f'<html><body style="margin:0;background:{background}">'
            f'<div style="width:{size}px;height:{size}px">{body.replace("<svg ", f"<svg width=\"{size}\" height=\"{size}\" ", 1)}</div>'
            "</body></html>"
        )
        page.screenshot(path=str(root / "public" / name), omit_background=not full_bleed)
        page.close()
    browser.close()
print("Icons erzeugt")
