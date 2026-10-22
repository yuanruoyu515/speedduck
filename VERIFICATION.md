# Verification — 2026-10-22

- Release Xcode build: passed on local arm64 Mac with macOS 14 deployment target.
- Native app and embedded Safari extension: Apple Development signed; codesign deep/strict verification passed.
- macOS pluginkit registered `ac.yry.speedduck.Extension` in `/Applications/speedduck.app`.
- Version 1.0.1 installed and registered in /Applications; Apple Development deep/strict signature verification passed.
- Safari 27.0.1 actual toolbar popup visually inspected on a user-selected Start Page: duck heading, blue numeric rate, four-column presets, card layout and switches render correctly. Start Page intentionally disables media controls. Screenshot: docs/assets/safari-popup.png (cropped to popup only).
- 1.0.0 failed to apply its external stylesheet in the user's Safari popup despite the stylesheet being present in the app. 1.0.1 bundles the stylesheet into popup.html and generates its exact SHA-256 CSP hash during every build. The precise cause of the external stylesheet failure has not been established.
- Real WKWebExtension origin and manifest CSP: stylesheet rules, system font, blue rate, four-column grid, 46px switches, and 380px width passed. Isolated WKWebView screenshot is separate from actual Safari screenshot.
- System WebKit WKWebView: video/audio, hostile repeated speed reset, dynamically added media, closed Shadow DOM, 0.25×/16×, force-release, pitch, media replacement passed.
- Chromium media engine: equivalent enforcement checks passed.
- Background state tests: page navigation, SPA changes, tab/site memory scope, worker restart, frame count, speed bounds, page-to-extension mutation rejection, tab cleanup passed.
- Popup 1.0.1: presets, increment, numeric custom rate, reset, switches and details passed; no horizontal overflow; default popup fits 380×600 browser bounds. Chromium UI preview uses mocked hostname and player count; it is not evidence of actual Safari rendering.
- No external commercial website playback has been independently verified yet; WebKit tests do not prove Safari extension message delivery on every website.
- Published source and personal Safari app builds on GitHub; no App Store / Chrome Web Store submission or Developer ID notarization.
