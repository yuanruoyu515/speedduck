<div align="center">
<img src="docs/assets/duck.png" width="100" alt="speedduck mascot">

# speedduck

**Your playback speed. A little duck to keep it there.**

A Safari extension for video and audio speed control, with rate locking and per-tab / per-site memory.

[Download](https://github.com/yuanruoyu515/speedduck/releases/latest) · [Build guide](docs/BUILDING.md) · [简体中文](README.md)

<img src="docs/assets/popup-preview.png" width="320" alt="speedduck popup">

<sub>UI demonstration; hostname and player count are sample data. The current interface is in Chinese.</sub>
</div>

## Features

- Eight presets from 0.5× to 4×, a slider, and exact input from 0.25× to 16×.
- Force mode resists player rate resets and reapplies the selected speed.
- Remember a tab's speed across navigation, or save a default for an exact hostname.
- Detect dynamic HTML video/audio, authorized frames, and shadow roots created after injection.
- Preserve pitch, inspect player status, and use Option + Shift + Up / Down / R shortcuts.
- No account, ads, paywalls, telemetry, or runtime network requests. Settings stay on the device.

## Install

Requires macOS 14+ and Safari 18.4+. Download the Safari ZIP from [Releases](https://github.com/yuanruoyu515/speedduck/releases/latest), move the app to Applications, open it, enable speedduck in Safari Extensions, grant access to the websites you want to control, and reload existing pages.

The downloadable app is an **Apple Development-signed personal build**, not Developer ID-notarized or App Store-distributed. It is not a universal distribution package and may be blocked on other Macs. For your own build, use your own signing identity as described in [BUILDING.md](docs/BUILDING.md). No private keys or certificates are included in the repository.

Controls are disabled on Safari's Start Page and other browser-owned pages. Cross-origin embedded players require permission for their host as well.

## Scope

The engine controls HTML media elements. DRM, live streams, custom renderers, browser limits, existing closed shadow roots and ungranted frame hosts can restrict it. High rates may mute audio. Universal player coverage is not guaranteed. Chromium engine tests do not establish full Chrome-extension compatibility.

Safari popup rendering, system WebKit media enforcement, Chromium engine checks and background state tests are documented in [VERIFICATION.md](VERIFICATION.md).

## Develop

```sh
git clone https://github.com/yuanruoyu515/speedduck.git
cd speedduck
python3 scripts/check-project.py
npm test
bash scripts/build.sh
```

The final step needs macOS and full Xcode. There are no runtime dependencies. Edit `popup.css` and `popup.template.html`; the build generates `popup.html` and its exact CSP hash. See [CONTRIBUTING.md](CONTRIBUTING.md), [privacy](docs/PRIVACY.md) and [security reporting](SECURITY.md).

Source code: [MIT](LICENSE). Artwork is covered separately in [ARTWORK.md](ARTWORK.md).
