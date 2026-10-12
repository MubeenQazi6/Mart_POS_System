@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "fix(auth): correct Supabase project URL typo causing ERR_NAME_NOT_RESOLVED"
%GIT% push origin main
%GIT% push origin uat
echo.
echo Push complete!
