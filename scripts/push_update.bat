@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "feat(architecture): add enterprise multi-module sub-database schema and SDLC governance"
%GIT% push origin main
echo.
echo Push complete!
