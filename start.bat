@echo off
title Charge Hero - Launcher
color 0A

:MENU
cls
echo ======================================
echo        CHARGE HERO - LAUNCHER
echo ======================================
echo.
echo 1 - Lancer Backend (Symfony)
echo 2 - Lancer WebSocket
echo 3 - Lancer Frontend
echo 4 - Lancer Tests Backend
echo 5 - Tout lancer
echo 0 - Quitter
echo.
set /p choice=Votre choix: 

if "%choice%"=="1" goto BACKEND
if "%choice%"=="2" goto WS
if "%choice%"=="3" goto FRONT
if "%choice%"=="4" goto TESTS
if "%choice%"=="5" goto ALL
if "%choice%"=="0" exit

goto MENU

:BACKEND
start cmd /k "cd charge-hero-api && symfony serve"
goto MENU

:WS
start cmd /k "cd charge-hero-ws && node server.js"
goto MENU

:FRONT
start cmd /k "cd charge-hero-front && npm run dev"
goto MENU

:TESTS
start cmd /k "cd charge-hero-api && php vendor/bin/phpunit -c phpunit.dist.xml"
goto MENU

:ALL
start cmd /k "cd charge-hero-api && symfony serve"
start cmd /k "cd charge-hero-ws && node server.js"
start cmd /k "cd charge-hero-front && npm run dev"
goto MENU