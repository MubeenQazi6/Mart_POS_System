@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "fix(auth): fix Supabase domain typo, error reporting and OAuth redirect handling"
%GIT% push origin main
%GIT% push origin uat
echo.
echo Push complete!
