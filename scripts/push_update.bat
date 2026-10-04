@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "ci: connect Supabase UAT cloud database to web deployment"
%GIT% push origin main
%GIT% push origin uat
echo.
echo Push complete!
