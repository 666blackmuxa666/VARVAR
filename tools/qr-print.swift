// Друкарські QR: swift tools/qr-print.swift → print/qr-varvar.png (3000px) і print/qr-table-card.png (A6, 300 dpi)
import AppKit; import CoreImage
let URLS = "https://666blackmuxa666.github.io/VARVAR/"
let f = CIFilter(name: "CIQRCodeGenerator")!
f.setValue(URLS.data(using: .utf8), forKey: "inputMessage"); f.setValue("H", forKey: "inputCorrectionLevel")
let qr = f.outputImage!                                   // 1 піксель = 1 модуль
let ci = CIContext()
let qrCG = ci.createCGImage(qr, from: qr.extent)!
func save(_ img: CGImage, _ p: String) { let r = NSBitmapImageRep(cgImage: img); r.size = NSSize(width: img.width * 72 / 300, height: img.height * 72 / 300)
  try! r.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: p)) }
func ctx(_ w: Int, _ h: Int) -> CGContext { CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)! }
func drawQR(_ c: CGContext, _ r: CGRect) { c.interpolationQuality = .none; c.draw(qrCG, in: r) }  // різкі краї модулів

// 1) чистий QR: білий фон, поле 4 модулі
let mods = qr.extent.width, S = 3000
let c1 = ctx(S, S); c1.setFillColor(.white); c1.fill(CGRect(x: 0, y: 0, width: S, height: S))
let q = CGFloat(S) * mods / (mods + 8); drawQR(c1, CGRect(x: (CGFloat(S) - q) / 2, y: (CGFloat(S) - q) / 2, width: q, height: q))
save(c1.makeImage()!, "print/qr-varvar.png")

// 2) табличка A6 (105×148 мм при 300 dpi = 1240×1748)
let W = 1240, H = 1748
let c2 = ctx(W, H)
NSGraphicsContext.current = NSGraphicsContext(cgContext: c2, flipped: false)
c2.setFillColor(CGColor(red: 0.08, green: 0.08, blue: 0.08, alpha: 1)); c2.fill(CGRect(x: 0, y: 0, width: W, height: H))
func text(_ s: String, _ y: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight, _ color: NSColor) {
  let p = NSMutableParagraphStyle(); p.alignment = .center
  let a: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .paragraphStyle: p, .kern: size * 0.04]
  NSAttributedString(string: s, attributes: a).draw(in: CGRect(x: 40, y: y, width: CGFloat(W) - 80, height: size * 1.4))
}
let gold = NSColor(red: 0.95, green: 0.76, blue: 0.31, alpha: 1)
text("VARVAR", 1500, 150, .black, .white)
text("Скануй — меню і замовлення", 1400, 52, .semibold, .white)
text("Scan for menu & order", 1340, 40, .regular, NSColor(white: 0.7, alpha: 1))
let box: CGFloat = 860, bx = (CGFloat(W) - box) / 2, by: CGFloat = 400
let path = CGPath(roundedRect: CGRect(x: bx, y: by, width: box, height: box), cornerWidth: 40, cornerHeight: 40, transform: nil)
c2.addPath(path); c2.setFillColor(.white); c2.fillPath()
let qq = box * mods / (mods + 6); drawQR(c2, CGRect(x: bx + (box - qq) / 2, y: by + (box - qq) / 2, width: qq, height: qq))
text("Wi‑Fi: VARVAR   ·   Пароль: 66666666", 250, 46, .semibold, gold)
text("Оберіть страви і стіл → Замовити", 170, 40, .regular, NSColor(white: 0.85, alpha: 1))
save(c2.makeImage()!, "print/qr-table-card.png")
