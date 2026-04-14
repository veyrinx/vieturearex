$ErrorActionPreference = "Stop"

$projectUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $projectUrl -or -not $serviceRoleKey) {
  if (Test-Path ".env.local") {
    $lines = Get-Content ".env.local"
    foreach ($line in $lines) {
      if ($line.StartsWith("NEXT_PUBLIC_SUPABASE_URL=") -and -not $projectUrl) {
        $projectUrl = $line.Substring("NEXT_PUBLIC_SUPABASE_URL=".Length).Trim()
      }
      if ($line.StartsWith("SUPABASE_SERVICE_ROLE_KEY=") -and -not $serviceRoleKey) {
        $serviceRoleKey = $line.Substring("SUPABASE_SERVICE_ROLE_KEY=".Length).Trim()
      }
    }
  }
}

if (-not $projectUrl -or -not $serviceRoleKey) {
  throw "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
}
$imageUrl = "https://dl.dir.freefiremobile.com/common/web_event/official2.ff.garena.all/20263/eea47cb2ea858106b25d40d338a919f6.jpg"

$headers = @{
  apikey = $serviceRoleKey
  Authorization = "Bearer $serviceRoleKey"
  Prefer = "return=representation"
}

$now = Get-Date
$templates = @(
  @{ title = "FF Template - Alpha Clash"; start = -3; end = 2 },
  @{ title = "FF Template - Neon Raid"; start = -1; end = 5 },
  @{ title = "FF Template - Rank Sprint"; start = 1; end = 7 },
  @{ title = "FF Template - Squad Survival"; start = 4; end = 10 },
  @{ title = "FF Template - Arena Rush"; start = 6; end = 12 },
  @{ title = "FF Template - Guild Cup"; start = 9; end = 14 },
  @{ title = "FF Template - Night Ops"; start = 11; end = 17 },
  @{ title = "FF Template - Speedrun Fest"; start = 14; end = 20 },
  @{ title = "FF Template - Titan Hunt"; start = 16; end = 22 },
  @{ title = "FF Template - Victory Week"; start = 19; end = 26 },
  @{ title = "FF Template - Prime Showdown"; start = 22; end = 28 },
  @{ title = "FF Template - Final Storm"; start = 25; end = 30 }
)

$events = @()
foreach ($template in $templates) {
  $status = if ($template.end -lt 0) {
    "expired"
  } elseif ($template.start -gt 0) {
    "upcoming"
  } else {
    "active"
  }

  $events += [ordered]@{
    title = $template.title
    description = "Nội dung sự kiện đang được cập nhật."
    start_date = $now.AddDays($template.start).ToUniversalTime().ToString("o")
    end_date = $now.AddDays($template.end).ToUniversalTime().ToString("o")
    image_url = $imageUrl
    thumbnail_url = $imageUrl
    link = "https://ff.garena.com"
    status = $status
  }
}

$body = $events | ConvertTo-Json -Depth 6
$result = Invoke-RestMethod -Method Post -Uri "$projectUrl/rest/v1/events" -Headers $headers -ContentType "application/json" -Body $body

Write-Output "Inserted=$($result.Count)"
