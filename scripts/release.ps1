# 发布新版本：构建 -> 压缩 -> 上传到 GitHub Release
#
# 用法（在项目根目录打开 PowerShell）：
#   .\scripts\release.ps1 -Version 1.3.1
#
# 产物：dist\win-unpacked\ 重新构建后，压缩为 TicketEditor-v1.3.1.zip 并上传到 Release 页面

param(
    [Parameter(Mandatory = $true)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

# 切到项目根目录（脚本在 scripts\ 下）
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

# ---------- 找 gh ----------
$gh = "gh"
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    $fallback = "C:\Program Files\GitHub CLI\gh.exe"
    if (Test-Path $fallback) {
        $gh = $fallback
    } else {
        Write-Host "找不到 GitHub CLI，请先安装：winget install GitHub.cli" -ForegroundColor Red
        exit 1
    }
}

# ---------- 1. 检查是否有未提交的改动 ----------
$dirty = git status --porcelain
if ($dirty) {
    Write-Host "工作区有未提交的改动，先提交再发版：" -ForegroundColor Yellow
    git status --short
    exit 1
}

# ---------- 2. 检查标签是否已存在 ----------
$tag = "v$Version"
$exists = git tag -l $tag
if ($exists) {
    Write-Host "标签 $tag 已存在，换个版本号。" -ForegroundColor Red
    exit 1
}

# ---------- 3. 构建 ----------
Write-Host "[1/4] 构建中..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败，已中断。" -ForegroundColor Red
    exit 1
}

# ---------- 4. 确认没有误打包商业字体 ----------
Write-Host "[2/4] 检查打包结果..." -ForegroundColor Cyan
$forbidden = @("华文行楷.ttf")
foreach ($f in $forbidden) {
    $p = Join-Path "dist\win-unpacked\resources\static" $f
    if (Test-Path -LiteralPath $p) {
        Write-Host "打包结果里出现了 $f，这是不可再分发的字体。" -ForegroundColor Red
        Write-Host "请确认 static\ 目录已清理后重新构建。" -ForegroundColor Red
        exit 1
    }
}

# ---------- 5. 压缩 ----------
$zip = "TicketEditor-v$Version.zip"
Write-Host "[3/4] 压缩到 $zip ..." -ForegroundColor Cyan
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "dist\win-unpacked\*" -DestinationPath $zip -CompressionLevel Optimal
$sizeMB = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "      压缩完成：$sizeMB MB" -ForegroundColor Gray

# ---------- 6. 打标签并发布 ----------
Write-Host "[4/4] 上传到 GitHub Release..." -ForegroundColor Cyan
git tag $tag
git push origin $tag
& $gh release create $tag $zip --title "TicketEditor $tag" --notes "版本 $tag"

Write-Host ""
Write-Host "完成。下载页：https://github.com/2422067494-crypto/TicketEditor/releases/tag/$tag" -ForegroundColor Green
Write-Host "压缩包 $zip 留在项目根目录，已加入 .gitignore，不会被提交。" -ForegroundColor Gray
