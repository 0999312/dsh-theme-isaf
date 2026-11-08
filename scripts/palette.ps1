# palette.ps1 - extract the dominant colours of a style-reference image.
#
# The one-round theme workflow starts from a reference image, so the first
# mechanical step is: what colours are actually in it, and how much of the
# frame does each one take? This script answers exactly that - nothing about
# DSH tokens yet (that mapping is a judgement call, see WORKFLOW.md).
#
#   pwsh -File scripts/palette.ps1 -Path ref.png
#   pwsh -File scripts/palette.ps1 -Path ref.png -K 10 -Json
#
# Output columns:
#   hex      bucket average colour (#rrggbb)
#   share    percent of sampled pixels in that bucket
#   L        WCAG relative luminance (0 = black, 1 = white)
#   onWhite  contrast of that colour as TEXT on #ffffff
#   onBlack  contrast of that colour as TEXT on #000000
#   sat      HSV saturation, percent (high = plausible accent)
#   hint     coarse role guess: bg / surface / accent / ink
#
# ASCII only on purpose: Windows PowerShell 5.1 decodes BOM-less scripts as ANSI.

param(
  [Parameter(Mandatory = $true)][string]$Path,
  [int]$K = 8,
  [int]$Grid = 120,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$full = (Resolve-Path -LiteralPath $Path).ProviderPath
$image = [System.Drawing.Image]::FromFile($full)
try {
  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $image
} finally {
  $image.Dispose()
}

try {
  $step = [Math]::Max(1, [int][Math]::Floor([Math]::Min($bitmap.Width, $bitmap.Height) / $Grid))
  $buckets = @{}
  $sampled = 0

  for ($y = 0; $y -lt $bitmap.Height; $y += $step) {
    for ($x = 0; $x -lt $bitmap.Width; $x += $step) {
      $c = $bitmap.GetPixel($x, $y)
      $key = '{0:x1}{1:x1}{2:x1}' -f ($c.R -shr 4), ($c.G -shr 4), ($c.B -shr 4)
      if (-not $buckets.ContainsKey($key)) {
        $buckets[$key] = [pscustomobject]@{ Count = 0; R = 0L; G = 0L; B = 0L }
      }
      $b = $buckets[$key]
      $b.Count++
      $b.R += $c.R
      $b.G += $c.G
      $b.B += $c.B
      $sampled++
    }
  }

  $rows = foreach ($key in $buckets.Keys) {
    $b = $buckets[$key]
    $r = [int][Math]::Round($b.R / $b.Count)
    $g = [int][Math]::Round($b.G / $b.Count)
    $bl = [int][Math]::Round($b.B / $b.Count)

    # WCAG relative luminance.
    $lin = @($r, $g, $bl) | ForEach-Object {
      $s = $_ / 255.0
      if ($s -le 0.03928) { $s / 12.92 } else { [Math]::Pow(($s + 0.055) / 1.055, 2.4) }
    }
    $lum = 0.2126 * $lin[0] + 0.7152 * $lin[1] + 0.0722 * $lin[2]

    $max = [Math]::Max($r, [Math]::Max($g, $bl))
    $min = [Math]::Min($r, [Math]::Min($g, $bl))
    $sat = if ($max -eq 0) { 0 } else { [Math]::Round(($max - $min) / $max * 100) }

    $share = $b.Count / $sampled * 100
    $hint = if ($sat -lt 12 -and ($lum -le 0.08 -or $lum -ge 0.90)) {
      'ink'
    } elseif ($share -ge 12 -and ($lum -le 0.15 -or $lum -ge 0.75)) {
      'bg'
    } elseif ($sat -ge 30) {
      'accent'
    } elseif ($lum -le 0.10) {
      'ink'
    } else {
      'surface'
    }

    [pscustomobject]@{
      hex     = '#{0:x2}{1:x2}{2:x2}' -f $r, $g, $bl
      share   = [Math]::Round($share, 1)
      L       = [Math]::Round($lum, 3)
      onWhite = [Math]::Round(1.05 / ($lum + 0.05), 1)
      onBlack = [Math]::Round(($lum + 0.05) / 0.05, 1)
      sat     = $sat
      hint    = $hint
    }
  }

  $sorted = $rows | Sort-Object -Property share -Descending | Select-Object -First $K

  if ($Json) {
    $payload = [pscustomobject]@{
      file = $full
      width = $bitmap.Width
      height = $bitmap.Height
      step = $step
      sampled = $sampled
      colors = @($sorted)
    }
    $payload | ConvertTo-Json -Depth 5
  } else {
    Write-Output ("# {0}  {1}x{2}  step={3}  sampled={4}px  buckets={5}" -f $full, $bitmap.Width, $bitmap.Height, $step, $sampled, $buckets.Count)
    Write-Output ('{0,-3} {1,-8} {2,6} {3,6} {4,7} {5,7} {6,5}  {7}' -f 'no', 'hex', 'share', 'L', 'onWhite', 'onBlack', 'sat', 'hint')
    $i = 0
    foreach ($row in $sorted) {
      $i++
      Write-Output ('{0,-3} {1,-8} {2,5}% {3,6} {4,7} {5,7} {6,4}%  {7}' -f $i, $row.hex, $row.share, $row.L, $row.onWhite, $row.onBlack, $row.sat, $row.hint)
    }
  }
} finally {
  $bitmap.Dispose()
}
