// swift tools/crop.swift <pdf> tools/crops.json img
import PDFKit; import AppKit
let a = CommandLine.arguments
let d = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let crops = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[2]))) as! [[Any]]
var pages: [Int: NSBitmapImageRep] = [:]
let S: CGFloat = 2 // рендер 2600px
for c in crops {
  let id = c[0] as! String; let pg = c[1] as! Int
  let n = c[2...5].map { CGFloat(($0 as! NSNumber).doubleValue) * S }
  if pages[pg] == nil { let p = d.page(at: pg-1)!; let b = p.bounds(for: .mediaBox); let k = 1300*S/b.width
    pages[pg] = NSBitmapImageRep(data: p.thumbnail(of: NSSize(width: b.width*k, height: b.height*k), for: .mediaBox).tiffRepresentation!)! }
  let src = pages[pg]!.cgImage!.cropping(to: CGRect(x: n[0], y: n[1], width: n[2], height: n[3]))!
  let m: CGFloat = 520; let k = min(1, m / max(n[2], n[3]))
  let w = Int(n[2]*k), h = Int(n[3]*k)
  let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.interpolationQuality = .high; ctx.draw(src, in: CGRect(x: 0, y: 0, width: w, height: h))
  let out = NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .jpeg, properties: [.compressionFactor: 0.72])!
  try! out.write(to: URL(fileURLWithPath: "\(a[3])/\(id).jpg"))
}
