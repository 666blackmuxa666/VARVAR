// Фото без фону: swift tools/cutout.swift <pdf> tools/crops.json img [id1,id2]
// 1) бере кадр зі сторінки PDF із запасом (щоб не різати краї страви)
// 2) Apple Vision знаходить обʼєкти; лишаємо лише ті, що переважно всередині початкового кадру
//    (сусідні декорації — листя, авокадо, текст — відкидаються)
// 3) кладе обʼєкт по центру квадратного прозорого полотна однакового розміру → всі фото одного масштабу
import PDFKit; import AppKit; import Vision; import CoreImage

let a = CommandLine.arguments
let d = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let crops = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[2]))) as! [[Any]]
let only = a.count > 4 ? Set(a[4].split(separator: ",").map(String.init)) : nil
let S: CGFloat = 3          // рендер 3900px по ширині
let PAD: CGFloat = 0.18     // запас навколо кадру
let CANVAS = 640, FILL: CGFloat = 0.9
let ci = CIContext()
var pages: [Int: CGImage] = [:]

func page(_ pg: Int) -> CGImage {
  if let p = pages[pg] { return p }
  pages = [:] // тримаємо в памʼяті одну сторінку
  let p = d.page(at: pg - 1)!; let b = p.bounds(for: .mediaBox); let k = 1300 * S / b.width
  let w = Int(b.width * k), h = Int(b.height * k)
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.setFillColor(.black); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.scaleBy(x: k, y: k); p.draw(with: .mediaBox, to: ctx)
  pages[pg] = ctx.makeImage()!
  return pages[pg]!
}

for c in crops {
  let id = c[0] as! String; let pg = c[1] as! Int
  if let only, !only.contains(id) { continue }
  let n = c[2...5].map { CGFloat(($0 as! NSNumber).doubleValue) * S }
  let img = page(pg)
  let W = CGFloat(img.width), H = CGFloat(img.height)
  let inner = CGRect(x: n[0], y: n[1], width: n[2], height: n[3])
  let px = n[2] * PAD, py = n[3] * PAD
  let outer = inner.insetBy(dx: -px, dy: -py).intersection(CGRect(x: 0, y: 0, width: W, height: H)).integral
  let src = img.cropping(to: outer)!
  // початковий кадр у координатах вирізки (0..1)
  let innerN = CGRect(x: (inner.minX - outer.minX) / outer.width, y: (inner.minY - outer.minY) / outer.height,
                      width: inner.width / outer.width, height: inner.height / outer.height)

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
  try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[3])/\(id).png"))
  print("ok", id, keep_count(out))
}
func keep_count(_ i: CIImage) -> String { "\(Int(i.extent.width))x\(Int(i.extent.height))" }
