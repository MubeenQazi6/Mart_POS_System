@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "feat: Supabase auth integration with offline fallback"
%GIT% push origin main
echo.
echo Push complete!
