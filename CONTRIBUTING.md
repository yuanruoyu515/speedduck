# 参与 speedduck

欢迎提交可复现的问题和范围明确的改进。开始前请阅读 [构建指南](docs/BUILDING.md)。

## 报告问题

请提供 macOS / Safari / 扩展版本、播放器类型、复现步骤、期望结果和实际结果。若页面必须登录，请使用公开示例或最小复现，不要提供账号、访问令牌或私人网页截图。

## 修改代码

1. Fork 并创建分支。
2. 修改 `extension/` 中的源文件。弹窗编辑 `popup.css` / `popup.template.html`，然后运行 `python3 scripts/build-ui.py`。
3. 运行 `python3 scripts/check-project.py` 和 `npm test`。
4. 涉及媒体控制时执行引擎测试；涉及弹窗时执行扩展来源测试并在 Safari 中核对。
5. PR 中说明具体行为变化、验证方式和仍存在的限制。

不要加入遥测、远程代码、未说明的权限或签名材料。涉及权限和公开描述时同步更新 `CHROMEWEBSTORE.md`；这是文档记录，不代表已提交 Chrome 商店。

代码遵循 MIT 许可，图像素材条款见 ARTWORK.md。
