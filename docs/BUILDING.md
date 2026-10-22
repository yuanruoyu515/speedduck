# 安装、构建与测试

## 环境

- 构建 Safari App：macOS 14+，完整 Xcode 和 Command Line Tools，Python 3。
- 使用扩展：Safari 18.4+。
- 后台测试：Node.js 22+；不需要安装 npm 依赖。
- 系统 WebKit 测试：需要支持 `WKWebExtension` 及 `webViewConfiguration` 的新版本 macOS / Xcode；本项目在 macOS 27 / Xcode 27 上完成验证。普通 App 构建不依赖这些测试 API。

## 获取源码

```sh
git clone https://github.com/yuanruoyu515/speedduck.git
cd speedduck
python3 scripts/check-project.py
npm test
```

## 未签名构建

```sh
bash scripts/build.sh
```

产物：`build/Build/Products/Release/speedduck.app`。脚本先将 `extension/popup.css` 内联到生成的 HTML，同时更新 manifest 的 CSP 哈希，再执行 Release 构建。不要用本地预览替代真正的扩展来源测试。

默认构建关闭代码签名，适合确认源码能否编译；它不是可直接分发给所有用户的安装包。

## 使用自己的签名

方式一：用 Xcode 打开 `Safari/speedduck/speedduck.xcodeproj`，为 App 和 Extension 两个 target 选择自己的开发团队，设置独有的 bundle ID，再构建运行。更改 Extension bundle ID 时，同步修改 `ViewController.swift` 中的 `extensionBundleIdentifier`。Xcode 使用的签名和 provisioning 需与你的账号匹配。

方式二：本机已有可用的签名身份时，通过环境变量运行脚本：

```sh
SIGNING_IDENTITY='Apple Development: YOUR NAME (YOUR CERTIFICATE ID)' bash scripts/build.sh
```

脚本对扩展和 App 依次签名，并验证整个包。它不处理账号注册、证书签发、App Store 上传或公证。公开正式分发应另行完成合适的签名、公证或 App Store 流程。

## 启用扩展

1. 将构建的 App 放进「应用程序」，打开它。
2. 点击「打开 Safari 扩展设置」，启用 speedduck。
3. 为需要调速的网站授予访问权限；嵌入播放器也需要对应域名的权限。
4. 刷新原先打开的页面，然后点击工具栏小鸭子。

不要在起始页或 Safari 内部页面中测试播放功能。若已有旧版弹窗，先关闭，再重新打开。此项目不会自动更改网站权限或关闭系统安全保护。

## 检查与测试

```sh
# 无第三方依赖：资源路径、PNG 尺寸、版本与 CSP 一致性
python3 scripts/check-project.py

# 状态持久化、导航、记忆优先级与消息权限边界
npm test

# 系统 WebKit 中的真实媒体元素
swift -module-cache-path /tmp/speedduck-swift-cache tests/webkit.swift extension/page.js

# 真正 WKWebExtension 来源 + manifest CSP + 布局检查
swift -module-cache-path /tmp/speedduck-swift-cache tests/extension-ui.swift "$PWD/extension"

# 可选：保存独立测试窗口的截图
swift -module-cache-path /tmp/speedduck-swift-cache tests/extension-ui.swift "$PWD/extension" /tmp/speedduck-popup.png
```

浏览器集成测试需要本机 Google Chrome 和 Playwright。将 Playwright 安装到独立工具目录，再设置 `PLAYWRIGHT_PATH` 指向该模块目录：

```sh
PLAYWRIGHT_PATH=/absolute/path/to/node_modules/playwright npm run test:browser
```

该测试使用独立的临时浏览器会话，不操作已有标签页。媒体引擎检查使用真实媒体元素；弹窗交互测试会模拟扩展 API，其站点名和数量是测试数据。截图默认保存到 `test-results/popup.png`。

CI 在 Linux 上执行静态检查和后台测试，在 macOS 上验证未签名 App 构建。CI 不等于逐站播放验收，也不代替 Safari 中的实际弹窗检查。

## 发布前

- 同步 manifest、package.json 和 Xcode 的版本。
- 更新 CHANGELOG、VERIFICATION 和 CHROMEWEBSTORE 中的相关状态。
- 执行上述适用测试，检查 Safari 真正弹窗。
- 不要提交密钥、证书、provisioning、用户网页截图或本地构建目录。
- 发布源码归档、相应构建包和 SHA-256 校验值，并明确签名 / 公证状态。
