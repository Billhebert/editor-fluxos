@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo  PUSH RAPIDO (sem release)
echo ==========================================
echo.

set /p MSG="Mensagem do commit: "
if "%MSG%"=="" (
    echo Mensagem nao pode ser vazia!
    pause
    exit /b 1
)

echo.
echo [1/3] Commitando no DEV...
cd /d "C:\Users\Bill\Desktop\Fabricio\dev"
git add -A
git commit -m "%MSG%"

echo.
echo [2/3] Enviando DEV...
git push

echo.
echo [3/3] Copiando + push no PUBLIC...
xcopy /E /Y /Q "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos\dist\main.js" "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\"
xcopy /E /Y /Q "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos\index.html" "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\"
xcopy /E /Y /Q "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos\package.json" "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\"
cd /d "C:\Users\Bill\Desktop\Fabricio\public"
git add -A
git commit -m "%MSG%"
git push

echo.
echo ==========================================
echo  PUSH FEITO!
echo  (sem release, sem build)
echo ==========================================
pause
