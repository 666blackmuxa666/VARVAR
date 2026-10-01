// Фото без фону: swift tools/cutout.swift <pdf> tools/crops.json img
// Вирізає кадр зі сторінки PDF, прибирає фон (Apple Vision) і зберігає прозорий PNG.
import PDFKit; import AppKit; import Vision; import CoreImage

let a = CommandLine.arguments
let d = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let crops = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[2]))) as! [[Any]]
let only = a.count > 4 ? Set(a[4].split(separator: ",").map(String.init)) : nil
var pages: [Int: CGImage] = [:]
let S: CGFloat = 2, MAX: CGFloat = 520
let ci = CIContext()

for c in crops {
  let id = c[0] as! String; let pg = c[1] as! Int
  if let only, !only.contains(id) { continue }
  let n = c[2...5].map { CGFloat(($0 as! NSNumber).doubleValue) * S }
  if pages[pg] == nil {
    let p = d.page(at: pg - 1)!; let b = p.bounds(for: .mediaBox); let k = 1300 * S / b.width
    pages[pg] = NSBitmapImageRep(data: p.thumbnail(of: NSSize(width: b.width * k, height: b.height * k), for: .mediaBox).tiffRepresentation!)!.cgImage!
  }
  let src = pages[pg]!.cropping(to: CGRect(x: n[0], y: n[1], width: n[2], height: n[3]))!
  var out = CIImage(cgImage: src)
  let req = VNGenerateForegroundInstanceMaskRequest()
  let h = VNImageRequestHandler(cgImage: src)
  if (try? h.perform([req])) != nil, let r = req.results?.first,
     let buf = try? r.generateMaskedImage(ofInstances: r.allInstances, from: h, croppedToInstancesExtent: true) {
    out = CIImage(cvPixelBuffer: buf)
  } else { print("no mask:", id) }
  let k = min(1, MAX / max(out.extent.width, out.extent.height))
  out = out.transformed(by: CGAffineTransform(scaleX: k, y: k))
  let cg = ci.createCGImage(out, from: out.extent)!
  try! NSBitmapImageRep(cgImage: cg).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[3])/\(id).png"))
}
