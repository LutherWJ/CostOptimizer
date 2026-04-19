param(
  [string]$Uri = "http://localhost:3000/api/support/chat",
  [int]$TopK = 8,
  [int]$TimeoutSec = 90,
  [switch]$Debug
)

# Best-effort UTF-8 for nicer pasting/printing on Windows PowerShell.
try {
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [Console]::InputEncoding = $utf8
  [Console]::OutputEncoding = $utf8
  $OutputEncoding = $utf8
} catch {
  # ignore
}

$history = @()

Write-Host "Support bot terminal chat"
Write-Host "Endpoint: $Uri"
Write-Host "Commands: exit | quit | reset | /debug | /topk <n> | /help | /version"
Write-Host ""

$supportsResponseHeadersVariable = $false
try {
  $cmd = Get-Command Invoke-RestMethod -ErrorAction Stop
  $supportsResponseHeadersVariable = $cmd.Parameters.ContainsKey("ResponseHeadersVariable")
} catch {
  $supportsResponseHeadersVariable = $false
}

function Show-Help {
  Write-Host "Examples:"
  Write-Host "  /topk 10"
  Write-Host "  /debug"
  Write-Host "  /version"
  Write-Host "  reset"
  Write-Host "  exit"
  Write-Host ""
}

while ($true) {
  $msg = Read-Host "you"
  if (-not $msg) { continue }

  $trim = $msg.Trim()

  if ($trim -in @("exit", "quit", "q")) { break }
  if ($trim -eq "reset") { $history = @(); Write-Host "(history cleared)`n"; continue }
  if ($trim -eq "/help") { Show-Help; continue }
  if ($trim -eq "/version") { Write-Host "(tip: turn /debug on to see server meta/version in the JSON response)`n"; continue }

  if ($trim -eq "/debug") {
    $Debug = -not $Debug
    Write-Host ("(debug " + ($(if ($Debug) { "on" } else { "off" })) + ")`n")
    continue
  }

  if ($trim -match "^/topk\s+(\d+)\s*$") {
    $n = [int]$Matches[1]
    $TopK = [Math]::Max(1, [Math]::Min(12, $n))
    Write-Host "(topK set to $TopK)`n"
    continue
  }

  $body = @{
    message = $trim
    topK    = $TopK
    debug   = [bool]$Debug
    history = $history
  } | ConvertTo-Json -Depth 6

  try {
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $resp = $null
    $rh = $null
    $contentType = "application/json; charset=utf-8"

    if ($supportsResponseHeadersVariable) {
      try {
        $resp = Invoke-RestMethod -Method Post -Uri $Uri -ContentType $contentType -Body $bodyBytes -TimeoutSec $TimeoutSec -ResponseHeadersVariable rh
      } catch {
        $m = $_.Exception.Message
        if ($m -match "ResponseHeadersVariable") {
          $supportsResponseHeadersVariable = $false
          $resp = Invoke-RestMethod -Method Post -Uri $Uri -ContentType $contentType -Body $bodyBytes -TimeoutSec $TimeoutSec
        } else {
          throw
        }
      }
    } else {
      $resp = Invoke-RestMethod -Method Post -Uri $Uri -ContentType $contentType -Body $bodyBytes -TimeoutSec $TimeoutSec
    }

    $answer = $resp.answer
    if (-not $answer) { $answer = "(no answer returned)" }

    Write-Host "bot: $answer`n"

    $history += @{ role = "user"; content = $trim }
    $history += @{ role = "assistant"; content = $answer }

    if ($Debug) {
      if ($resp.meta) { Write-Host "debug: meta=$($resp.meta | ConvertTo-Json -Compress)`n" }
      if ($resp.sources) { Write-Host "debug: sources=$($resp.sources.Count)`n" }
    }
  } catch {
    $details = $_.ErrorDetails.Message
    if (-not $details) { $details = $_.Exception.Message }

    if ($details -match '(?i)timed out|timeout|operation has timed out') {
      Write-Host "bot: Sorry - I'm taking too long to respond. Please try again in a moment.`n"
      continue
    }

    Write-Host ("bot: (error) {0}`n" -f $details)
  }
}
