"""Check cross-file invariants that affect a packaged extension. Standard library only."""
from pathlib import Path
import base64
import hashlib
import json
import struct

root = Path(__file__).resolve().parents[1]
ext = root / 'extension'
manifest = json.loads((ext / 'manifest.json').read_text())
package = json.loads((root / 'package.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['version'] == package['version'], 'package / manifest versions differ'
assert manifest['version'] in (root / 'Safari/speedduck/speedduck.xcodeproj/project.pbxproj').read_text()

css = (ext / 'popup.css').read_text()
template = (ext / 'popup.template.html').read_text()
expected = template.replace('<!-- SPEEDDUCK_STYLES -->', '<style>' + css + '</style>')
assert template.count('<!-- SPEEDDUCK_STYLES -->') == 1
assert (ext / 'popup.html').read_text() == expected, 'Run python3 scripts/build-ui.py'
digest = base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
assert "'sha256-" + digest + "'" in manifest['content_security_policy']['extension_pages'], 'CSP hash does not match CSS'

for icons in [manifest['icons'], manifest['action']['default_icon']]:
    for size, filename in icons.items():
        data = (ext / filename).read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n', filename
        assert struct.unpack('>II', data[16:24]) == (int(size), int(size)), filename
for script in manifest['content_scripts']:
    for filename in script['js']:
        assert (ext / filename).is_file(), filename
assert (ext / manifest['background']['service_worker']).is_file()
assert (ext / manifest['action']['default_popup']).is_file()
print('PASS: versions, bundled popup, exact CSP hash, PNG dimensions and manifest resources')
