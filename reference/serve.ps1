# SGE Customer Care demo - local web server (no install needed)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Split-Path -Parent $MyInvocation.MyCommand.Path)).Path
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
           '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.json'='application/json'; '.csv'='text/csv' }
$listener = $null; $port = 0
foreach ($p in 8080..8090) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host "Khong mo duoc cong 8080-8090. Hay dong chuong trinh dang dung cac cong nay roi thu lai."; exit 1 }
$url = "http://localhost:$port/"
Write-Host ""
Write-Host "  SGE Operations demo dang chay tai: $url" -ForegroundColor Green
Write-Host "  Thu muc: $root"
Write-Host "  Dong cua so nay de tat server."
Write-Host ""
Start-Process $url
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $res.ContentType = $mime[$ext] } else { $res.ContentType = 'application/octet-stream' }
      $res.Headers.Add('Cache-Control','no-cache')
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host ("  200 /" + $rel)
    } else {
      $res.StatusCode = 404
      Write-Host ("  404 /" + $rel)
    }
  } catch { $res.StatusCode = 500 } finally { $res.Close() }
}
