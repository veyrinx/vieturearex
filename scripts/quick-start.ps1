#!/usr/bin/env pwsh

# ============================================================
# Arex - Local Development Quick Start
# ============================================================
# Usage: .\scripts\quick-start.ps1
# ============================================================

Write-Host "🚀 Arex - Quick Start Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "📦 Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = & node --version
if ($?) {
    Write-Host "✅ Node.js $nodeVersion found" -ForegroundColor Green
}
else {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
Write-Host "📦 Checking npm..." -ForegroundColor Yellow
$npmVersion = & npm --version
if ($?) {
    Write-Host "✅ npm $npmVersion found" -ForegroundColor Green
}
else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Prerequisites Checklist:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$checklist = @(
    @{ item = "1. Supabase project created"; check = "Go to Supabase.com → Create free project" },
    @{ item = "2. Environment variables set"; check = "Copy .env.example to .env.local → Fill SUPABASE_URL & KEY" },
    @{ item = "3. schema.sql executed"; check = "Run in Supabase SQL Editor" },
    @{ item = "4. Admin account created"; check = "Create admin@arex.tech in Auth" }
)

foreach ($checkbox in $checklist) {
    Write-Host "⚠️  $($checkbox.item)" -ForegroundColor Yellow
    Write-Host "   → $($checkbox.check)" -ForegroundColor Gray
}

Write-Host ""
write-host "Do you want to continue? (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "❌ Setup cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔧 Installing dependencies..." -ForegroundColor Yellow

# Install dependencies
& npm install

if ($?) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}
else {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Running type check..." -ForegroundColor Yellow
& npm run typecheck

if ($?) {
    Write-Host "✅ TypeScript check passed" -ForegroundColor Green
}
else {
    Write-Host "⚠️  TypeScript warnings/errors found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Running linter..." -ForegroundColor Yellow
& npm run lint

if ($?) {
    Write-Host "✅ ESLint check passed" -ForegroundColor Green
}
else {
    Write-Host "⚠️  ESLint warnings found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 Ready to start development!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:3000" -ForegroundColor White
Write-Host "3. Login: /auth/login" -ForegroundColor White
Write-Host "4. Admin: /admin" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Useful Commands:" -ForegroundColor Cyan
Write-Host "npm run dev        - Start development server" -ForegroundColor Gray
Write-Host "npm run build      - Build for production" -ForegroundColor Gray
Write-Host "npm run typecheck  - Check TypeScript" -ForegroundColor Gray
Write-Host "npm run lint       - Run ESLint" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "- QUICK_REFERENCE.md - Quick setup guide" -ForegroundColor Gray
Write-Host "- COMPLETE_SETUP_GUIDE.md - Detailed guide" -ForegroundColor Gray
Write-Host "- SUPABASE_ADMIN_SETUP.md - Admin setup" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ Setup complete! Happy coding! 🚀" -ForegroundColor Green
