# Safe deploy: runs every preflight check, then pushes to GitHub, and Vercel builds from there.
#   On a feature branch  -> pushes the branch; Vercel makes a private-ish preview URL. Open a PR.
#   On main              -> asks you to type "deploy", then pushes; Vercel deploys to production.
# Usage (from the project folder):  .\scripts\deploy.ps1
#   -SkipTests   skip tests + build locally (CI still runs them; use only for text-only changes)

param([switch]$SkipTests)

# Every native command is checked through $LASTEXITCODE (git writes progress to stderr).
Set-Location (Split-Path $PSScriptRoot -Parent)

function Fail($msg) { Write-Host "`n[x] $msg" -ForegroundColor Red; exit 1 }

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git is not installed.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'node is not installed.' }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq 'HEAD') { Fail 'You are in detached HEAD state. Check out a branch first.' }

# 1. Gate: secrets, clean tree, audit, lint, typecheck, tests, build.
if ($SkipTests) {
    node scripts/preflight.mjs --secrets-only
    if ($LASTEXITCODE -ne 0) { Fail 'Preflight failed. Nothing was pushed.' }
    if (git status --porcelain) { Fail 'Uncommitted changes. Commit first. Nothing was pushed.' }
} else {
    node scripts/preflight.mjs
    if ($LASTEXITCODE -ne 0) { Fail 'Preflight failed. Nothing was pushed.' }
}

# 2. Don't push on top of something you haven't seen.
git fetch origin --quiet
if ($LASTEXITCODE -ne 0) { Fail 'Could not reach GitHub (git fetch failed).' }
$remoteExists = git ls-remote --heads origin $branch
if ($remoteExists) {
    $behind = [int](git rev-list --count "HEAD..origin/$branch")
    if ($behind -gt 0) { Fail "origin/$branch has $behind commit(s) you don't have. Run: git pull --rebase" }
}

# 3. Push. Never --force.
if ($branch -eq 'main') {
    Write-Host "`nThis will deploy to PRODUCTION (your live site)." -ForegroundColor Yellow
    git log --oneline "origin/main..HEAD"
    $answer = Read-Host 'Type "deploy" to continue'
    if ($answer -ne 'deploy') { Fail 'Cancelled. Nothing was pushed.' }
    git push origin main
} else {
    git push -u origin $branch
}
if ($LASTEXITCODE -ne 0) { Fail 'git push failed.' }

Write-Host "`n[ok] Pushed $branch." -ForegroundColor Green
if ($branch -eq 'main') {
    Write-Host 'Vercel is building production now. When it is done, run:'
    Write-Host '  npm run smoke -- https://<your-site>.vercel.app'
} else {
    Write-Host 'Vercel is building a preview, and GitHub CI is running the checks.'
    Write-Host 'Open a pull request into main; merge it once CI is green to go live.'
    Write-Host "  https://github.com/DennyiAnns523/portfolio/compare/main...$branch"
}
