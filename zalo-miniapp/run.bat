@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ============================================
echo    Arex - Zalo Mini App : chay thu
echo ============================================

if not exist package.json (
  echo [X] Khong thay package.json. Dat run.bat trong thu muc zalo-miniapp.
  pause
  exit /b 1
)

REM --- Cai dependencies neu chua co node_modules ---
if not exist node_modules (
  echo.
  echo [*] Chua co node_modules - dang cai dependencies...
  call npm install
  if errorlevel 1 (
    echo [X] npm install that bai. Kiem tra Node.js / npm.
    pause
    exit /b 1
  )
)

echo.
echo Chon che do chay:
echo    1 = zmp start    (Zalo Mini App Studio - gia lap Zalo day du)
echo    2 = npm run dev  (Vite - xem nhanh tren trinh duyet)
echo.
set "mode=1"
set /p "mode=Nhap 1 hoac 2 [mac dinh 1]: "

if "%mode%"=="2" goto vite

:zmp
where zmp >nul 2>nul
if errorlevel 1 (
  echo.
  echo [*] Chua co zmp-cli - dang cai global: npm i -g zmp-cli
  call npm i -g zmp-cli
  if errorlevel 1 (
    echo [X] Cai zmp-cli that bai. Thu lai che do 2 (vite) hoac cai thu cong.
    pause
    exit /b 1
  )
)
echo.
echo [*] Dang mo Zalo Mini App Studio (zmp start)...
call zmp start
goto end

:vite
echo.
echo [*] Chay Vite dev server - mo trinh duyet toi dia chi hien ra ben duoi...
call npm run dev
goto end

:end
echo.
pause
endlocal
