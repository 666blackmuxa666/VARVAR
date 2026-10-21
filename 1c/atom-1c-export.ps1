# ATOM: вивантаження з 1С / BAS у файли для майстра «📥 Перехід» (кабінет → заклад → Перехід).
# Лише ЧИТАЄ базу (жодних записів). Пароль 1С вводите ви — нікуди не надсилається й не зберігається.
# Результат: папка на робочому столі з menu.csv, ing.csv, cards.csv, sup.csv, cli.csv (+ structure.txt і log.txt для підтримки).
# Структура бази визначається автоматично (1С:Ресторан, УТ, БП, BAS, саморобні) — що не знайдено, пропускається.
param([string]$Base = '', [string]$Server = '', [string]$Ref = '', [string]$User = '', [switch]$Wow)
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$inv = [Globalization.CultureInfo]::InvariantCulture

# ---------- COM-зʼєднувач (64/32 біт) ----------
$com = $null
foreach ($p in 'V83.COMConnector', 'V82.COMConnector') { try { $com = New-Object -ComObject $p; break } catch {} }
if (-not $com) {
  $ps32 = "$env:WINDIR\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
  if (-not $Wow -and [Environment]::Is64BitProcess -and (Test-Path $ps32)) {
    Write-Host 'Пробую 32-бітний режим (1С встановлена 32-біт)...'
    $a = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-Wow')
    foreach ($k in 'Base', 'Server', 'Ref', 'User') { $v = Get-Variable $k -ValueOnly; if ($v) { $a += "-$k"; $a += $v } }
    & $ps32 @a; exit $LASTEXITCODE
  }
  $dll = Get-ChildItem "$env:ProgramFiles\1cv8\*\bin\comcntr.dll", "${env:ProgramFiles(x86)}\1cv8\*\bin\comcntr.dll" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1
  Write-Host "`n❌ Не знайдено COM-зʼєднувач 1С." -ForegroundColor Red
  if ($dll) { Write-Host "Запустіть від імені адміністратора:`n  regsvr32 `"$($dll.FullName)`"`nі повторіть." } else { Write-Host 'На цьому компʼютері не знайдено 1С 8.x. Запустіть скрипт там, де стоїть 1С.' }
  Read-Host 'Enter — вихід'; exit 1
}

# ---------- яку базу відкрити ----------
if (-not $Base -and -not $Server) {
  $list = @(); $cur = $null
  $v8i = "$env:APPDATA\1C\1CEStart\ibases.v8i"
  if (Test-Path $v8i) {
    foreach ($l in Get-Content $v8i -Encoding UTF8) {
      if ($l -match '^\[(.+)\]$') { $cur = @{ n = $Matches[1] } }
      elseif ($cur -and $l -match '^Connect=(.+)$') { $cur.c = $Matches[1].Trim(); $list += $cur; $cur = $null }
    }
  }
  if ($list.Count) {
    Write-Host "`nБази 1С на цьому компʼютері:"
    for ($i = 0; $i -lt $list.Count; $i++) { Write-Host ("  {0}. {1}" -f ($i + 1), $list[$i].n) }
    $n = [int](Read-Host 'Номер бази')
    $conn = $list[$n - 1].c.TrimEnd(';')
  } else { $Base = Read-Host 'Шлях до папки файлової бази 1С (де лежить 1Cv8.1CD)' }
}
if ($Base) { $conn = "File=`"$Base`"" } elseif ($Server) { $conn = "Srvr=`"$Server`";Ref=`"$Ref`"" }
if (-not $User) { $User = Read-Host 'Користувач 1С (Enter — без користувача)' }
if ($User) {
  $sec = Read-Host 'Пароль 1С (не показується)' -AsSecureString
  $pw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $conn += ";Usr=`"$($User -replace '"','""')`";Pwd=`"$($pw -replace '"','""')`""
}
Write-Host "`nПідключаюсь до 1С (це може тривати до хвилини)..."
try { $v8 = $com.Connect($conn + ';') } catch { Write-Host "❌ Не вдалося підключитись: $($_.Exception.Message)" -ForegroundColor Red; Read-Host 'Enter — вихід'; exit 1 }
$pw = $null; $conn = $null

$out = Join-Path ([Environment]::GetFolderPath('Desktop')) ('ATOM-1C-' + (Get-Date -Format 'yyyy-MM-dd_HHmm'))
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = New-Object Collections.Generic.List[string]
function Log($s) { Write-Host $s; $log.Add($s) }
$md = $v8.Metadata
Log "База: $($md.Synonym) ($($md.Name)) $($md.Version)"

# ---------- помічники ----------
function Num($x) { if ($null -eq $x -or $x -is [string]) { return "$x" }; try { return ([double]$x).ToString('0.###', $inv) } catch { return "$x" } }
function Cell($x) { $s = "$x" -replace '[\r\n]+', ' '; if ($s -match '[;"]') { '"' + ($s -replace '"', '""') + '"' } else { $s } }
function Save($file, $head, $rows) {
  $sb = New-Object Text.StringBuilder; [void]$sb.AppendLine(($head | ForEach-Object { Cell $_ }) -join ';')
  foreach ($r in $rows) { [void]$sb.AppendLine(($r | ForEach-Object { Cell $_ }) -join ';') }
  [IO.File]::WriteAllText((Join-Path $out $file), $sb.ToString(), (New-Object Text.UTF8Encoding $true))
}
# виконує перший варіант запиту, що спрацював; повертає масив рядків з полями $fields
function Q($texts, $fields) {
  foreach ($t in @($texts)) {
    try {
      $q = $v8.NewObject('Query'); $q.Text = $t; $sel = $q.Execute().Select(); $res = New-Object Collections.Generic.List[object]
      while ($sel.Next()) { $o = @{}; for ($j = 0; $j -lt $fields.Count; $j++) { $o[$fields[$j]] = $sel.Get($j) }; $res.Add($o) } # поля — у порядку ВЫБРАТЬ
      return , $res
    } catch { $script:lastErr = $_.Exception.Message }
  }
  return $null
}
function Has($coll, $name) { try { return [bool]$coll.Find($name) } catch { return $false } }
function Pick($coll, $names) { foreach ($n in $names) { if (Has $coll $n) { return $n } }; return $null }
function Each($coll) { $r = @(); for ($i = 0; $i -lt $coll.Count(); $i++) { $r += $coll.Get($i) }; return $r }

$nom = Pick $md.Catalogs @('Номенклатура', 'Номенклатуры', 'Товары', 'Номенклатура_Ресторан')
$unitF = if ($nom) { Pick ($md.Catalogs.Find($nom).Attributes) @('БазоваяЕдиницаИзмерения', 'ЕдиницаИзмерения', 'ЕдиницаХраненияОстатков', 'ОсновнаяЕдиница') }
$U = if ($unitF) { "ПРЕДСТАВЛЕНИЕ(Н.$unitF)" } else { '""' }

# ---------- 1. Номенклатура + ціни → menu.csv ----------
$items = @{}
if ($nom) {
  $r = Q "ВЫБРАТЬ Н.Ссылка КАК R, Н.Код КАК Code, Н.Наименование КАК Name, ПРЕДСТАВЛЕНИЕ(Н.Родитель) КАК Grp, $U КАК Unit ИЗ Справочник.$nom КАК Н ГДЕ НЕ Н.ЭтоГруппа И НЕ Н.ПометкаУдаления" @('R', 'Code', 'Name', 'Grp', 'Unit')
  if ($r) { foreach ($x in $r) { $items["$($x.Code)|$($x.Name)"] = $x }; Log "✅ Номенклатура: $($r.Count) позицій (Справочник.$nom)" } else { Log "⚠️ Номенклатура не прочиталась: $lastErr" }
} else { Log '⚠️ Довідник номенклатури не знайдено (див. structure.txt)' }

$price = @{}
$pReg = Pick $md.InformationRegisters @('ЦеныНоменклатуры', 'ЦеныНоменклатуры25', 'Цены', 'ЦеныБлюд', 'ЦеныПродажи')
if ($pReg) {
  $kindF = Pick ($md.InformationRegisters.Find($pReg).Dimensions) @('ВидЦены', 'ТипЦен', 'ТипЦены')
  $kq = if ($kindF) { "ПРЕДСТАВЛЕНИЕ(Ц.$kindF)" } else { '""' }
  $r = Q @("ВЫБРАТЬ Ц.Номенклатура.Код КАК Code, Ц.Номенклатура.Наименование КАК Name, Ц.Цена КАК Price, $kq КАК Kind ИЗ РегистрСведений.$pReg.СрезПоследних КАК Ц",
           "ВЫБРАТЬ Ц.Номенклатура.Код КАК Code, Ц.Номенклатура.Наименование КАК Name, Ц.Цена КАК Price, $kq КАК Kind ИЗ РегистрСведений.$pReg КАК Ц") @('Code', 'Name', 'Price', 'Kind')
  if ($r) {
    foreach ($x in $r) { # роздрібна/продажна ціна має перевагу над закупівельною
      $k = "$($x.Code)|$($x.Name)"; $good = "$($x.Kind)" -match 'розн|роздр|продаж|меню|зал|гост' -or -not $x.Kind
      if (-not $price.ContainsKey($k) -or ($good -and -not $price[$k].g)) { $price[$k] = @{ p = $x.Price; g = $good } }
    }
    Log "✅ Ціни: $($price.Count) (РегистрСведений.$pReg)"
  } else { Log "⚠️ Ціни не прочитались: $lastErr" }
} else { Log '⚠️ Регістр цін не знайдено — меню без цін (впишете в ATOM)' }
$menu = foreach ($k in $price.Keys) { $i = $items[$k]; if ($price[$k].p -gt 0) { , @(($k -split '\|')[0], $(if ($i) { $i.Grp } else { '' }), ($k -split '\|', 2)[1], (Num $price[$k].p), '') } }
Save 'menu.csv' @('Код', 'Група', 'Назва', 'Ціна', 'Вихід') $menu
Log "   → menu.csv: $(@($menu).Count) рядків"

# ---------- 2. Залишки → ing.csv ----------
$ing = @(); $done = $false
$regs = @('ТоварыНаСкладах', 'ТоварыОрганизаций', 'ОстаткиТоваров', 'ТоварыНаМестахХранения', 'ТоварыВРознице', 'ПартииТоваровНаСкладах') + (Each $md.AccumulationRegisters | ForEach-Object { $_.Name })
foreach ($rn in ($regs | Select-Object -Unique)) {
  $reg = $md.AccumulationRegisters.Find($rn); if (-not $reg) { continue }
  if (-not (Has $reg.Dimensions 'Номенклатура') -or -not (Has $reg.Resources 'Количество')) { continue }
  $wf = Pick $reg.Dimensions @('Склад', 'МестоХранения', 'Подразделение')
  $w = if ($wf) { "ПРЕДСТАВЛЕНИЕ(Т.$wf)" } else { '""' }; $g = if ($wf) { ", Т.$wf" } else { '' }
  $uu = if ($unitF) { "ПРЕДСТАВЛЕНИЕ(Т.Номенклатура.$unitF)" } else { '""' }
  $r = Q "ВЫБРАТЬ Т.Номенклатура.Код КАК Code, Т.Номенклатура.Наименование КАК Name, $uu КАК Unit, ПРЕДСТАВЛЕНИЕ(Т.Номенклатура.Родитель) КАК Grp, $w КАК Wh, СУММА(Т.КоличествоОстаток) КАК Qty ИЗ РегистрНакопления.$rn.Остатки КАК Т СГРУППИРОВАТЬ ПО Т.Номенклатура$g" @('Code', 'Name', 'Unit', 'Grp', 'Wh', 'Qty')
  if ($r -and $r.Count) { $ing = foreach ($x in $r) { if ($x.Qty -ne 0) { , @($x.Code, $x.Name, $x.Unit, $x.Grp, $x.Wh, (Num $x.Qty)) } }; Log "✅ Залишки: $(@($ing).Count) (РегистрНакопления.$rn)"; $done = $true; break }
}
if (-not $done) { Log '⚠️ Регістр залишків не знайдено — вивантажу довідник продуктів без кількості' }
if (-not $done -and $items.Count) { $ing = foreach ($x in $items.Values) { if (-not $price.ContainsKey("$($x.Code)|$($x.Name)")) { , @($x.Code, $x.Name, $x.Unit, $x.Grp, '', '') } } }
Save 'ing.csv' @('Код', 'Назва', 'Одиниця', 'Група', 'Склад', 'Залишок') $ing
Log "   → ing.csv: $(@($ing).Count) рядків"

# ---------- 3. Техкарти → cards.csv ----------
$cards = @()
foreach ($c in Each $md.Catalogs) {
  if ($c.Name -notmatch 'Рецептур|Технологическ|ТехКарт|Калькуляц|Спецификац|Комплектац|Составы') { continue }
  foreach ($ts in Each $c.TabularSections) {
    $nf = Pick $ts.Attributes @('Номенклатура', 'Продукт', 'Ингредиент', 'Материал', 'Сырье'); if (-not $nf) { continue }
    $qf = Pick $ts.Attributes @('КоличествоБрутто', 'Брутто', 'Количество', 'Норма', 'КоличествоНетто', 'Нетто'); if (-not $qf) { continue }
    $own = $false; foreach ($o in Each $c.Owners) { if ($o.Name -eq $nom) { $own = $true } }
    $df = if ($own) { 'Владелец' } else { Pick $c.Attributes @('Блюдо', 'Номенклатура', 'Продукция', 'Изделие', 'Продукт') }
    $dish = if ($df) { "ПРЕДСТАВЛЕНИЕ(Т.Ссылка.$df)" } else { 'Т.Ссылка.Наименование' }
    $uu = Pick $ts.Attributes @('ЕдиницаИзмерения', 'Единица')
    $uq = if ($uu) { "ПРЕДСТАВЛЕНИЕ(Т.$uu)" } elseif ($unitF) { "ПРЕДСТАВЛЕНИЕ(Т.$nf.$unitF)" } else { '""' }
    $r = Q @("ВЫБРАТЬ $dish КАК Dish, ПРЕДСТАВЛЕНИЕ(Т.$nf) КАК Ing, Т.$qf КАК Q, $uq КАК Unit ИЗ Справочник.$($c.Name).$($ts.Name) КАК Т ГДЕ НЕ Т.Ссылка.ПометкаУдаления",
             "ВЫБРАТЬ $dish КАК Dish, ПРЕДСТАВЛЕНИЕ(Т.$nf) КАК Ing, Т.$qf КАК Q, """" КАК Unit ИЗ Справочник.$($c.Name).$($ts.Name) КАК Т") @('Dish', 'Ing', 'Q', 'Unit')
    if ($r -and $r.Count) { $cards += foreach ($x in $r) { , @($x.Dish, $x.Ing, (Num $x.Q), $x.Unit) }; Log "✅ Техкарти: $($r.Count) рядків (Справочник.$($c.Name).$($ts.Name))" }
  }
  if ($cards.Count) { break }
}
if (-not $cards.Count) { Log '⚠️ Техкарти не знайдено (у деяких конфігураціях — документи «Калькуляція»; див. structure.txt)' }
Save 'cards.csv' @('Страва', 'Продукт', 'Брутто', 'Одиниця') $cards
Log "   → cards.csv: $($cards.Count) рядків"

# ---------- 4. Постачальники → sup.csv ----------
$sup = @()
$kc = Pick $md.Catalogs @('Контрагенты', 'Контрагенти', 'Поставщики')
if ($kc) {
  $ka = $md.Catalogs.Find($kc).Attributes
  $code = Pick $ka @('КодПоЕДРПОУ', 'ЕДРПОУ', 'КодПоОКПО', 'ИНН', 'ИПН', 'ИННФизЛица')
  $cq = if ($code) { "К.$code" } else { '""' }
  $r = Q "ВЫБРАТЬ К.Наименование КАК Name, $cq КАК Code ИЗ Справочник.$kc КАК К ГДЕ НЕ К.ЭтоГруппа И НЕ К.ПометкаУдаления" @('Name', 'Code')
  if (-not $r) { $r = Q "ВЫБРАТЬ К.Наименование КАК Name, $cq КАК Code ИЗ Справочник.$kc КАК К ГДЕ НЕ К.ПометкаУдаления" @('Name', 'Code') }
  if ($r) { $sup = foreach ($x in $r) { , @($x.Name, $x.Code, '', '') }; Log "✅ Контрагенти: $($r.Count) (у ATOM залиште лише постачальників)" } else { Log "⚠️ Контрагенти не прочитались: $lastErr" }
}
Save 'sup.csv' @('Назва', 'ЄДРПОУ', 'Телефон', 'Адреса') $sup

# ---------- 5. Дисконтні / бонусні картки → cli.csv ----------
$cli = @()
foreach ($c in Each $md.Catalogs) {
  if ($c.Name -notmatch 'ДисконтныеКарты|ИнформационныеКарты|КартыЛояльности|БонусныеКарты|КартыКлиентов|Клиенты|Гости') { continue }
  $a = $c.Attributes
  $tel = Pick $a @('Телефон', 'НомерТелефона', 'ТелефонВладельца', 'Тел')
  $own = Pick $a @('ВладелецКарты', 'Клиент', 'Гость', 'Контрагент', 'ФизЛицо')
  $tq = if ($tel) { "К.$tel" } else { '""' }
  $nq = if ($own) { "ПРЕДСТАВЛЕНИЕ(К.$own)" } else { 'К.Наименование' }
  $r = Q "ВЫБРАТЬ $nq КАК Name, $tq КАК Tel, К.Код КАК Code ИЗ Справочник.$($c.Name) КАК К ГДЕ НЕ К.ПометкаУдаления" @('Name', 'Tel', 'Code')
  if ($r -and $r.Count) { $cli += foreach ($x in $r) { , @($x.Name, $x.Tel, '', "картка $($x.Code)") }; Log "✅ Картки/гості: $($r.Count) (Справочник.$($c.Name))$(if (-not $tel) { ' — без телефонів' })"; break }
}
Save 'cli.csv' @("Ім'я", 'Телефон', 'Бонуси', 'Нотатка') $cli

# ---------- структура бази (без даних) — для підтримки ATOM ----------
$st = New-Object Text.StringBuilder
[void]$st.AppendLine("$($md.Synonym) | $($md.Name) | $($md.Version)")
foreach ($kind in @(@('Довідники', $md.Catalogs), @('Документи', $md.Documents), @('Регістри накопичення', $md.AccumulationRegisters), @('Регістри відомостей', $md.InformationRegisters))) {
  [void]$st.AppendLine("`n== $($kind[0]) ==")
  foreach ($o in Each $kind[1]) { [void]$st.AppendLine("$($o.Name)  ($($o.Synonym))") }
}
[IO.File]::WriteAllText((Join-Path $out 'structure.txt'), $st.ToString(), (New-Object Text.UTF8Encoding $true))
[IO.File]::WriteAllLines((Join-Path $out 'log.txt'), $log, (New-Object Text.UTF8Encoding $true))

Write-Host "`n✅ Готово: $out" -ForegroundColor Green
Write-Host 'Далі: кабінет ATOM → заклад → 📥 Перехід → по черзі оберіть розділ і файл: menu → ing → cards → sup → cli.'
Write-Host 'Якщо щось не вивантажилось — надішліть у підтримку structure.txt і log.txt (там немає ваших даних, лише назви довідників).'
try { Start-Process explorer.exe $out } catch {}
Read-Host 'Enter — закрити'
