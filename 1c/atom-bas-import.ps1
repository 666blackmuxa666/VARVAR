# ATOM → BAS / 1С: завантаження продажів (CSV «📗 BAS» з ATOM: 📊 Звіти → 📤 Бухгалтеру) у документи «Звіт про роздрібні продажі».
# Один день = один документ, НЕ ПРОВЕДЕНИЙ — бухгалтер перевіряє й проводить сам. Повторний запуск той самий день не дублює (мітка «ATOM дата» в коментарі).
# Без -Write лише ПЕРЕВІРЯЄ: що створить і яких позицій номенклатури бракує. З -Write — записує (нові позиції — у групу «ATOM»).
# Пароль 1С вводите ви — нікуди не надсилається й не зберігається.
param([string]$Csv = '', [string]$Base = '', [string]$Server = '', [string]$Ref = '', [string]$User = '', [string]$Org = '', [string]$Store = '', [switch]$Write, [switch]$Wow)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$inv = [Globalization.CultureInfo]::InvariantCulture

# ---------- файл з ATOM ----------
if (-not $Csv) { $Csv = (Read-Host 'Шлях до файлу bas-prodazhi-....csv (можна перетягнути файл у це вікно)').Trim('"', ' ') }
if (-not (Test-Path $Csv)) { Write-Host "❌ Немає файлу: $Csv" -ForegroundColor Red; Read-Host 'Enter — вихід'; exit 1 }
$rows = Get-Content $Csv -Encoding UTF8 | Select-Object -Skip 1 | Where-Object { $_ } | ForEach-Object {
  $c = [regex]::Matches($_, '("([^"]|"")*"|[^;]*)(;|$)') | Where-Object { $_.Length -gt 0 } | ForEach-Object { $_.Groups[1].Value -replace '^"|"$', '' -replace '""', '"' }
  [pscustomobject]@{ D = $c[0]; N = $c[1]; Q = [double]::Parse($c[2], $inv); S = [double]::Parse($c[3], $inv); R = $c[4]; V = $(if ($c[5]) { [double]::Parse($c[5], $inv) } else { 0 }) }
}
$days = $rows | Group-Object D | Sort-Object Name
Write-Host "Файл: $($rows.Count) рядків, днів: $($days.Count)"

# ---------- COM-зʼєднувач (64/32 біт) ----------
$com = $null
foreach ($p in 'V83.COMConnector', 'V82.COMConnector') { try { $com = New-Object -ComObject $p; break } catch {} }
if (-not $com) {
  $ps32 = "$env:WINDIR\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
  if (-not $Wow -and [Environment]::Is64BitProcess -and (Test-Path $ps32)) {
    Write-Host 'Пробую 32-бітний режим (1С встановлена 32-біт)...'
    $a = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-Wow', '-Csv', $Csv)
    foreach ($k in 'Base', 'Server', 'Ref', 'User', 'Org', 'Store') { $v = Get-Variable $k -ValueOnly; if ($v) { $a += "-$k"; $a += $v } }
    if ($Write) { $a += '-Write' }
    & $ps32 @a; exit $LASTEXITCODE
  }
  Write-Host "`n❌ Не знайдено COM-зʼєднувач 1С. Запустіть там, де стоїть BAS / 1С (див. atom-1c-export.ps1 — та сама вимога)." -ForegroundColor Red
  Read-Host 'Enter — вихід'; exit 1
}
if (-not $Base -and -not $Server) {
  $list = @(); $cur = $null; $v8i = "$env:APPDATA\1C\1CEStart\ibases.v8i"
  if (Test-Path $v8i) { foreach ($l in Get-Content $v8i -Encoding UTF8) { if ($l -match '^\[(.+)\]$') { $cur = @{ n = $Matches[1] } } elseif ($cur -and $l -match '^Connect=(.+)$') { $cur.c = $Matches[1].Trim(); $list += $cur; $cur = $null } } }
  if ($list.Count) { Write-Host "`nБази на цьому компʼютері:"; for ($i = 0; $i -lt $list.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $list[$i].n) }; $conn = $list[[int](Read-Host 'Номер бази') - 1].c.TrimEnd(';') }
  else { $Base = Read-Host 'Шлях до папки файлової бази (де лежить 1Cv8.1CD)' }
}
if ($Base) { $conn = "File=`"$Base`"" } elseif ($Server) { $conn = "Srvr=`"$Server`";Ref=`"$Ref`"" }
if (-not $User) { $User = Read-Host 'Користувач (Enter — без користувача)' }
if ($User) {
  $sec = Read-Host 'Пароль (не показується)' -AsSecureString
  $pw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $conn += ";Usr=`"$($User -replace '"','""')`";Pwd=`"$($pw -replace '"','""')`""
}
Write-Host "`nПідключаюсь (до хвилини)..."
try { $v8 = $com.Connect($conn + ';') } catch { Write-Host "❌ Не вдалося підключитись: $($_.Exception.Message)" -ForegroundColor Red; Read-Host 'Enter — вихід'; exit 1 }
$pw = $null; $conn = $null
$md = $v8.Metadata
Write-Host "База: $($md.Synonym) $($md.Version)"

