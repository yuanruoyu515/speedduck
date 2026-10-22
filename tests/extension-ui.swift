import AppKit
import WebKit
import Foundation

// Real WebKit extension origin and manifest CSP, rather than a file:// UI mock.
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
class UIProbe: NSObject, WKNavigationDelegate {
    var controller: WKWebExtensionController!
    var context: WKWebExtensionContext!
    var view: WKWebView!
    var window: NSWindow!
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            webView.evaluateJavaScript("""
            JSON.stringify({origin:location.origin, sheets:document.styleSheets.length,
            font:getComputedStyle(document.body).fontFamily,
            speedColor:getComputedStyle(document.querySelector('.speed-number')).color,
            presets:getComputedStyle(document.querySelector('.presets')).gridTemplateColumns,
            switchWidth:getComputedStyle(document.querySelector('.switch')).width,
            width:document.body.getBoundingClientRect().width,
            rules:[...document.styleSheets].map(s=>s.cssRules.length)})
            """) { result, error in
                if let error = error { print("FAIL: \(error)"); exit(1) }
                guard let json = result as? String, let data = json.data(using: .utf8),
                    let state = try? JSONSerialization.jsonObject(with: data) as? [String:Any] else { print("FAIL: no result"); exit(1) }
                print(json)
                let ok = state["speedColor"] as? String == "rgb(8, 123, 255)" && state["switchWidth"] as? String == "46px" && state["width"] as? Int == 380
                print(ok ? "PASS: WebKit extension-origin popup and real manifest CSP" : "FAIL: extension styles missing")
                guard ok, CommandLine.arguments.count > 2 else { exit(ok ? 0 : 1) }
                webView.takeSnapshot(with: nil) { image, error in
                    guard let tiff = image?.tiffRepresentation,
                          let bitmap = NSBitmapImageRep(data: tiff),
                          let png = bitmap.representation(using: .png, properties: [:]) else {
                        print("FAIL: snapshot \(String(describing: error))"); exit(1)
                    }
                    do {
                        try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
                        print("PASS: extension-origin UI snapshot saved")
                        exit(0)
                    } catch { print("FAIL: snapshot write \(error)"); exit(1) }
                }
            }
        }
    }
}
let probe = UIProbe()
Task { @MainActor in
    do {
        let ext = try await WKWebExtension(resourceBaseURL: URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true))
        probe.context = WKWebExtensionContext(for: ext)
        probe.controller = WKWebExtensionController()
        try probe.controller.load(probe.context)
        guard let config = probe.context.webViewConfiguration else { print("FAIL: no extension configuration"); exit(1) }
        probe.view = WKWebView(frame: NSRect(x: 0,y: 0,width:380,height:600), configuration: config)
        probe.view.navigationDelegate = probe
        probe.window = NSWindow(contentRect: NSRect(x:0,y:0,width:380,height:600), styleMask:[.borderless], backing:.buffered, defer:false)
        probe.window.contentView = probe.view
        probe.window.orderBack(nil)
        probe.view.load(URLRequest(url: probe.context.baseURL.appendingPathComponent("popup.html")))
    } catch { print("FAIL: \(error)"); exit(1) }
}
DispatchQueue.main.asyncAfter(deadline: .now() + 25) { print("FAIL: timeout"); exit(1) }
app.run()
