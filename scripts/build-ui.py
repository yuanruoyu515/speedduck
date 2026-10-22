"""Bundle popup styles into the HTML, with an exact CSP hash; no network stylesheet dependency."""
from pathlib import Path
import base64
import hashlib
import json

root = Path(__file__).resolve().parents[1] / 'extension'
css = (root / 'popup.css').read_text()
template = (root / 'popup.template.html').read_text()
assert template.count('<!-- SPEEDDUCK_STYLES -->') == 1
assert '</style' not in css.lower()
(root / 'popup.html').write_text(template.replace('<!-- SPEEDDUCK_STYLES -->', '<style>' + css + '</style>'))
digest = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
manifest = json.loads((root / 'manifest.json').read_text())
manifest['content_security_policy']['extension_pages'] = f"default-src 'self'; script-src 'self'; style-src 'self' 'sha256-{digest}'; object-src 'none'"
(root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Bundled popup CSS and generated matching Content Security Policy hash.')
