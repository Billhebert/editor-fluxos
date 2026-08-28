@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo  PUBLICAR ATUALIZACAO
echo ==========================================
echo.

set /p MSG="Mensagem do commit: "
if "%MSG%"=="" (
    echo Mensagem nao pode ser vazia!
    pause
    exit /b 1
)

echo.
echo [1/4] Commitando mudancas no DEV...
cd /d "C:\Users\Bill\Desktop\Fabricio\dev"
git add -A
git commit -m "%MSG%"

echo.
echo [2/4] Copiando arquivos para PUBLIC...
if not exist "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos" mkdir "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos"
xcopy /E /Y /Q "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos\*" "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\"
del /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\node_modules\*" 2>nul
rmdir /S /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\node_modules" 2>nul
del /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\dist\*" 2>nul
rmdir /S /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\dist" 2>nul
del /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\.git\*" 2>nul
rmdir /S /Q "C:\Users\Bill\Desktop\Fabricio\public\editor-fluxos\.git" 2>nul

echo.
echo [3/4] Commitando mudancas no PUBLIC...
cd /d "C:\Users\Bill\Desktop\Fabricio\public"
git add -A
git commit -m "%MSG%"

echo.
echo [4/4] Enviando para GitHub...
git push

echo.
echo ==========================================
echo  PUBLICADO COM SUCESSO!
echo ==========================================
echo  DEV:   https://github.com/Billhebert/editor-fluxos-dev
echo  PUBLIC: https://github.com/Billhebert/editor-fluxos
echo ==========================================
pause
