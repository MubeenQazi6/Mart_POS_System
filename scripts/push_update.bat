@echo off
set GIT=%LOCALAPPDATA%\Programs\Git\cmd\git.exe
%GIT% add -A
%GIT% commit -m "fix(company-site): isolate postcss config for clean Vercel deployment"
%GIT% push origin main
echo.
echo Push complete!
