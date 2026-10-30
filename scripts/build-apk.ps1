# 디버그 APK 만들기: 웹 빌드 → Capacitor 동기화 → Gradle → apk/ 폴더에 복사
# 사용: npm run apk   (또는 powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1)
# 개발 도구는 모두 90_Tools 아래 영문 경로에 있습니다. (사용자 폴더에 한글이 있어서)
$ErrorActionPreference = 'Stop'
$tools = 'C:\Work\AI_Agent\90_Tools'
$env:JAVA_HOME = "$tools\jdk-21"
$env:ANDROID_HOME = "$tools\android-sdk"
$env:GRADLE_USER_HOME = "$tools\gradle-home"
$project = Split-Path $PSScriptRoot -Parent
Set-Location $project

Write-Output '[1/3] 웹 빌드'
npm run build
if ($LASTEXITCODE -ne 0) { throw '웹 빌드 실패' }

Write-Output '[2/3] Capacitor 동기화 (dist → android)'
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Capacitor 동기화 실패' }

Write-Output '[3/3] Gradle 빌드'
Set-Location (Join-Path $project 'android')
.\gradlew.bat assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw 'Gradle 빌드 실패' }

$apk = Join-Path $project 'android\app\build\outputs\apk\debug\app-debug.apk'
$out = Join-Path $project 'apk'
New-Item -ItemType Directory -Force $out | Out-Null
$dated = Join-Path $out ("academy-note-debug-{0}.apk" -f (Get-Date -Format 'yyyy-MM-dd'))
Copy-Item $apk $dated -Force
Copy-Item $apk (Join-Path $out 'academy-note-debug.apk') -Force
Write-Output ("APK: {0} ({1:N1} MB)" -f $dated, ((Get-Item $dated).Length / 1MB))