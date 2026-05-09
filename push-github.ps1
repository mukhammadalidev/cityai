# Loyihani GitHubga yuborish (Git o‘rnatilgan bo‘lishi kerak).
# PowerShell: cd loyiha ildizi; .\push-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git topilmadi. https://git-scm.com/download/win dan o‘rnating yoki PATH ga qo‘shing." -ForegroundColor Red
    exit 1
}

git init
git add .
git status
git commit -m "first commit"
git branch -M main
$remote = "https://github.com/mukhammadalidev/cityai.git"
if (git remote get-url origin 2>$null) {
    git remote set-url origin $remote
} else {
    git remote add origin $remote
}
git push -u origin main
