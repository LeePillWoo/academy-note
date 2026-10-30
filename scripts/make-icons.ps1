# 앱 아이콘 만들기 (Windows PowerShell 5.1, System.Drawing)
# 사용: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make-icons.ps1 -Source <원본.png> -Project <프로젝트 폴더>
#
# 원본은 어두운 바탕 가운데에 둥근 네모 타일이 있는 그림입니다.
# 1. 타일 테두리를 찾아 정사각형으로 자르고, 둥근 모서리 바깥은 투명하게 만듭니다. → design/app-icon-tile.png
# 2. 안드로이드 런처 아이콘(모든 해상도)과 시작 화면을 만듭니다.
#    - ic_launcher.png: 둥근 네모 타일 / ic_launcher_round.png: 동그라미
#    - ic_launcher_foreground.png: 적응형 아이콘 앞면. 타일을 80% 크기로 가운데에 두어 안전 영역(72/108dp) 안에 들어가게 합니다.
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Project
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$design = Join-Path $Project 'design'
$res = Join-Path $Project 'android\app\src\main\res'
New-Item -ItemType Directory -Force $design | Out-Null
Copy-Item $Source (Join-Path $design 'app-icon-source.png') -Force

$src = [System.Drawing.Bitmap]::new($Source)
$w = $src.Width; $h = $src.Height
$bg = $src.GetPixel(8, 8)

function ColorDistance($a, $b) {
  return [math]::Abs($a.R - $b.R) + [math]::Abs($a.G - $b.G) + [math]::Abs($a.B - $b.B)
}

# ── 1. 타일 테두리 찾기 (가운데 줄/열에서 바탕색이 아닌 첫 픽셀) ──
$threshold = 100
$cx = [int]($w / 2); $cy = [int]($h / 2)
$left = 0;        for ($x = 0; $x -lt $w; $x++)  { if ((ColorDistance $src.GetPixel($x, $cy) $bg) -gt $threshold) { $left = $x; break } }
$right = $w - 1;  for ($x = $w - 1; $x -ge 0; $x--) { if ((ColorDistance $src.GetPixel($x, $cy) $bg) -gt $threshold) { $right = $x; break } }
$top = 0;         for ($y = 0; $y -lt $h; $y++)  { if ((ColorDistance $src.GetPixel($cx, $y) $bg) -gt $threshold) { $top = $y; break } }
$bottom = $h - 1; for ($y = $h - 1; $y -ge 0; $y--) { if ((ColorDistance $src.GetPixel($cx, $y) $bg) -gt $threshold) { $bottom = $y; break } }

# 둥근 모서리 반지름: 왼쪽 위 모서리에서 대각선으로 들어가다 타일을 만나는 거리 t → r = t / (1 - 1/√2)
$t = 0
for ($i = 0; $i -lt 400; $i++) { if ((ColorDistance $src.GetPixel($left + $i, $top + $i) $bg) -gt $threshold) { $t = $i; break } }
$radius = [int][math]::Round($t / 0.2929)

$size = [math]::Min($right - $left + 1, $bottom - $top + 1)
$sx = [int](($left + $right) / 2 - $size / 2)
$sy = [int](($top + $bottom) / 2 - $size / 2)
Write-Output ("타일: {0}x{0} (왼쪽 {1}, 위 {2}), 모서리 반지름 {3}px, 바탕색 #{4:X2}{5:X2}{6:X2}" -f $size, $sx, $sy, $radius, $bg.R, $bg.G, $bg.B)

function NewCanvas([int]$width, [int]$height) {
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  return @{ Bitmap = $bmp; Graphics = $g }
}

# 가장자리가 투명한 그림을 줄일 때 테두리가 어두워지지 않게
$attrs = New-Object System.Drawing.Imaging.ImageAttributes
$attrs.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)

