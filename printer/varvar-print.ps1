# VARVAR - print agent for receipt printer (Windows, PowerShell 5+)
# Polls the VARVAR server every 3 s, prints kitchen tickets and receipts on the printer via the Windows driver.
# Settings: varvar-print.config.json next to this file (api, key, printer).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfg = Get-Content -Raw -Encoding UTF8 (Join-Path $dir 'varvar-print.config.json') | ConvertFrom-Json
$logFile = Join-Path $dir 'varvar-print.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m" | Add-Content -Encoding UTF8 $logFile }

# single instance
$mutex = New-Object System.Threading.Mutex($false, 'Local\VARVAR-print')
if (-not $mutex.WaitOne(0)) { exit }

$logoBytes = [Convert]::FromBase64String('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')
$logo = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(,$logoBytes)))
# свіжий логотип із сайту (можна оновлювати без перевстановлення програми)
try { $lb = (New-Object Net.WebClient).DownloadData('https://666blackmuxa666.github.io/VARVAR/printer/logo.png'); $logo = [System.Drawing.Image]::FromStream((New-Object IO.MemoryStream(,$lb))) } catch { }

$W = 280          # printable width, 1/100 inch (~71 mm)
$fN = New-Object System.Drawing.Font('Arial', 9)
$fB = New-Object System.Drawing.Font('Arial', 9, [System.Drawing.FontStyle]::Bold)
$fT = New-Object System.Drawing.Font('Arial', 11, [System.Drawing.FontStyle]::Bold)
$fBig = New-Object System.Drawing.Font('Arial', 16, [System.Drawing.FontStyle]::Bold)
$sfC = New-Object System.Drawing.StringFormat; $sfC.Alignment = 'Center'
$sfR = New-Object System.Drawing.StringFormat; $sfR.Alignment = 'Far'

function Measure-Job($g, $lines) {
  $h = 0
  foreach ($l in $lines) {
    switch ($l[0]) {
      'logo' { $h += 130 }
      'big'  { $h += $g.MeasureString($l[1], $fBig, $W).Height + 2 }
      'hr'   { $h += 8 }
      'gap'  { $h += 14 }
      'lr2'  { $h += $fT.GetHeight($g) + 2 }
      'lr'   { $h += $fN.GetHeight($g) + 1 }
      default { $f = if ($l[0] -eq 'b') { $fB } else { $fN }; $h += $g.MeasureString($l[1], $f, $W).Height + 1 }
    }
  }
  return [int]$h + 10
}

function Draw-Job($g, $lines) {
  $y = 0
  foreach ($l in $lines) {
    switch ($l[0]) {
      'logo' { $lw = 120; $lh = [int]($logo.Height * $lw / $logo.Width); $g.DrawImage($logo, [int](($W - $lw) / 2), $y, $lw, $lh); $y += 130 }
      'big'  { $r = New-Object System.Drawing.RectangleF(0, $y, $W, 200); $g.DrawString($l[1], $fBig, [System.Drawing.Brushes]::Black, $r, $sfC); $y += $g.MeasureString($l[1], $fBig, $W).Height + 2 }
      'c'    { $r = New-Object System.Drawing.RectangleF(0, $y, $W, 200); $g.DrawString($l[1], $fN, [System.Drawing.Brushes]::Black, $r, $sfC); $y += $g.MeasureString($l[1], $fN, $W).Height + 1 }
      'hr'   { $p = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 1); $p.DashStyle = 'Dash'; $g.DrawLine($p, 0, $y + 4, $W, $y + 4); $y += 8 }
      'gap'  { $y += 14 }
      { $_ -eq 'lr' -or $_ -eq 'lr2' } {
        $f = if ($l[0] -eq 'lr2') { $fT } else { $fN }
        $g.DrawString($l[1], $f, [System.Drawing.Brushes]::Black, 0, $y)
        $r = New-Object System.Drawing.RectangleF(0, $y, $W, 100); $g.DrawString($l[2], $f, [System.Drawing.Brushes]::Black, $r, $sfR)
        $y += $f.GetHeight($g) + $(if ($l[0] -eq 'lr2') { 2 } else { 1 })
      }
      default { $f = if ($l[0] -eq 'b') { $fB } else { $fN }; $r = New-Object System.Drawing.RectangleF(0, $y, $W, 400); $g.DrawString($l[1], $f, [System.Drawing.Brushes]::Black, $r); $y += $g.MeasureString($l[1], $f, $W).Height + 1 }
    }
  }
}

function Print-Job($job) {
  $lines = @($job.lines | ForEach-Object { ,@($_) })
  $bmp = New-Object System.Drawing.Bitmap(10, 10); $mg = [System.Drawing.Graphics]::FromImage($bmp); $mg.PageUnit = 'Display'
  $height = Measure-Job $mg $lines; $mg.Dispose(); $bmp.Dispose()
  $doc = New-Object System.Drawing.Printing.PrintDocument
  $doc.PrinterSettings.PrinterName = $cfg.printer
  if (-not $doc.PrinterSettings.IsValid) { throw "Printer '$($cfg.printer)' not found" }
  $doc.DocumentName = "VARVAR $($job.kind)"
  $doc.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(4, 4, 4, 4)
  $doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('VARVAR', 315, [Math]::Max(200, $height + 20))
  $doc.OriginAtMargins = $true
  $doc.add_PrintPage({ param($s, $e) $e.Graphics.TextRenderingHint = 'SingleBitPerPixelGridFit'; Draw-Job $e.Graphics $lines; $e.HasMorePages = $false })
  $doc.Print(); $doc.Dispose()
}

Log "start, printer=$($cfg.printer)"
$done = @{}
while ($true) {
  try {
    $wc = New-Object Net.WebClient; $wc.Encoding = [Text.Encoding]::UTF8
    $r = $wc.DownloadString("$($cfg.api)/api/print/pull?key=$($cfg.key)") | ConvertFrom-Json
    # "$($cfg.api)/api/print/pull?key=$($cfg.key)" -TimeoutSec 15
    $ok = @()
    foreach ($job in $r.jobs) {
      if (-not $done.ContainsKey($job.id)) {
        try { Print-Job $job; $done[$job.id] = 1; Log "printed $($job.kind) $($job.id)" }
        catch { Log "print error $($job.id): $($_.Exception.Message)"; continue }
      }
      $ok += $job.id
    }
    if ($ok.Count) { Invoke-RestMethod -Method Post -Uri "$($cfg.api)/api/print/ack" -ContentType 'application/json' -Body (@{ key = $cfg.key; ids = $ok } | ConvertTo-Json) -TimeoutSec 15 | Out-Null }
    if ($done.Count -gt 500) { $done = @{} }
  } catch { Log "net error: $($_.Exception.Message)"; Start-Sleep 10 }
  Start-Sleep 3
}
