@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "chore: add site:dev script for previewing company website"
%GIT% push origin main
echo.
echo Push complete!