function DrawScaled($g, $img, [int]$x, [int]$y, [int]$width, [int]$height) {
  $dest = New-Object System.Drawing.Rectangle -ArgumentList $x, $y, $width, $height
  $g.DrawImage($img, $dest, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
}

# 정사각형으로 자른 원본 (모서리 그대로)
$crop = (NewCanvas $size $size)
$crop.Graphics.DrawImage($src, (New-Object System.Drawing.Rectangle -ArgumentList 0, 0, $size, $size), $sx, $sy, $size, $size, [System.Drawing.GraphicsUnit]::Pixel)
$crop.Graphics.Dispose()

# 둥근 네모 타일 (바탕과 맞닿은 1~2px 테두리를 빼려고 반지름을 조금 줄이고 안쪽으로 2px 들어감)
$inset = 2
$r = $radius - $inset
$d = 2 * $r
$roundRect = New-Object System.Drawing.Drawing2D.GraphicsPath
$roundRect.AddArc($inset, $inset, $d, $d, 180, 90)
$roundRect.AddArc($size - $inset - $d, $inset, $d, $d, 270, 90)
$roundRect.AddArc($size - $inset - $d, $size - $inset - $d, $d, $d, 0, 90)
$roundRect.AddArc($inset, $size - $inset - $d, $d, $d, 90, 90)
$roundRect.CloseFigure()
$brush = New-Object System.Drawing.TextureBrush -ArgumentList $crop.Bitmap
$tile = (NewCanvas $size $size)
$tile.Graphics.FillPath($brush, $roundRect)
$tile.Graphics.Dispose()
$tile.Bitmap.Save((Join-Path $design 'app-icon-tile.png'), [System.Drawing.Imaging.ImageFormat]::Png)

# 동그라미 (ic_launcher_round용)
$circle = New-Object System.Drawing.Drawing2D.GraphicsPath
$circle.AddEllipse($inset, $inset, $size - 2 * $inset, $size - 2 * $inset)
$round = (NewCanvas $size $size)
$round.Graphics.FillPath($brush, $circle)
$round.Graphics.Dispose()

# ── 2. 안드로이드 아이콘 ──
$densities = @(
  @{ Name = 'mdpi'; Scale = 1 }, @{ Name = 'hdpi'; Scale = 1.5 }, @{ Name = 'xhdpi'; Scale = 2 },
  @{ Name = 'xxhdpi'; Scale = 3 }, @{ Name = 'xxxhdpi'; Scale = 4 }
)
foreach ($density in $densities) {
  $dir = Join-Path $res ("mipmap-" + $density.Name)
  New-Item -ItemType Directory -Force $dir | Out-Null
  $iconSize = [int](48 * $density.Scale)
  $canvasSize = [int](108 * $density.Scale)

  $icon = (NewCanvas $iconSize $iconSize)
  DrawScaled $icon.Graphics $tile.Bitmap 0 0 $iconSize $iconSize
  $icon.Graphics.Dispose()
  $icon.Bitmap.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  $iconRound = (NewCanvas $iconSize $iconSize)
  DrawScaled $iconRound.Graphics $round.Bitmap 0 0 $iconSize $iconSize
  $iconRound.Graphics.Dispose()
  $iconRound.Bitmap.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  # 적응형 앞면: 타일을 80%로 가운데에
  $fgSize = [int][math]::Round($canvasSize * 0.8)
  $offset = [int](($canvasSize - $fgSize) / 2)
  $fg = (NewCanvas $canvasSize $canvasSize)
  DrawScaled $fg.Graphics $tile.Bitmap $offset $offset $fgSize $fgSize
  $fg.Graphics.Dispose()
  $fg.Bitmap.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
}

# 적응형 뒷면 색: 타일 위쪽 가장자리 색 (앞면이 가려지는 끝부분에 어울리게)
$edge = $crop.Bitmap.GetPixel([int]($size / 2), 6)
$hex = '#{0:X2}{1:X2}{2:X2}' -f $edge.R, $edge.G, $edge.B
@"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">$hex</color>
</resources>
"@ | Set-Content -Encoding utf8 (Join-Path $res 'values\ic_launcher_background.xml')

# ── 3. 시작 화면: 원본 바탕색 위에 타일을 가운데 작게 ──
$navy = [System.Drawing.Color]::FromArgb(255, $bg.R, $bg.G, $bg.B)
function Splash([int]$width, [int]$height, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($navy)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'; $g.CompositingQuality = 'HighQuality'
  $tileSize = [int]([math]::Min($width, $height) * 0.38)
  DrawScaled $g $tile.Bitmap ([int](($width - $tileSize) / 2)) ([int](($height - $tileSize) / 2)) $tileSize $tileSize
  $g.Dispose()
  New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Splash 1920 1920 (Join-Path $res 'drawable\splash.png')
Splash 1080 1920 (Join-Path $res 'drawable-port-xxhdpi\splash.png')
Splash 1920 1080 (Join-Path $res 'drawable-land-xxhdpi\splash.png')
# 다른 해상도의 기본 시작 화면은 지워서 위 그림을 크기에 맞게 쓰게 합니다.
foreach ($name in 'mdpi', 'hdpi', 'xhdpi', 'xxxhdpi') {
  foreach ($prefix in 'drawable-port-', 'drawable-land-') {
    $dir = Join-Path $res ($prefix + $name)
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
  }
}

$src.Dispose()
Write-Output ("완료: 런처 아이콘 5해상도 × 3종, 뒷면 색 {0}, 시작 화면 3장" -f $hex)
