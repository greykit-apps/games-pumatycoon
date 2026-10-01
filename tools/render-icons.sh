#!/bin/sh
# Render the favicons, the apple-touch icon and the social card from
# icon.svg and tools/og.svg. Needs rsvg-convert (librsvg) and python3 with
# Pillow for the .ico. Run from the repo root; commit the outputs.
set -e
rsvg-convert -w 16 -h 16 icon.svg -o favicon-16x16.png
rsvg-convert -w 32 -h 32 icon.svg -o favicon-32x32.png
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
rsvg-convert -w 48 -h 48 icon.svg -o /tmp/pumatycoon-48.png
python3 - <<'PY'
from PIL import Image
Image.open("/tmp/pumatycoon-48.png").save("favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
PY
rm -f /tmp/pumatycoon-48.png
rsvg-convert -w 1200 -h 630 tools/og.svg -o og.png
echo "rendered favicon-16x16.png favicon-32x32.png apple-touch-icon.png favicon.ico og.png"
