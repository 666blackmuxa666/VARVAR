# ATOM: вивантаження з R-Keeper 7 (Restera) у файли для майстра «📥 Перехід» (кабінет → заклад → Перехід, система «🔴 R-Keeper»).
# Лише ЧИТАЄ довідники через XML-інтерфейс сервера RK7 (команди GetRefData / GetOrderMenu) — нічого не змінює.
# Логін і пароль XML-інтерфейсу вводите ви — нікуди не надсилаються й не зберігаються (запити йдуть лише на ваш сервер RK7).
# Результат: папка на робочому столі з menu.csv, staff.csv і сирими *.xml (майстер їх теж читає) + log.txt для підтримки.
# Техкарти, залишки, постачальники — це StoreHouse, гості й депозити — CRM: їх вивантажте звітами в Excel (див. підказку в майстрі).
param([string]$Url = '', [string]$User = '', [string]$Station = '')
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}
$inv = [Globalization.CultureInfo]::InvariantCulture
# сервер RK7 зазвичай з власним (самопідписаним) сертифікатом — довіряємо лише в межах цього вікна
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls } catch {}
[Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

# ---------- куди стукати ----------
Write-Host "`nATOM — вивантаження з R-Keeper 7"
Write-Host 'Адресу XML-інтерфейсу знає ваш інтегратор: зазвичай https://<IP сервера>:<порт>/rk7api/v0/xmlinterface.xml (порт — у rk7srv.ini, [XMLINTERFACE]).'
if (-not $Url) { $Url = Read-Host 'Адреса (можна лише IP:порт)' }
$Url = $Url.Trim(); if ($Url -notmatch '^https?://') { $Url = 'https://' + $Url }; if ($Url -notmatch 'xmlinterface') { $Url = $Url.TrimEnd('/') + '/rk7api/v0/xmlinterface.xml' }
if (-not $User) { $User = Read-Host 'Користувач XML-інтерфейсу' }
$sec = Read-Host 'Пароль (не показується)' -AsSecureString
$pw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$auth = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${User}:$pw")); $pw = $null

$out = Join-Path ([Environment]::GetFolderPath('Desktop')) ('ATOM-RK7-' + (Get-Date -Format 'yyyy-MM-dd_HHmm'))
New-Item -ItemType Directory -Force -Path $out | Out-Null
$log = New-Object Collections.Generic.List[string]
function Log($s) { Write-Host $s; $log.Add($s) }

# ---------- помічники ----------
function Cell($x) { $s = "$x" -replace '[\r\n]+', ' '; if ($s -match '[;"]') { '"' + ($s -replace '"', '""') + '"' } else { $s } }
function Save($file, $head, $rows) {
  $sb = New-Object Text.StringBuilder; [void]$sb.AppendLine(($head | ForEach-Object { Cell $_ }) -join ';')
  foreach ($r in $rows) { [void]$sb.AppendLine(($r | ForEach-Object { Cell $_ }) -join ';') }
  [IO.File]::WriteAllText((Join-Path $out $file), $sb.ToString(), (New-Object Text.UTF8Encoding $true))
}
# один запит RK7Query → [xml] або $null (помилка — у лог)
function Rk($cmd, $save) {
  $body = '<?xml version="1.0" encoding="UTF-8"?><RK7Query>' + $cmd + '</RK7Query>'
  try {
    $wc = New-Object Net.WebClient; $wc.Encoding = [Text.Encoding]::UTF8; $wc.Headers['Authorization'] = $auth; $wc.Headers['Content-Type'] = 'application/xml; charset=utf-8'
    $txt = $wc.UploadString($Url, 'POST', $body)
  } catch {
    $m = $_.Exception.Message; if ($m -match '401') { $m += ' — невірний логін/пароль або користувачу не дано права XML-інтерфейсу' }
    Log "⚠️ $($cmd.Substring(0, [Math]::Min(60, $cmd.Length)))… — $m"; return $null
  }
  if ($save) { [IO.File]::WriteAllText((Join-Path $out $save), $txt, (New-Object Text.UTF8Encoding $true)) }
  try { $x = [xml]$txt } catch { Log "⚠️ відповідь не XML ($save)"; return $null }
  $res = $x.SelectSingleNode('//CommandResult'); if ($res -and $res.Status -and $res.Status -ne 'Ok') { Log "⚠️ $save — $($res.Status) $($res.ErrorText)"; return $null }
  return $x
}
function Items($x) { if (-not $x) { return @() }; $l = $x.SelectNodes('//RK7Reference/Items/Item'); if (-not $l.Count) { $l = $x.SelectNodes('//Item') }; return @($l) }
function A($n, $names) { foreach ($k in $names) { $v = $n.GetAttribute($k); if ($v) { return $v } }; return '' }
function Ref($name) { Items (Rk "<RK7CMD CMD=`"GetRefData`" RefName=`"$name`" OnlyActive=`"1`" WithMacroProp=`"1`"/>" "$($name.ToLower()).xml") }

# ---------- перевірка зʼєднання ----------
Write-Host "`nПідключаюсь до $Url ..."
$sys = Rk '<RK7CMD CMD="GetSystemInfo"/>' 'systeminfo.xml'
if (-not $sys) { Write-Host "`n❌ Сервер RK7 не відповів. Перевірте адресу, порт і що XML-інтерфейс увімкнено (rk7srv.ini → [XMLINTERFACE])." -ForegroundColor Red; [IO.File]::WriteAllLines((Join-Path $out 'log.txt'), $log, (New-Object Text.UTF8Encoding $true)); Read-Host 'Enter — вихід'; exit 1 }
$si = $sys.SelectSingleNode('//SystemInfo'); if ($si) { Log "✅ RK7: $($si.GetAttribute('SystemVersion')) $($si.GetAttribute('NetName'))" } else { Log '✅ RK7 відповідає' }

# ---------- довідники (сирі .xml лишаються в папці — майстер їх читає, підтримці видно всі поля) ----------
$cat = Ref 'CATEGLIST'; Log "Категорії: $($cat.Count)"
$mi = Ref 'MENUITEMS'; Log "Страви (MENUITEMS): $($mi.Count)"
$emp = Ref 'EMPLOYEES'; Log "Персонал (EMPLOYEES): $($emp.Count)"
foreach ($r in 'PRICETYPES', 'MODISCHEMES', 'MODIGROUPS', 'MODIFIERS', 'CURRENCIES', 'DISCOUNTS') { $n = Ref $r; Log "$r`: $($n.Count)" } # для R3/R4 (модифікатори, типи цін) — поки лише зберігаємо

# ---------- ціни: меню касової станції (Price у копійках) ----------
$price = @{}
$om = Rk '<RK7CMD CMD="GetOrderMenu"/>' 'ordermenu.xml'
if (-not $om) { if (-not $Station) { $Station = Read-Host 'Ціни беруться з меню касової станції. Код станції (Enter — 1)' }; if (-not $Station) { $Station = '1' }; $om = Rk "<RK7CMD CMD=`"GetOrderMenu`" StationCode=`"$Station`"/>" 'ordermenu.xml' }
if ($om) { foreach ($d in $om.SelectNodes('//Dishes/Item')) { $p = $d.GetAttribute('Price'); if ($p -ne '') { $price[$d.GetAttribute('Ident')] = ([double]$p / 100).ToString('0.##', $inv) } } }
Log "Ціни з меню станції: $($price.Count)$(if (-not $price.Count) { ' — ціни не отримано, menu.csv буде без цін (візьміть RK7_dbf або звіт)' })"

# ---------- menu.csv: Код;Розділ;Назва;Ціна ----------
$byId = @{}; foreach ($c in $cat) { $byId[$c.GetAttribute('Ident')] = $c.GetAttribute('Name') }
$par = @{}; foreach ($x in $mi) { $p = A $x @('MainParentIdent', 'Parent'); if ($p) { $par[$p] = 1 } }
foreach ($x in $mi) { if ($par[$x.GetAttribute('Ident')]) { $byId[$x.GetAttribute('Ident')] = $x.GetAttribute('Name') } } # папки дерева меню — теж розділи
$menu = foreach ($x in $mi) {
  $id = $x.GetAttribute('Ident'); if ($par[$id]) { continue }
  $cp = A $x @('CategPath'); $cn = if ($cp) { ($cp -split '[\\/]')[-1] } else { $byId[(A $x @('CategIdent', 'MainParentIdent', 'Parent'))] }
  , @((A $x @('Code', 'Ident')), $cn, $x.GetAttribute('Name'), $price[$id])
}
Save 'menu.csv' @('Код', 'Розділ', 'Назва', 'Ціна') $menu; Log "✅ menu.csv: $(@($menu).Count) страв"

# ---------- staff.csv: Імʼя;Посада (посада — папка дерева персоналу; PIN не переносимо) ----------
$ep = @{}; foreach ($x in $emp) { $p = A $x @('MainParentIdent', 'Parent'); if ($p) { $ep[$p] = 1 } }
$en = @{}; foreach ($x in $emp) { $en[$x.GetAttribute('Ident')] = $x.GetAttribute('Name') }
$staff = foreach ($x in $emp) { if ($ep[$x.GetAttribute('Ident')]) { continue }; , @($x.GetAttribute('Name'), $en[(A $x @('MainParentIdent', 'Parent'))]) }
Save 'staff.csv' @("Ім'я", 'Посада') $staff; Log "✅ staff.csv: $(@($staff).Count) працівників"

[IO.File]::WriteAllLines((Join-Path $out 'log.txt'), $log, (New-Object Text.UTF8Encoding $true))
Write-Host "`n✅ Готово: $out" -ForegroundColor Green
Write-Host 'Далі: кабінет ATOM → заклад → 📥 Перехід → система «🔴 R-Keeper» → розділ «Меню» → menu.csv, «Персонал» → staff.csv.'
Write-Host 'Техкарти, залишки, постачальники (StoreHouse) і гостей з депозитами (CRM) вивантажте звітами в Excel.'
Write-Host 'Якщо щось не так — надішліть у підтримку log.txt і *.xml з папки (там довідники, без паролів).'
try { Start-Process explorer.exe $out } catch {}
Read-Host 'Enter — закрити'
