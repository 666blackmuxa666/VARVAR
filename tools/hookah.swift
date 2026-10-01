// Чаші кальяну з tools/src/hookah.jpg: swift tools/hookah.swift <out_dir>
// gold — оригінал (3 табаки); silver — лише червоний; platinum — лише чорний.
// Однотонні чаші засипаються копіями чистого шматка табаку; обідок — оригінальний.
import AppKit

let out = CommandLine.arguments[1]
let src = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: "tools/src/hookah.jpg")))!.cgImage!
let cx: CGFloat = 585, cy: CGFloat = 590      // центр чаші (пікселі, від верхнього лівого кута)
let rOuter: CGFloat = 312, rInner: CGFloat = 252

// patch: чистий шматок потрібного табаку (x, y, w, h у пікселях джерела)
// чаша «засипається» копіями шматка з мʼякими краями й випадковим поворотом → без швів
func bowl(_ name: String, patch: CGRect?) {
  let S = Int(rOuter * 2 + 8)
  let ctx = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let o = CGFloat(S) / 2
  ctx.addEllipse(in: CGRect(x: o - rOuter, y: o - rOuter, width: rOuter * 2, height: rOuter * 2)); ctx.clip()
  // джерело так, щоб центр чаші був у (o, o) (CG — знизу вгору)
  ctx.draw(src, in: CGRect(x: o - cx, y: o - (CGFloat(src.height) - cy), width: CGFloat(src.width), height: CGFloat(src.height)))
  if let patch {
    let tile = src.cropping(to: patch)!
    let d = min(patch.width, patch.height)
    // мʼяка кругла маска для кожної копії
    let mctx = CGContext(data: nil, width: Int(d), height: Int(d), bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: 0)!
    let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceGray(), colors: [CGColor(gray: 1, alpha: 1), CGColor(gray: 1, alpha: 1), CGColor(gray: 0, alpha: 1)] as CFArray, locations: [0, 0.82, 1])!
    mctx.drawRadialGradient(g, startCenter: CGPoint(x: d / 2, y: d / 2), startRadius: 0, endCenter: CGPoint(x: d / 2, y: d / 2), endRadius: d / 2, options: [])
    let mask = mctx.makeImage()!
    ctx.saveGState()
    ctx.addEllipse(in: CGRect(x: o - rInner, y: o - rInner, width: rInner * 2, height: rInner * 2)); ctx.clip()
    var rng = SystemRandomNumberGenerator()
    let step = d * 0.6
    var pts: [CGPoint] = []
    var y = o - rInner - step; while y < o + rInner + step { var x = o - rInner - step; while x < o + rInner + step { pts.append(CGPoint(x: x + .random(in: -step/3...step/3, using: &rng), y: y + .random(in: -step/3...step/3, using: &rng))); x += step }; y += step }
    pts.shuffle(using: &rng)
    // перший прохід — суцільна підкладка, щоб не було просвітів
    ctx.saveGState(); ctx.setFillColor(CGColor(gray: 0, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: S, height: S)); ctx.restoreGState()
    for p in pts {
      ctx.saveGState()
      ctx.translateBy(x: p.x, y: p.y); ctx.rotate(by: .random(in: 0...(2 * .pi), using: &rng))
      let r = CGRect(x: -d / 2, y: -d / 2, width: d, height: d)
      ctx.clip(to: r, mask: mask)
      ctx.draw(tile, in: CGRect(x: -patch.width / 2, y: -patch.height / 2, width: patch.width, height: patch.height))
      ctx.restoreGState()
    }
    // глибина: затемнення біля внутрішнього краю обідка
    let sh = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [CGColor(red: 0, green: 0, blue: 0, alpha: 0), CGColor(red: 0, green: 0, blue: 0, alpha: 0.65)] as CFArray, locations: [0.72, 1])!
    ctx.drawRadialGradient(sh, startCenter: CGPoint(x: o, y: o), startRadius: 0, endCenter: CGPoint(x: o, y: o), endRadius: rInner, options: [])
    ctx.restoreGState()
  }
  let img = ctx.makeImage()!
  try! NSBitmapImageRep(cgImage: img).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(out)/\(name).png"))
}
bowl("hookah-gold", patch: nil)
bowl("hookah-silver", patch: CGRect(x: 600, y: 365, width: 190, height: 180))   // червоний
bowl("hookah-platinum", patch: CGRect(x: 560, y: 630, width: 220, height: 180)) // чорний
