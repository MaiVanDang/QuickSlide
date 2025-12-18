param(
  [string]$Root = "C:\Users\Dang Hai\QuickSlideP2"
)

$includeExt = @('*.ts','*.tsx','*.js','*.jsx','*.java','*.css','*.yml','*.yaml','*.json')
$excludeRegex = "\\node_modules\\|\\.next\\|\\target\\|\\logs\\|\\.git\\"

function Strip-CommentsLine([string]$line, [ref]$inBlock) {
  $sb = New-Object System.Text.StringBuilder
  $i = 0
  $len = $line.Length
  $inStr = $false
  $strCh = [char]0

  while ($i -lt $len) {
    $ch = $line[$i]
    $next = if ($i + 1 -lt $len) { $line[$i + 1] } else { [char]0 }

    if ($inBlock.Value) {
      if ($ch -eq '*' -and $next -eq '/') {
        $inBlock.Value = $false
        $i += 2
        continue
      }
      $i++
      continue
    }

    if ($inStr) {
      if ($ch -eq '\\') {
        [void]$sb.Append($ch)
        if ($i + 1 -lt $len) {
          [void]$sb.Append($line[$i + 1])
          $i += 2
          continue
        }
        $i++
        continue
      }

      [void]$sb.Append($ch)
      if ($ch -eq $strCh) {
        $inStr = $false
        $strCh = [char]0
      }
      $i++
      continue
    }

    # Start string (best-effort)
    if ($ch -eq [char]34 -or $ch -eq [char]39) {
      $inStr = $true
      $strCh = $ch
      [void]$sb.Append($ch)
      $i++
      continue
    }

    # Line comment //
    if ($ch -eq '/' -and $next -eq '/') {
      break
    }

    # Block comment /* */
    if ($ch -eq '/' -and $next -eq '*') {
      $inBlock.Value = $true
      $i += 2
      continue
    }

    [void]$sb.Append($ch)
    $i++
  }

  return $sb.ToString()
}

function Count-LinesNoComments([string]$Path) {
  $files = Get-ChildItem -Path $Path -Recurse -File -Include $includeExt | Where-Object { $_.FullName -notmatch $excludeRegex }

  $total = 0L
  $nonEmpty = 0L
  $slashSlash = 0L
  $blockLinesApprox = 0L
  $codeNoComments = 0L

  foreach ($f in $files) {
    $inBlock = $false
    try {
      $lines = [System.IO.File]::ReadAllLines($f.FullName)
      foreach ($line in $lines) {
        $total++
        $trim = $line.Trim()
        if ($trim.Length -gt 0) { $nonEmpty++ }

        if ($inBlock) { $blockLinesApprox++ }
        if ($trim -match '^//') { $slashSlash++; continue }

        $ref = [ref]$inBlock
        $stripped = Strip-CommentsLine $line $ref
        if ($stripped.Trim().Length -gt 0) { $codeNoComments++ }
      }
    } catch {
      # ignore unreadable files
    }
  }

  [pscustomobject]@{
    Path = $Path
    Files = $files.Count
    TotalLines = $total
    NonEmptyLines = $nonEmpty
    SlashSlashLines = $slashSlash
    BlockCommentLines_Approx = $blockLinesApprox
    CodeLines_NoComments_NonEmpty = $codeNoComments
  }
}

$backend = Count-LinesNoComments (Join-Path $Root 'backend\src')
$frontend = Count-LinesNoComments (Join-Path $Root 'frontend')
$total = [pscustomobject]@{
  Files = ($backend.Files + $frontend.Files)
  TotalLines = ($backend.TotalLines + $frontend.TotalLines)
  NonEmptyLines = ($backend.NonEmptyLines + $frontend.NonEmptyLines)
  SlashSlashLines = ($backend.SlashSlashLines + $frontend.SlashSlashLines)
  BlockCommentLines_Approx = ($backend.BlockCommentLines_Approx + $frontend.BlockCommentLines_Approx)
  CodeLines_NoComments_NonEmpty = ($backend.CodeLines_NoComments_NonEmpty + $frontend.CodeLines_NoComments_NonEmpty)
}

'BACKEND'
$backend | ConvertTo-Json -Compress
'FRONTEND'
$frontend | ConvertTo-Json -Compress
'TOTAL'
$total | ConvertTo-Json -Compress
