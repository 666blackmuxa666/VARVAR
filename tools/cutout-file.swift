// Фото без фону з довільного файлу: swift tools/cutout-file.swift <out_dir> photo1.jpg photo2.heic ...
// Обʼєкт = те, що переважно в центральній частині кадру (60%); фон і сусідні предмети відкидаються.
// Результат — <out_dir>/<імʼя файлу>.png, квадрат 640 з тим самим масштабом, що й фото з PDF.
import AppKit; import Vision; import CoreImage

let a = CommandLine.arguments
let CANVAS = 640, FILL: CGFloat = 0.9
let ci = CIContext()
for f in a[2...] {
  let url = URL(fileURLWithPath: f)
  guard let srcCI = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]) else { print("не відкрив:", f); continue }
  let src = ci.createCGImage(srcCI, from: srcCI.extent)!
  let id = url.deletingPathExtension().lastPathComponent
  let innerN = CGRect(x: 0.2, y: 0.2, width: 0.6, height: 0.6)
  var out: CIImage
  let req = VNGenerateForegroundInstanceMaskRequest()
  let h = VNImageRequestHandler(cgImage: src)
  if (try? h.perform([req])) != nil, let r = req.results?.first {
    // підрахунок пікселів кожного обʼєкта всередині/поза початковим кадром
    let m = r.instanceMask
    CVPixelBufferLockBaseAddress(m, .readOnly)
    let mw = CVPixelBufferGetWidth(m), mh = CVPixelBufferGetHeight(m), row = CVPixelBufferGetBytesPerRow(m)
    let base = CVPixelBufferGetBaseAddress(m)!.assumingMemoryBound(to: UInt8.self)
    var inside = [Int](repeating: 0, count: 256), total = [Int](repeating: 0, count: 256)
    let x0 = Int(innerN.minX * CGFloat(mw)), x1 = Int(innerN.maxX * CGFloat(mw))
    let y0 = Int(innerN.minY * CGFloat(mh)), y1 = Int(innerN.maxY * CGFloat(mh))
    for y in 0..<mh { for x in 0..<mw {
      let l = Int(base[y * row + x]); if l == 0 { continue }
      total[l] += 1; if x >= x0 && x < x1 && y >= y0 && y < y1 { inside[l] += 1 }
    } }
    CVPixelBufferUnlockBaseAddress(m, .readOnly)
    var keep = IndexSet()
    for l in r.allInstances where total[l] > 0 && Double(inside[l]) / Double(total[l]) >= 0.6 { keep.insert(l) }
    if keep.isEmpty, let best = r.allInstances.max(by: { inside[$0] < inside[$1] }) { keep.insert(best) }
    if let buf = try? r.generateMaskedImage(ofInstances: keep, from: h, croppedToInstancesExtent: true) {
      out = CIImage(cvPixelBuffer: buf)
    } else { print("mask fail:", id); out = CIImage(cgImage: src) }
  } else { print("no mask:", id); out = CIImage(cgImage: src) }

  // однаковий масштаб: обʼєкт вписується в FILL частину квадратного полотна, по центру
  let side = CGFloat(CANVAS) * FILL
  let k = side / max(out.extent.width, out.extent.height)
  out = out.transformed(by: CGAffineTransform(translationX: -out.extent.minX, y: -out.extent.minY))
           .transformed(by: CGAffineTransform(scaleX: k, y: k))
  let ox = (CGFloat(CANVAS) - out.extent.width) / 2, oy = (CGFloat(CANVAS) - out.extent.height) / 2
  out = out.transformed(by: CGAffineTransform(translationX: ox, y: oy))
  let canvas = CIImage(color: .clear).cropped(to: CGRect(x: 0, y: 0, width: CANVAS, height: CANVAS))
  let cg = ci.createCGImage(out.composited(over: canvas), from: canvas.extent, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())!
  try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[1])/\(id).png"))
  print("ok", id)
}