# ---------- помічники COM ----------
function G($o, $n) { [System.__ComObject].InvokeMember($n, 'GetProperty', $null, $o, $null) }
function P($o, $n, $v) { [void][System.__ComObject].InvokeMember($n, 'SetProperty', $null, $o, @($v)) }
function M($o, $n, $a = @()) { [System.__ComObject].InvokeMember($n, 'InvokeMethod', $null, $o, [object[]]$a) }
function Has($coll, $name) { try { return [bool]$coll.Find($name) } catch { return $false } }
function Pick($coll, $names) { foreach ($n in $names) { if (Has $coll $n) { return $n } }; return $null }
function Empty($r) { try { return [bool](M $r 'IsEmpty') } catch { return $true } }
function Stop1($t) { Write-Host "❌ $t" -ForegroundColor Red; Read-Host 'Enter — вихід'; exit 1 }

$doc = Pick $md.Documents @('ОтчетОРозничныхПродажах', 'ЗвітПроРоздрібніПродажі', 'ОтчетОРозничныхПродажахККМ', 'ОтчетККМ')
if (-not $doc) { Stop1 'У базі немає документа «Звіт про роздрібні продажі». Надішліть у підтримку ATOM structure.txt з atom-1c-export.ps1.' }
$dm = $md.Documents.Find($doc); $ts = Pick $dm.TabularSections @('Товары', 'Товари')
if (-not $ts) { Stop1 "Документ $doc без табличної частини «Товари»." }
$ta = $dm.TabularSections.Find($ts).Attributes
$f = @{ nom = Pick $ta @('Номенклатура'); q = Pick $ta @('Количество', 'Кількість'); p = Pick $ta @('Цена', 'Ціна'); s = Pick $ta @('Сумма', 'Сума'); r = Pick $ta @('СтавкаНДС', 'СтавкаПДВ'); v = Pick $ta @('СуммаНДС', 'СумаПДВ') }
if (-not $f.nom -or -not $f.q -or -not $f.s) { Stop1 "У «$ts» не знайдено Номенклатура / Кількість / Сума." }
$da = $dm.Attributes
$nomC = 'Номенклатура'; $catalogs = G $v8 'Catalogs'; $nm = G $catalogs $nomC; $docs = G (G $v8 'Documents') $doc

# організація й склад: за назвою (-Org / -Store) або перша в довіднику
function Ref1($cat, $name) {
  if (-not (Has $md.Catalogs $cat)) { return $null }; $mg = G $catalogs $cat
  if ($name) { $r = M $mg 'FindByDescription' @($name, $true); if (-not (Empty $r)) { return $r }; Write-Host "⚠️ «$name» не знайдено в $cat — беру першу" }
  $q = $v8.NewObject('Query'); $q.Text = "ВЫБРАТЬ ПЕРВЫЕ 1 Т.Ссылка ИЗ Справочник.$cat КАК Т ГДЕ НЕ Т.ПометкаУдаления" + $(if ($md.Catalogs.Find($cat).Hierarchical) { ' И НЕ Т.ЭтоГруппа' } else { '' })
  $s = $q.Execute().Select(); if ($s.Next()) { return $s.Get(0) }; return $null
}
$orgA = Pick $da @('Организация', 'Організація'); $stA = Pick $da @('Склад'); $inclA = Pick $da @('СуммаВключаетНДС', 'СумаВключаєПДВ'); $comA = Pick $da @('Комментарий', 'Коментар')
$orgR = if ($orgA) { Ref1 (Pick $md.Catalogs @('Организации', 'Організації')) $Org }; $stR = if ($stA) { Ref1 (Pick $md.Catalogs @('Склады', 'Склади')) $Store }
Write-Host "Документ: $doc · Організація: $(if ($orgR) { G $orgR 'Наименование' } else { '—' }) · Склад: $(if ($stR) { G $stR 'Наименование' } else { '—' })"

# ставка ПДВ: перелік у базі (20 % / без ПДВ)
$rate = @{}
if ($f.r) { foreach ($en in @('СтавкиНДС', 'СтавкиПДВ')) { if (Has $md.Enums $en) { $e = G (G $v8 'Enums') $en
  foreach ($k in @('НДС20', 'ПДВ20')) { try { $rate['20'] = G $e $k; break } catch {} }
  foreach ($k in @('БезНДС', 'БезПДВ', 'НеНДС', 'НеПДВ')) { try { $rate['без ПДВ'] = G $e $k; break } catch {} }; break } } }

