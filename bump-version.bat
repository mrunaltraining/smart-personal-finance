@echo off
REM Version Bump Script for Windows
REM This script reads APP_VERSION from app.js (source of truth) and updates all documentation files
REM Usage: bump-version.bat [major|minor|build] (default: build)

setlocal enabledelayedexpansion

REM Get the version bump type (default: build)
set BUMP_TYPE=%1
if "%BUMP_TYPE%"=="" set BUMP_TYPE=build

set APP_JS=assets\js\app.js

if not exist "%APP_JS%" (
    echo Error: %APP_JS% not found
    exit /b 1
)

REM Extract current version from app.js using PowerShell
for /f "tokens=2 delims=: " %%a in ('findstr /C:"major:" "%APP_JS%"') do set MAJOR=%%a
for /f "tokens=2 delims=: " %%a in ('findstr /C:"minor:" "%APP_JS%"') do set MINOR=%%a
for /f "tokens=2 delims=: " %%a in ('findstr /C:"build:" "%APP_JS%"') do set BUILD=%%a

REM Remove trailing comma if present
set MAJOR=%MAJOR:,=%
set MINOR=%MINOR:,=%
set BUILD=%BUILD:,=%

echo Current version: v%MAJOR%.%MINOR%.%BUILD%
echo Bump type: %BUMP_TYPE%

REM Calculate new version based on bump type
if "%BUMP_TYPE%"=="major" (
    set /a MAJOR+=1
    set MINOR=0
    set BUILD=0
) else if "%BUMP_TYPE%"=="minor" (
    set /a MINOR+=1
    set BUILD=0
) else if "%BUMP_TYPE%"=="build" (
    set /a BUILD+=1
) else (
    echo Invalid bump type. Use: major, minor, or build
    exit /b 1
)

set NEW_VERSION=v%MAJOR%.%MINOR%.%BUILD%
echo New version: %NEW_VERSION%

REM Update app.js (source of truth)
powershell -Command "(Get-Content '%APP_JS%') -replace 'major: \d+', 'major: %MAJOR%' | Set-Content '%APP_JS%'"
powershell -Command "(Get-Content '%APP_JS%') -replace 'minor: \d+', 'minor: %MINOR%' | Set-Content '%APP_JS%'"
powershell -Command "(Get-Content '%APP_JS%') -replace 'build: \d+', 'build: %BUILD%' | Set-Content '%APP_JS%'"
echo Updated %APP_JS%

REM Update documentation files
set FILES=USER_MANUAL.md README.md APP_SPEC.md DEVELOPMENT.md TO-DO.txt tests\test-utils.html tests\test.html

for %%f in (%FILES%) do (
    if exist "%%f" (
        powershell -Command "(Get-Content '%%f') -replace 'v\d+\.\d+\.\d+', '%NEW_VERSION%' | Set-Content '%%f'"
        echo Updated %%f
    ) else (
        echo Skipped %%f (not found)
    )
)

REM Update TO-DO.txt date
if exist TO-DO.txt (
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set TODAY=%%b %%a, %%c
    powershell -Command "(Get-Content 'TO-DO.txt') -replace 'Last Updated: [A-Za-z]+ \d+, \d+', 'Last Updated: %TODAY%' | Set-Content 'TO-DO.txt'"
    echo Updated TO-DO.txt date
)

echo.
echo Version bump complete: %NEW_VERSION%
echo Please review the changes and commit:
echo   git add .
echo   git commit -m "chore: bump version to %NEW_VERSION%"
echo   git push

endlocal
