# Chrome Web Store Listing — speedduck

> Last Updated: 2026-10-22. Public GitHub source; personal Safari build; no store submission.

## Store Listing

**Extension Name:** speedduck

**Short Description:** 精确控制网页视频和音频倍速，支持强制锁速、标签页记忆和网站记忆。

**Detailed Description:**

用一只小鸭子控制网页视频和音频的播放速度。

一键选择 0.5–4 倍速，也可以用滑块精细调整或输入 0.25–16 倍速。强制锁速防止播放器恢复原速。可记住当前标签页的速度，或为网站保存默认速度。支持保持音调和快捷键。

安装后允许访问需要调速的网站并刷新网页，点工具栏图标即可开始。部分直播、受保护内容或特殊播放器可能限制速度。所有设置仅保存在本机，没有账号、广告、付费锁或遥测。

**Category:** Productivity

**Single Purpose:** Control playback speed of video and audio on websites.

**Primary Language:** Simplified Chinese

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store icon | 128×128 | Ready | extension/icons/icon-128.png |
| Local popup preview | 760×1200 | Review only; not store dimensions | docs/assets/popup-preview.png |
| Store screenshot | 1280×800 | Not prepared | — |
| Promo tiles | 440×280 / 1400×560 | Not prepared | — |

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| storage | permissions | Save local site preferences and temporary tab state. |
| tabs | permissions | Route speed commands and website preferences to the correct tab and its players. URLs are held only in session memory. |
| http://*/*, https://*/* | host_permissions | Detect and adjust media on user-authorized websites and embedded frames. No off-device transmission. |
| all_frames | content script scope | Apply the top-level tab speed to authorized embedded players. |

## Privacy & Data Use

**Does the extension collect user data?** No off-device collection. Local processing only:

| Data Type | Local processing | Off-device | Purpose | Third parties |
|---|---|---|---|---|
| PII / health / financial / authentication | No | No | — | No |
| Personal communications / location / page text | No | No | — | No |
| Site hostname and preferred speed | Optional persistent local storage | No | Site memory | No |
| Current tab URL, id, page token, frame count | Session storage | No | Tab memory and player status | No |
| Speed, lock and pitch settings | Local storage | No | Core functionality | No |

- [x] Data is not sold.
- [x] Data is used only for core functionality.
- [x] Data is not used for creditworthiness or lending.

## Privacy Policy

**Privacy Policy URL:** https://github.com/yuanruoyu515/speedduck/blob/main/docs/PRIVACY.md — public policy; store-specific submission requirements remain to be reviewed.

## Distribution

**Visibility:** Public GitHub project with personal Safari build.
**Regions:** Not submitted.

## Developer Info

**Publisher / Contact / Support / Homepage:** Publisher: yuanruoyu515. Support: https://github.com/yuanruoyu515/speedduck/issues. Homepage: https://github.com/yuanruoyu515/speedduck. No public contact email specified.

## Version History

| Version | Date | Changes | Status |
|---|---|---|---|
| 1.0.1 | 2026-10-22 | Bundle popup CSS with generated CSP hash; verify actual Safari popup rendering. | Public source + personal build |
| 1.0.0 | 2026-10-22 | Speed control, lock, tab/site memory, duck mascot, Safari app. | Local build |

## Review Notes

No submission or review. Source uses Manifest V3; Chrome installation was not separately validated. Safari converter emits outdated warnings about world and match_about_blank. No remote code or runtime dependencies.

### Known Issues / Limitations

Cannot guarantee every player: DRM, live/custom renderers, browser limits, pre-existing closed roots and ungranted frame hosts may restrict control. High rates may mute audio. Desktop macOS wrapper only. Commercial site coverage remains to be tested.

### Rejection History

None.
