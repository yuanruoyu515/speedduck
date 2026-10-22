import AppKit
import WebKit
import Foundation

// Uses the system WebKit engine, without changing Safari user settings or websites.
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let script = try String(contentsOfFile: CommandLine.arguments[1], encoding: .utf8)
class Tester: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    var view: WKWebView!
    var window: NSWindow!
    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        print(message.body)
        let value = String(describing: message.body)
        exit(value.contains("PASS") ? 0 : 1)
    }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let tests = """
        const delay = ms => new Promise(r => setTimeout(r, ms));
        const check = (ok, name) => { if (!ok) throw new Error(name); };
        const config = (rate, force=true, pitch=true) => window.postMessage({channel:'speedduck:1',source:'extension',type:'config',config:{rate,force,pitch}},'*');
        try {
          const v = document.querySelector('video'), a = document.querySelector('audio');
          config(2); await delay(200);
          check(v.playbackRate === 2 && a.playbackRate === 2, 'video and audio');
          const spam = setInterval(() => { v.playbackRate = 1; a.defaultPlaybackRate=1; }, 10);
          await delay(800); clearInterval(spam);
          check(v.playbackRate === 2 && a.defaultPlaybackRate === 2, 'hostile reset lock');
          const host = document.createElement('div'); document.body.append(host);
          const root = host.attachShadow({mode:'closed'}); root.innerHTML='<video></video>';
          await delay(150); check(root.querySelector('video').playbackRate === 2, 'closed shadow root');
          const dynamic = document.createElement('audio'); document.body.append(dynamic);
          await delay(150); check(dynamic.playbackRate === 2, 'new audio');
          config(.25); await delay(100); check(v.playbackRate === .25, 'minimum .25');
          config(16); await delay(100); check(v.playbackRate === 16, 'maximum 16');
          config(1.5,false,false); await delay(100); v.playbackRate=.75;
          await delay(800); check(v.playbackRate === .75, 'release lock');
          check(a.preservesPitch === false, 'pitch');
          config(3); await delay(100); document.body.innerHTML='<video id="replacement"></video>';
          await delay(150); check(document.querySelector('video').playbackRate===3, 'replacement');
          window.webkit.messageHandlers.result.postMessage('PASS: system WebKit: video, audio, hostile resets, closed Shadow DOM, dynamic media, .25–16x, release, pitch, replacement');
        } catch(e) { window.webkit.messageHandlers.result.postMessage('FAIL: '+e.message); }
        """
        webView.callAsyncJavaScript(tests, arguments: [:], in: nil, in: .page) { result in
            if case .failure(let error) = result { print("FAIL: \(error)"); exit(1) }
        }
    }
}
let tester = Tester()
let config = WKWebViewConfiguration()
config.userContentController.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: false, in: .page))
config.userContentController.add(tester, name: "result")
tester.view = WKWebView(frame: NSRect(x: 0, y: 0, width: 380, height: 660), configuration: config)
tester.view.navigationDelegate = tester
tester.window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 380, height: 660), styleMask: [.borderless], backing: .buffered, defer: false)
tester.window.contentView = tester.view
tester.window.orderBack(nil)
tester.view.loadHTMLString("<!doctype html><html><body><video></video><audio></audio></body></html>", baseURL: URL(string: "https://speedduck.test"))
DispatchQueue.main.asyncAfter(deadline: .now() + 25) { print("FAIL: WebKit timeout"); exit(1) }
app.run()
