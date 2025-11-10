@echo off
REM MCP Config Backup Script (ASCII only)
setlocal enabledelayedexpansion

echo ========================================
echo MCP Config Backup Script
echo ========================================

REM Set variables
set "SOURCE_FILE=claude_desktop_config.json"
set "BACKUP_DIR=."
set "MAX_BACKUPS=5"

REM Get current timestamp
set "TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=!TIMESTAMP: =0!"
set "BACKUP_FILE=claude_desktop_config_!TIMESTAMP!.json"

echo Source file: %SOURCE_FILE%
echo Backup file: %BACKUP_FILE%
echo.

REM Check if source file exists
if not exist "%SOURCE_FILE%" (
    echo ERROR: Source file not found: %SOURCE_FILE%
    exit /b 1
)

REM Create backup
echo Creating backup...
copy "%SOURCE_FILE%" "%BACKUP_FILE%" >nul
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Backup created: %BACKUP_FILE%
) else (
    echo ERROR: Backup failed
    exit /b 1
)

REM Count existing backup files
set "BACKUP_COUNT=0"
for %%f in (claude_desktop_config_*.json) do (
    set /a BACKUP_COUNT+=1
)

echo Total backup files: !BACKUP_COUNT!

REM Clean up old backups if needed
if !BACKUP_COUNT! GTR %MAX_BACKUPS% (
    echo Cleaning up old backups...
    for /f "skip=%MAX_BACKUPS% delims=" %%f in ('dir /b /o-d claude_desktop_config_*.json') do (
        echo Deleting: %%f
        del "%%f"
    )
)

echo.
echo Backup process completed successfully!
echo.

REM List all backup files
echo Current backup files:
dir /b claude_desktop_config_*.json

endlocal
