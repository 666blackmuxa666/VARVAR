// «Ставить» фото на поверхню: swift tools/shadow.swift <out_dir> img/a.png img/b.png ...
// мʼякі краї (розмиття альфи), контактна тінь-еліпс під обʼєктом і легка падаюча тінь.
import AppKit; import CoreImage

let ci = CIContext()
let a = CommandLine.arguments, out = a[1]
for f in a[2...] {
  let src = CIImage(contentsOf: URL(fileURLWithPath: f))!
  let W = src.extent.width, H = src.extent.height
  // межі обʼєкта за альфою
  let cg = ci.createCGImage(src, from: src.extent)!
  let w = cg.width, h = cg.height
  var buf = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
  var minX = w, maxX = 0, minY = h, maxY = 0   // рядки буфера — зверху вниз
  for y in 0..<h { for x in 0..<w where buf[(y * w + x) * 4 + 3] > 40 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) } }
  if maxX <= minX { continue }

  // обʼєкт трохи менше й вище, щоб тінь під ним вмістилась
  let k: CGFloat = 0.92
  var obj = src.transformed(by: CGAffineTransform(translationX: -W / 2, y: -H / 2))
              .transformed(by: CGAffineTransform(scaleX: k, y: k))
              .transformed(by: CGAffineTransform(translationX: W / 2, y: H / 2 + H * 0.03))
  // мʼякі краї: альфа злегка розмита
  let alpha = obj.applyingFilter("CIColorMatrix", parameters: ["inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0), "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0), "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0), "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1)])
  let soft = alpha.applyingGaussianBlur(sigma: 0.9).cropped(to: src.extent)
  obj = obj.applyingFilter("CIBlendWithAlphaMask", parameters: ["inputBackgroundImage": CIImage.empty(), "inputMaskImage": soft])

  // падаюча тінь: силует, вниз, розмитий, 45%
  let drop = alpha.applyingFilter("CIColorMatrix", parameters: ["inputAVector": CIVector(x: 0, y: 0, z: 0, w: 0.75)])
                 .transformed(by: CGAffineTransform(translationX: 0, y: -H * 0.025)).applyingGaussianBlur(sigma: 12)

  // контактна тінь: еліпс під нижнім краєм обʼєкта (координати CI — знизу вгору)
  let cx = W / 2 + ((CGFloat(minX + maxX) / 2) - W / 2) * k
  let objW = CGFloat(maxX - minX) * k
  let bottom = H / 2 + H * 0.03 - (CGFloat(maxY) - H / 2) * k
  let ew = objW * 0.95, eh = max(14, objW * 0.13)
  let ellipse = CIFilter(name: "CIRadialGradient", parameters: ["inputCenter": CIVector(x: 0, y: 0), "inputRadius0": 0, "inputRadius1": 50,
    "inputColor0": CIColor(red: 0, green: 0, blue: 0, alpha: 0.95), "inputColor1": CIColor(red: 0, green: 0, blue: 0, alpha: 0)])!.outputImage!
    .cropped(to: CGRect(x: -50, y: -50, width: 100, height: 100))
    .transformed(by: CGAffineTransform(scaleX: ew / 100, y: eh / 100))
    .transformed(by: CGAffineTransform(translationX: cx, y: bottom + eh * 0.15))
    .applyingGaussianBlur(sigma: 4)

  let canvas = CIImage(color: .clear).cropped(to: src.extent)
  let res = obj.composited(over: drop.composited(over: ellipse.composited(over: canvas))).cropped(to: src.extent)
  let outCG = ci.createCGImage(res, from: src.extent, format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())!
  try! NSBitmapImageRep(cgImage: outCG).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(out)/\(URL(fileURLWithPath: f).lastPathComponent)"))
}
