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

:: Pega versao atual do package.json
cd /d "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos"
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set VERSION=%%~a
)
set VERSION=%VERSION:"=%
set VERSION=%VERSION: =%
echo Versao atual: %VERSION%
echo.

set /p BUMP="Bump versao? (M/m=p Major, m/minor, p/patch, s/skip): "

if /i "%BUMP%"=="M" (
    call npm version major --no-git-tag-version
) else if /i "%BUMP%"=="m" (
    call npm version minor --no-git-tag-version
) else if /i "%BUMP%"=="p" (
    call npm version patch --no-git-tag-version
)

:: Pega nova versao
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set NEW_VERSION=%%~a
)
set NEW_VERSION=%NEW_VERSION:"=%
set NEW_VERSION=%NEW_VERSION: =%

echo.
echo ==========================================
echo  Versao: %NEW_VERSION%
echo  Mensagem: %MSG%
echo ==========================================
echo.

echo [1/5] Commitando mudancas no DEV...
cd /d "C:\Users\Bill\Desktop\Fabricio\dev"
git add -A
git commit -m "v%NEW_VERSION% - %MSG%"

echo.
echo [2/5] Buildando o instalador...
cd /d "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos"
call npm run build
if errorlevel 1 (
    echo ERRO no build!
    pause
    exit /b 1
)

echo.
echo [3/5] Criando GitHub Release v%NEW_VERSION%...
cd /d "C:\Users\Bill\Desktop\Fabricio\dev"
"C:\Program Files\GitHub CLI\gh.exe" release create "v%NEW_VERSION%" "C:\Users\Bill\Desktop\Fabricio\dev\editor-fluxos\release\*.exe" --title "v%NEW_VERSION%" --notes "%MSG%" --repo "Billhebert/editor-fluxos"

echo.
echo [4/5] Commitando + push no PUBLIC...
cd /d "C:\Users\Bill\Desktop\Fabricio\public"
git rm -r -q editor-fluxos --ignore-unmatch
git add -A
git commit -m "v%NEW_VERSION% - %MSG%"
git push

echo.
echo ==========================================
echo  PUBLICADO COM SUCESSO!
echo  Versao: %NEW_VERSION%
echo  DEV:    https://github.com/Billhebert/editor-fluxos-dev
echo  PUBLIC: https://github.com/Billhebert/editor-fluxos
echo  RELEASE: https://github.com/Billhebert/editor-fluxos/releases
echo ==========================================
pause