# номенклатура: шукаємо за назвою; бракує — створюємо (лише з -Write) у групі «ATOM»
$cache = @{}; $miss = New-Object Collections.Generic.List[string]; $grp = $null
function Item($n) {
  if ($cache.ContainsKey($n)) { return $cache[$n] }
  $r = M $nm 'FindByDescription' @($n, $true)
  if (Empty $r) {
    $miss.Add($n); if (-not $Write) { $cache[$n] = $null; return $null }
    if ($md.Catalogs.Find($nomC).Hierarchical -and -not $script:grp) { $g = M $nm 'FindByDescription' @('ATOM', $true); if (Empty $g) { $o = M $nm 'CreateFolder'; P $o 'Наименование' 'ATOM'; M $o 'Write' | Out-Null; $g = G $o 'Ссылка' }; $script:grp = $g }
    $o = M $nm 'CreateItem'; P $o 'Наименование' $n; if ($script:grp) { P $o 'Родитель' $script:grp }
    try { $na = $md.Catalogs.Find($nomC).Attributes; $ua = Pick $na @('БазоваяЕдиницаИзмерения', 'ЕдиницаИзмерения', 'ОсновнаяЕдиница'); if ($ua) { $uc = Pick $md.Catalogs @('КлассификаторЕдиницИзмерения', 'ЕдиницыИзмерения'); if ($uc) { $u = M (G $catalogs $uc) 'FindByDescription' @('шт', $true); if (-not (Empty $u)) { P $o $ua $u } } } } catch {}
    M $o 'Write' | Out-Null; $r = G $o 'Ссылка'
  }
  $cache[$n] = $r; return $r
}

# ---------- по днях ----------
$made = 0; $skip = 0
foreach ($d in $days) {
  $tag = "ATOM $($d.Name)"; $q = $v8.NewObject('Query')
  $q.Text = "ВЫБРАТЬ ПЕРВЫЕ 1 Д.Ссылка ИЗ Документ.$doc КАК Д ГДЕ ПОДСТРОКА(Д.$comA, 1, 20) ПОДОБНО &K И НЕ Д.ПометкаУдаления"; $q.SetParameter('K', "$tag%")
  if ($comA -and $q.Execute().Select().Next()) { Write-Host "⏭ $($d.Name): уже є документ з міткою «$tag»"; $skip++; continue }
  $sum = ($d.Group | Measure-Object S -Sum).Sum
  $lines = foreach ($x in $d.Group) { , @($x, (Item $x.N)) }
  if (-not $Write) { Write-Host ("🔎 {0}: {1} позицій, {2:0.00} грн — буде створено (непроведений)" -f $d.Name, $d.Group.Count, $sum); continue }
  $o = M $docs 'CreateDocument'; P $o 'Дата' ([datetime]::ParseExact($d.Name, 'yyyy-MM-dd', $inv).AddHours(23))
  if ($orgR) { P $o $orgA $orgR }; if ($stR) { P $o $stA $stR }; if ($inclA) { P $o $inclA $true }
  if ($comA) { P $o $comA "$tag · завантажено з ATOM, перевірте й проведіть" }
  $tab = G $o $ts
  foreach ($l in $lines) { $x = $l[0]; $t = M $tab 'Add'; P $t $f.nom $l[1]; P $t $f.q $x.Q; if ($f.p -and $x.Q) { P $t $f.p ([math]::Round($x.S / $x.Q, 2)) }; P $t $f.s $x.S
    if ($f.r -and $rate[$x.R]) { P $t $f.r $rate[$x.R] }; if ($f.v) { P $t $f.v $x.V } }
  try { M $o 'Write' | Out-Null; $made++; Write-Host ("✅ {0}: {1} позицій, {2:0.00} грн" -f $d.Name, $d.Group.Count, $sum) } catch { Write-Host "❌ $($d.Name): $($_.Exception.InnerException.Message)$($_.Exception.Message)" -ForegroundColor Red }
}
$u = $miss | Sort-Object -Unique
if ($u) { Write-Host "`n$(if ($Write) { '➕ Створено в номенклатурі (група ATOM)' } else { '⚠️ Немає в номенклатурі — буде створено в групі ATOM' }): $($u.Count)"; $u | ForEach-Object { Write-Host "   · $_" } }
if ($Write) { Write-Host "`n✅ Створено документів: $made, пропущено (вже були): $skip. Відкрийте BAS → «Звіти про роздрібні продажі», перевірте й проведіть." -ForegroundColor Green }
else { Write-Host "`nЦе була перевірка — нічого не записано. Щоб записати, запустіть з -Write." -ForegroundColor Yellow }
Read-Host 'Enter — закрити'
