// Колірне вирівнювання фото страв: swift tools/colorfix.swift <out_dir> <strength 0..1> img/a.png img/b.png ...
// Рахує середній колір/яскравість/контраст кожного фото (лише непрозорі пікселі),
// бере спільну ціль = медіана по всіх, і мʼяко підтягує кожне фото до цілі.
import AppKit

struct Stats { var mean: [Double]; var lum: Double; var sd: Double }
func load(_ p: String) -> (CGImage, [UInt8]) {
  let img = NSBitmapImageRep(data: try! Data(contentsOf: URL(fileURLWithPath: p)))!.cgImage!
  let w = img.width, h = img.height
  var buf = [UInt8](repeating: 0, count: w * h * 4)
  let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
  return (img, buf)
}
func stats(_ b: [UInt8]) -> Stats {
  var s = [0.0, 0.0, 0.0], n = 0.0, l2 = 0.0
  for i in stride(from: 0, to: b.count, by: 4) where b[i + 3] > 200 {
    let a = Double(b[i + 3]) / 255
    let r = Double(b[i]) / a, g = Double(b[i + 1]) / a, bl = Double(b[i + 2]) / a
    s[0] += r; s[1] += g; s[2] += bl; n += 1
    let l = 0.299 * r + 0.587 * g + 0.114 * bl; l2 += l * l
  }
  let m = s.map { $0 / max(n, 1) }; let lum = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]
  return Stats(mean: m, lum: lum, sd: sqrt(max(0, l2 / max(n, 1) - lum * lum)))
}
func median(_ v: [Double]) -> Double { let s = v.sorted(); return s[s.count / 2] }

let a = CommandLine.arguments, out = a[1], k = Double(a[2])!, files = Array(a[3...])
let all = files.map { f -> (String, [UInt8], Int, Int, Stats) in let (img, b) = load(f); return (f, b, img.width, img.height, stats(b)) }
// ціль: медіанний відтінок (співвідношення каналів до яскравості), яскравість і контраст
let tChroma = (0..<3).map { c in median(all.map { $0.4.mean[c] / $0.4.lum }) }
let tLum = median(all.map { $0.4.lum }), tSd = median(all.map { $0.4.sd })

for (f, var b, w, h, st) in all {
  // множники каналів (баланс білого), зсув яскравості й контраст — з силою k
  // колір чіпаємо обережно: синя тарілка чи жовтий сир — не «відтінок», тож лише ±6% на канал
  let gain = (0..<3).map { c in min(1.06, max(0.94, pow(tChroma[c] / (st.mean[c] / st.lum), k * 0.5))) }
  let con = pow(tSd / max(st.sd, 1), k * 0.6), lumT = st.lum + (tLum - st.lum) * k
  for i in stride(from: 0, to: b.count, by: 4) where b[i + 3] > 0 {
    let al = Double(b[i + 3]) / 255
    for c in 0..<3 {
      var v = Double(b[i + c]) / al * gain[c]
      v = (v - st.lum) * con + lumT                 // контраст навколо середнього + нова яскравість
      b[i + c] = UInt8(max(0, min(255, v)) * al)
    }
  }
  let ctx = CGContext(data: &b, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  let name = URL(fileURLWithPath: f).lastPathComponent
  try! NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(out)/\(name)"))
  print(name, String(format: "lum %.0f→%.0f  rgb gain %.2f %.2f %.2f", st.lum, lumT, gain[0], gain[1], gain[2]))
}
