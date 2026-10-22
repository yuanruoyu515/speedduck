import AppKit
import Foundation
let folder = CommandLine.arguments[1]
for size in [16, 32, 48, 64, 128, 256, 512, 1024] {
    let canvas = NSImage(size: NSSize(width: size, height: size))
    canvas.lockFocus()
    let s = CGFloat(size)
    let rect = NSRect(x: 0, y: 0, width: s, height: s)
    NSColor(calibratedRed: 0.03, green: 0.48, blue: 1, alpha: 1).setFill()
    NSBezierPath(roundedRect: rect, xRadius: s * 0.23, yRadius: s * 0.23).fill()
    if let symbol = NSImage(systemSymbolName: "speedometer", accessibilityDescription: "speedduck") {
        let config = NSImage.SymbolConfiguration(pointSize: s * 0.62, weight: .medium)
        let image = symbol.withSymbolConfiguration(config)!
        let ratio = image.size.width / image.size.height
        let w = s * 0.7
        let h = w / ratio
        let tinted = NSImage(size: image.size)
        tinted.lockFocus()
        NSColor.white.set()
        image.draw(in: NSRect(origin: .zero, size: image.size))
        NSRect(origin: .zero, size: image.size).fill(using: .sourceIn)
        tinted.unlockFocus()
        tinted.draw(in: NSRect(x: (s-w)/2, y: (s-h)/2, width: w, height: h))
    }
    canvas.unlockFocus()
    let bitmap = NSBitmapImageRep(data: canvas.tiffRepresentation!)!
    let scaled = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: scaled)
    bitmap.draw(in: rect)
    NSGraphicsContext.restoreGraphicsState()
    try scaled.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(folder)/icon-\(size).png"))
}
